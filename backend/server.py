from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import os
import uuid
import bcrypt
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
SPOT_COST = 1.0  # DFQ cost to add a spot

# Supabase Setup
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Auth Tools
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

class SpotCreate(BaseModel):
    name: str
    description: str = ""
    lat: float
    lng: float
    spot_type: str = "street"
    photos: list = []

# --- Helpers ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    if hashed_password == 'WALLET_USER':
        return False
    return bcrypt.checkpw(
        plain_password.encode('utf-8')[:72],
        hashed_password.encode('utf-8')
    )

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(
        password.encode('utf-8')[:72],
        bcrypt.gensalt()
    ).decode('utf-8')

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
    user.pop('hashed_password', None)
    return user

# --- Routes ---
api = APIRouter(prefix="/api")

@api.post("/auth/register")
async def register(user: UserCreate):
    user.username = user.username.lower().strip()
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
    form_data.username = form_data.username.lower().strip()
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
    data.wallet_address = data.wallet_address.strip()
    result = supabase.table('users').select('*').eq('wallet_address', data.wallet_address).execute()

    if not result.data:
        username = f"wallet_{data.wallet_address[:6]}"
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

# --- bonus ---

@api.post("/users/claim-profile-bonus")
async def claim_profile_bonus(current_user: dict = Depends(get_current_user)):
    # Already claimed? Block it.
    if current_user.get('has_profile_bonus'):
        raise HTTPException(400, "Bonus already claimed")
    
    # Required fields (self_comment is optional!)
    required = ['full_name', 'deck_size', 'deck_company', 'fav_trick', 'fav_spot', 'birth_date']
    missing = [f for f in required if not current_user.get(f) or str(current_user.get(f)).strip() == '']
    
    if missing:
        raise HTTPException(400, f"Still missing: {', '.join(missing)}")
    
    # Award bonus
    bonus = 5.0
    supabase.table('users').update({
        'has_profile_bonus': True,
        'wallet_balance': current_user['wallet_balance'] + bonus
    }).eq('id', current_user['id']).execute()
    
    return { "success": True, "bonus": bonus }

@api.post("/users/link-wallet")
async def link_wallet(data: WalletLink, current_user: dict = Depends(get_current_user)):
    result = supabase.table('users').select('username').eq('wallet_address', data.wallet_address).execute()
    if result.data and result.data[0]['username'] != current_user['username']:
        raise HTTPException(status_code=400, detail="Wallet linked to another account")
    supabase.table('users').update({'wallet_address': data.wallet_address}).eq('username', current_user['username']).execute()
    return {"message": "Wallet linked"}

@api.get("/users/me", response_model=User)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user

@api.put("/users/me")
async def update_profile(profile_data: dict, current_user: dict = Depends(get_current_user)):
    allowed = ["full_name", "birth_date", "deck_size", "deck_company", "fav_trick", "fav_spot", "self_comment"]
    update_data = {k: v for k, v in profile_data.items() if k in allowed}

    profile_bonus = 0
    if update_data:
        supabase.table('users').update(update_data).eq('username', current_user['username']).execute()

        updated = supabase.table('users').select('*').eq('username', current_user['username']).execute()
        if updated.data:
            u = updated.data[0]
            fields = [u.get('deck_size'), u.get('deck_company'), u.get('fav_trick'), u.get('fav_spot'), u.get('self_comment')]
            all_filled = all(f and str(f).strip() for f in fields)

            if all_filled:
                existing_bonus = supabase.table('transactions').select('id').eq('receiver_id', current_user['username']).eq('type', 'profile_bonus').execute()
                if not existing_bonus.data:
                    profile_bonus = 5.0
                    new_balance = (u.get('wallet_balance') or 0) + profile_bonus
                    supabase.table('users').update({'wallet_balance': new_balance}).eq('username', current_user['username']).execute()
                    supabase.table('transactions').insert({
                        'id': str(uuid.uuid4()),
                        'sender_id': 'SOLRIDE_BONUS',
                        'receiver_id': current_user['username'],
                        'amount': profile_bonus,
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'type': 'profile_bonus'
                    }).execute()

    return {"message": "Profile updated", "profile_bonus": profile_bonus}

# bonuses first ride 

@api.post("/users/claim-profile-bonus")
async def claim_profile_bonus(current_user: dict = Depends(get_current_user)):
    if current_user.get('has_profile_bonus'):
        raise HTTPException(status_code=400, detail="Bonus already claimed")
    
    required = ['full_name', 'deck_size', 'deck_company', 'fav_trick', 'fav_spot', 'birth_date']
    missing = [f for f in required if not current_user.get(f) or str(current_user.get(f)).strip() == '']
    
    if missing:
        raise HTTPException(status_code=400, detail=f"Still missing: {', '.join(missing)}")
    
    bonus = 5.0
    new_balance = (current_user.get('wallet_balance') or 0) + bonus
    
    supabase.table('users').update({
        'has_profile_bonus': True,
        'wallet_balance': new_balance
    }).eq('username', current_user['username']).execute()
    
    supabase.table('transactions').insert({
        'id': str(uuid.uuid4()),
        'sender_id': 'SOLRIDE_BONUS',
        'receiver_id': current_user['username'],
        'amount': bonus,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'type': 'profile_bonus'
    }).execute()
    
    return {"success": True, "bonus": bonus, "new_balance": new_balance}


