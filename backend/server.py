from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import os
import uuid
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from pathlib import Path
from supabase import create_client, Client

# Load env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Config
SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30000

# Supabase Setup
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Auth Tools
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

app = FastAPI()

# --- Models ---
class User(BaseModel):
    username: str
    self_comment: Optional[str] = None
    full_name: Optional[str] = None
    birth_date: Optional[str] = None
    deck_size: Optional[str] = None
    deck_company: Optional[str] = None
    fav_trick: Optional[str] = None
    fav_spot: Optional[str] = None
    wallet_balance: float = 0.0
    wallet_address: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class Ride(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    distance_meters: float = 0.0
    coins_earned: float = 0.0
    status: str = "active"

class RideFinish(BaseModel):
    distance_meters: float

class TransferRequest(BaseModel):
    receiver_username: str
    amount: float

class WithdrawRequest(BaseModel):
    amount: float
    wallet_address: str

class WalletLogin(BaseModel):
    wallet_address: str
    signature: str
    message: str

class WalletLink(BaseModel):
    wallet_address: str
    signature: str
    message: str

# --- Helpers ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    result = supabase.table('users').select('*').eq('username', username).execute()
    if not result.data:
        raise credentials_exception
    
    user = result.data[0]
    # Remove sensitive fields
    user.pop('hashed_password', None)
    return user

# --- Routes ---
api = APIRouter(prefix="/api")

@api.post("/auth/register")
async def register(user: UserCreate):
    # Check if username exists
    result = supabase.table('users').select('id').eq('username', user.username).execute()
    if result.data:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    user_data = {
        'id': str(uuid.uuid4()),
        'username': user.username,
        'hashed_password': hashed_password,
        'wallet_balance': 0.0,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    supabase.table('users').insert(user_data).execute()
    return {"message": "User created successfully"}

@api.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    result = supabase.table('users').select('username, hashed_password').eq('username', form_data.username).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    user = result.data[0]
    if not verify_password(form_data.password, user['hashed_password']):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user['username']})
    return {"access_token": access_token, "token_type": "bearer"}