@api.post("/rides/start", response_model=Ride)
async def start_ride(current_user: dict = Depends(get_current_user)):
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

    supabase.table('rides').update({
        'status': 'completed',
        'end_time': end_time.isoformat(),
        'distance_meters': distance,
        'coins_earned': coins
    }).eq('id', ride_id).execute()

    new_balance = (current_user.get('wallet_balance') or 0) + coins

    first_ride_bonus = 0
    all_rides = supabase.table('rides').select('id').eq('user_id', current_user['username']).eq('status', 'completed').execute()
    if len(all_rides.data) <= 1:
        first_ride_bonus = 5.0
        new_balance += first_ride_bonus

    supabase.table('users').update({'wallet_balance': new_balance}).eq('username', current_user['username']).execute()

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

    if first_ride_bonus > 0:
        supabase.table('transactions').insert({
            'id': str(uuid.uuid4()),
            'sender_id': 'SOLRIDE_BONUS',
            'receiver_id': current_user['username'],
            'amount': first_ride_bonus,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'type': 'first_ride_bonus'
        }).execute()

        return {
        "message": "Ride completed",
        "earned": coins,
        "first_ride_bonus": first_ride_bonus,
        "is_first_ride": first_ride_bonus > 0
                }

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

    sender_balance = current_user.get('wallet_balance') or 0
    if sender_balance < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")

    receiver_result = supabase.table('users').select('username, wallet_balance').eq('username', req.receiver_username).execute()
    if not receiver_result.data:
        raise HTTPException(status_code=404, detail="Receiver not found")

    receiver = receiver_result.data[0]
    supabase.table('users').update({'wallet_balance': sender_balance - req.amount}).eq('username', current_user['username']).execute()

    receiver_balance = receiver.get('wallet_balance') or 0
    supabase.table('users').update({'wallet_balance': receiver_balance + req.amount}).eq('username', req.receiver_username).execute()

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

    supabase.table('users').update({'wallet_balance': sender_balance - req.amount}).eq('username', current_user['username']).execute()

    signature = f"MOCK_SIG_{uuid.uuid4().hex[:16]}"

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

# --- Spots ---

@api.post("/spots")
async def create_spot(spot: SpotCreate, current_user: dict = Depends(get_current_user)):
    balance = current_user.get('wallet_balance') or 0
    if balance < SPOT_COST:
        raise HTTPException(status_code=400, detail=f"Need {SPOT_COST} DFQ to add a spot. You have {balance:.2f} DFQ.")

    photo_urls = []
    for i, photo in enumerate(spot.photos[:5]):
        if photo.startswith("data:"):
            import base64
            try:
                header, data = photo.split(",", 1)
                ext = "jpg"
                if "png" in header:
                    ext = "png"
                file_bytes = base64.b64decode(data)
                file_name = f"spots/{uuid.uuid4().hex}.{ext}"
                supabase.storage.from_("spot-photos").upload(file_name, file_bytes, {"content-type": f"image/{ext}"})
                url = supabase.storage.from_("spot-photos").get_public_url(file_name)
                photo_urls.append(url)
            except Exception as e:
                print(f"Storage upload failed, saving as data URL: {e}")
                photo_urls.append(photo)
        elif photo.startswith("http"):
            photo_urls.append(photo)

    spot_data = {
        'id': str(uuid.uuid4()),
        'user_id': current_user['username'],
        'name': spot.name,
        'description': spot.description,
        'lat': spot.lat,
        'lng': spot.lng,
        'spot_type': spot.spot_type,
        'photos': photo_urls,
        'status': 'approved',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    supabase.table('spots').insert(spot_data).execute()

    new_balance = balance - SPOT_COST
    supabase.table('users').update({'wallet_balance': new_balance}).eq('username', current_user['username']).execute()
    supabase.table('transactions').insert({
        'id': str(uuid.uuid4()),
        'sender_id': current_user['username'],
        'receiver_id': 'SOLRIDE_SPOTS',
        'amount': SPOT_COST,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'type': 'spot_purchase'
    }).execute()

    return {"message": "Spot added!", "id": spot_data['id'], "cost": SPOT_COST}

@api.get("/spots")
async def get_spots():
    try:
        result = supabase.table('spots').select('*').eq('status', 'approved').order('created_at', desc=True).execute()
        return result.data
    except Exception:
        return []

@api.delete("/spots/{spot_id}")
async def delete_spot(spot_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase.table('spots').select('user_id').eq('id', spot_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Spot not found")
    if result.data[0]['user_id'] != current_user['username']:
        raise HTTPException(status_code=403, detail="Not authorized")
    supabase.table('spots').delete().eq('id', spot_id).execute()
    return {"message": "Spot removed"}

# --- Active Riders ---

@api.post("/riders/location")
async def update_rider_location(location: dict, current_user: dict = Depends(get_current_user)):
    lat = location.get('lat')
    lng = location.get('lng')
    if lat is None or lng is None:
        raise HTTPException(status_code=400, detail="lat and lng required")

    rider_data = {
        'username': current_user['username'],
        'lat': lat,
        'lng': lng,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    existing = supabase.table('rider_locations').select('username').eq('username', current_user['username']).execute()
    if existing.data:
        supabase.table('rider_locations').update(rider_data).eq('username', current_user['username']).execute()
    else:
        supabase.table('rider_locations').insert(rider_data).execute()
    return {"message": "Location updated"}

@api.get("/riders/active")
async def get_active_riders(current_user: dict = Depends(get_current_user)):
    try:
        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
        result = supabase.table('rider_locations').select('username, lat, lng, updated_at').gte('updated_at', cutoff).execute()
        return result.data
    except Exception:
        return []

@api.delete("/riders/location")
async def remove_rider_location(current_user: dict = Depends(get_current_user)):
    supabase.table('rider_locations').delete().eq('username', current_user['username']).execute()
    return {"message": "Location removed"}

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
    nested_static = os.path.join(static_folder, "static")
    if os.path.exists(nested_static):
        app.mount("/static", StaticFiles(directory=nested_static), name="static")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(static_folder, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_folder, "index.html"))