@api.post("/auth/wallet-login", response_model=Token)
async def wallet_login(data: WalletLogin):
    # Find user by wallet address
    result = supabase.table('users').select('*').eq('wallet_address', data.wallet_address).execute()
    
    if not result.data:
        # Auto-register wallet user
        username = f"wallet_{data.wallet_address[:6]}"
        
        # Check if username exists
        check = supabase.table('users').select('id').eq('username', username).execute()
        while check.data:
            username = f"wallet_{data.wallet_address[:6]}_{uuid.uuid4().hex[:4]}"
            check = supabase.table('users').select('id').eq('username', username).execute()
        
        user_data = {
            'id': str(uuid.uuid4()),
            'username': username,
            'hashed_password': 'WALLET_USER',
            'wallet_balance': 0.0,
            'wallet_address': data.wallet_address,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        supabase.table('users').insert(user_data).execute()
        
        result = supabase.table('users').select('*').eq('wallet_address', data.wallet_address).execute()
    
    user = result.data[0]
    access_token = create_access_token(data={"sub": user['username']})
    return {"access_token": access_token, "token_type": "bearer"}

@api.post("/users/link-wallet")
async def link_wallet(data: WalletLink, current_user: dict = Depends(get_current_user)):
    # Check if wallet already linked to another account
    result = supabase.table('users').select('username').eq('wallet_address', data.wallet_address).execute()
    if result.data and result.data[0]['username'] != current_user['username']:
        raise HTTPException(status_code=400, detail="Wallet linked to another account")
    
    # Link wallet
    supabase.table('users').update({'wallet_address': data.wallet_address}).eq('username', current_user['username']).execute()
    return {"message": "Wallet linked"}

@api.get("/users/me", response_model=User)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user

@api.put("/users/me")
async def update_profile(profile_data: dict, current_user: dict = Depends(get_current_user)):
    allowed = ["full_name", "birth_date", "deck_size", "deck_company", "fav_trick", "fav_spot", "self_comment"]
    update_data = {k: v for k, v in profile_data.items() if k in allowed}
    
    if update_data:
        supabase.table('users').update(update_data).eq('username', current_user['username']).execute()
    return {"message": "Profile updated"}

@api.post("/rides/start", response_model=Ride)
async def start_ride(current_user: dict = Depends(get_current_user)):
    # Check for active ride
    result = supabase.table('rides').select('*').eq('user_id', current_user['username']).eq('status', 'active').execute()
    if result.data:
        ride = result.data[0]
        return Ride(
            id=ride['id'],
            user_id=ride['user_id'],
            start_time=datetime.fromisoformat(ride['start_time'].replace('Z', '+00:00')) if isinstance(ride['start_time'], str) else ride['start_time'],
            end_time=None,
            distance_meters=ride.get('distance_meters', 0.0),
            coins_earned=ride.get('coins_earned', 0.0),
            status=ride['status']
        )
    
    ride_id = str(uuid.uuid4())
    start_time = datetime.now(timezone.utc)
    
    ride_data = {
        'id': ride_id,
        'user_id': current_user['username'],
        'start_time': start_time.isoformat(),
        'distance_meters': 0.0,
        'coins_earned': 0.0,
        'status': 'active'
    }
    supabase.table('rides').insert(ride_data).execute()
    
    return Ride(
        id=ride_id,
        user_id=current_user['username'],
        start_time=start_time
    )

@api.post("/rides/{ride_id}/stop")
async def stop_ride(ride_id: str, finish_data: RideFinish, current_user: dict = Depends(get_current_user)):
    result = supabase.table('rides').select('*').eq('id', ride_id).eq('user_id', current_user['username']).execute()
    if not result.data or result.data[0]['status'] != 'active':
        raise HTTPException(status_code=404, detail="Active ride not found")
    
    distance = finish_data.distance_meters
    coins = distance / 100.0
    end_time = datetime.now(timezone.utc)
    
    # Update ride
    supabase.table('rides').update({
        'status': 'completed',
        'end_time': end_time.isoformat(),
        'distance_meters': distance,
        'coins_earned': coins
    }).eq('id', ride_id).execute()
    
    # Update user wallet balance
    new_balance = (current_user.get('wallet_balance') or 0) + coins
    supabase.table('users').update({'wallet_balance': new_balance}).eq('username', current_user['username']).execute()
    
    # Create transaction record
    tx_data = {
        'id': str(uuid.uuid4()),
        'sender_id': 'SOLRIDE_EARN',
        'receiver_id': current_user['username'],
        'amount': coins,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'type': 'ride_earning',
        'distance': distance
    }
    supabase.table('transactions').insert(tx_data).execute()
    
    return {"message": "Ride completed", "earned": coins}

@api.get("/rides")
async def get_rides(current_user: dict = Depends(get_current_user)):
    result = supabase.table('rides').select('*').eq('user_id', current_user['username']).order('start_time', desc=True).limit(20).execute()
    return result.data

@api.post("/wallet/transfer")
async def transfer_coins(req: TransferRequest, current_user: dict = Depends(get_current_user)):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    if req.receiver_username == current_user['username']:
        raise HTTPException(status_code=400, detail="Cannot send to yourself")
    
    # Check sender balance
    sender_balance = current_user.get('wallet_balance') or 0
    if sender_balance < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")
    
    # Check receiver exists
    receiver_result = supabase.table('users').select('username, wallet_balance').eq('username', req.receiver_username).execute()
    if not receiver_result.data:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    receiver = receiver_result.data[0]
    
    # Deduct from sender
    supabase.table('users').update({'wallet_balance': sender_balance - req.amount}).eq('username', current_user['username']).execute()
    
    # Add to receiver
    receiver_balance = receiver.get('wallet_balance') or 0
    supabase.table('users').update({'wallet_balance': receiver_balance + req.amount}).eq('username', req.receiver_username).execute()
    
    # Record transaction
    tx_data = {
        'id': str(uuid.uuid4()),
        'sender_id': current_user['username'],
        'receiver_id': req.receiver_username,
        'amount': req.amount,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'type': 'transfer'
    }
    supabase.table('transactions').insert(tx_data).execute()
    
    return {"message": "Transfer successful"}

@api.get("/wallet/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    result = supabase.table('transactions').select('*').or_(f"sender_id.eq.{current_user['username']},receiver_id.eq.{current_user['username']}").order('timestamp', desc=True).limit(20).execute()
    return result.data

@api.post("/wallet/withdraw")
async def withdraw_coins(req: WithdrawRequest, current_user: dict = Depends(get_current_user)):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    sender_balance = current_user.get('wallet_balance') or 0
    if sender_balance < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")
    
    # Deduct balance
    supabase.table('users').update({'wallet_balance': sender_balance - req.amount}).eq('username', current_user['username']).execute()
    
    # Mock signature
    signature = f"MOCK_SIG_{uuid.uuid4().hex[:16]}"
    
    # Record transaction
    tx_data = {
        'id': str(uuid.uuid4()),
        'sender_id': current_user['username'],
        'receiver_id': req.wallet_address,
        'amount': req.amount,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'type': 'withdraw',
        'signature': signature
    }
    supabase.table('transactions').insert(tx_data).execute()
    
    return {"message": "Withdraw successful", "signature": signature}

app.include_router(api)

from starlette.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static frontend files (for Railway deployment)
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

static_folder = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_folder):
    static_folder = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_folder):
    nested_static = os.path.join(static_folder, "static")
    if os.path.exists(nested_static):
        app.mount("/static", StaticFiles(directory=nested_static), name="static")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Serve index.html for all non-API routes (React Router support)
        file_path = os.path.join(static_folder, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_folder, "index.html"))