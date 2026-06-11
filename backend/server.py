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

from better_profanity import profanity
from datetime import timedelta

# Initialize profanity filter with custom words (English + Russian/Belarusian)
profanity.load_censor_words()
CUSTOM_BAD_WORDS = [
    # Russian common
    "хуй", "хуя", "хуе", "пизд", "ебал", "ебан", "ебать", "блять", "блядь",
    "сука", "сучка", "пидор", "пидар", "залупа", "мудак", "уебок", "ебло",
    "ебуч", "наебал", "выебал", "охуе", "пиздец", "пиздос",
    # Hate slurs (extend as needed)
    "хач", "чурк",
]
profanity.add_censor_words(CUSTOM_BAD_WORDS)




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
api = APIRouter(prefix="/api")

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



from better_profanity import profanity
from datetime import timedelta

# Initialize profanity filter with custom words (English + Russian/Belarusian)
profanity.load_censor_words()
CUSTOM_BAD_WORDS = [
    # Russian common
    "хуй", "хуя", "хуе", "пизд", "ебал", "ебан", "ебать", "блять", "блядь",
    "сука", "сучка", "пидор", "пидар", "залупа", "мудак", "уебок", "ебло",
    "ебуч", "наебал", "выебал", "охуе", "пиздец", "пиздос",
    # Hate slurs (extend as needed)
    "нигер", "нигга", "хач", "чурк",
]
profanity.add_censor_words(CUSTOM_BAD_WORDS)

# --- Chat Configuration ---
BAN_DURATIONS = [
    None,                        # Strike 1: warning only
    timedelta(hours=1),          # Strike 2: 1 hour
    timedelta(days=1),           # Strike 3: 1 day
    timedelta(weeks=1),          # Strike 4: 1 week
    timedelta(days=30),          # Strike 5: 1 month
]
CHAT_COOLDOWN_SECONDS = 10
MAX_MESSAGE_LENGTH = 500

def get_ban_status(user_id: str):
    res = supabase.table('chat_bans').select('*').eq('user_id', user_id).execute()
    if not res.data:
        return None
    ban = res.data[0]
    if ban.get('banned_until'):
        banned_until = datetime.fromisoformat(ban['banned_until'].replace('Z', '+00:00'))
        if banned_until > datetime.now(timezone.utc):
            return ban
    return None

def escalate_ban(user_id: str, reason: str):
    existing = supabase.table('chat_bans').select('*').eq('user_id', user_id).execute()
    new_count = (existing.data[0]['strike_count'] + 1) if existing.data else 1
    idx = min(new_count - 1, len(BAN_DURATIONS) - 1)
    duration = BAN_DURATIONS[idx]
    banned_until = (datetime.now(timezone.utc) + duration).isoformat() if duration else None

    data = {
        'user_id': user_id,
        'strike_count': new_count,
        'banned_until': banned_until,
        'last_offense': reason,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    supabase.table('chat_bans').upsert(data).execute()
    return new_count, banned_until


@api.get("/chat/messages")
async def get_messages(current_user: dict = Depends(get_current_user)):
    res = supabase.table('messages').select('*').eq(
        'hidden', False
    ).order('created_at', desc=True).limit(100).execute()
    # return oldest first for chat display
    return list(reversed(res.data))


@api.get("/chat/ban-status")
async def get_my_ban_status(current_user: dict = Depends(get_current_user)):
    ban = get_ban_status(current_user['id'])
    if ban:
        return {
            "banned": True,
            "banned_until": ban['banned_until'],
            "strike_count": ban['strike_count'],
            "reason": ban.get('last_offense', 'rules violation')
        }
    return {"banned": False, "strike_count": 0}


class ChatSend(BaseModel):
    content: str
    reply_to: Optional[str] = None


@api.post("/chat/send")
async def send_message(msg: ChatSend, current_user: dict = Depends(get_current_user)):
    # 1. Length check
    content = msg.content.strip()
    if not content:
        raise HTTPException(400, "Message is empty")
    if len(content) > MAX_MESSAGE_LENGTH:
        raise HTTPException(400, f"Max {MAX_MESSAGE_LENGTH} characters")

    # 2. Ban check
    ban = get_ban_status(current_user['id'])
    if ban:
        raise HTTPException(403, {
            "type": "banned",
            "banned_until": ban['banned_until'],
            "strike_count": ban['strike_count']
        })

    # 3. Cooldown check
    last = supabase.table('messages').select('created_at').eq(
        'user_id', current_user['id']
    ).order('created_at', desc=True).limit(1).execute()

    if last.data:
        last_time = datetime.fromisoformat(last.data[0]['created_at'].replace('Z', '+00:00'))
        seconds_since = (datetime.now(timezone.utc) - last_time).total_seconds()
        if seconds_since < CHAT_COOLDOWN_SECONDS:
            wait = int(CHAT_COOLDOWN_SECONDS - seconds_since)
            raise HTTPException(429, {
                "type": "cooldown",
                "wait_seconds": wait
            })

    # 4. Profanity check
    if profanity.contains_profanity(content.lower()):
        strikes, banned_until = escalate_ban(current_user['id'], 'profanity')
        raise HTTPException(400, {
            "type": "profanity",
            "strikes": strikes,
            "banned_until": banned_until
        })

    # 5. Resolve reply_to (fetch original for snapshot)
    reply_username = None
    reply_content = None
    if msg.reply_to:
        orig = supabase.table('messages').select('username, content').eq('id', msg.reply_to).execute()
        if orig.data:
            reply_username = orig.data[0]['username']
            reply_content = orig.data[0]['content'][:80]

    # 6. Insert
    new_msg = {
        'id': str(uuid.uuid4()),
        'user_id': current_user['id'],
        'username': current_user['username'],
        'content': content,
        'reply_to': msg.reply_to,
        'reply_to_username': reply_username,
        'reply_to_content': reply_content,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    supabase.table('messages').insert(new_msg).execute()
    return {"ok": True, "message": new_msg}


class ReportMessage(BaseModel):
    message_id: str
    reason: Optional[str] = "inappropriate"


@api.post("/chat/report")
async def report_message(data: ReportMessage, current_user: dict = Depends(get_current_user)):
    try:
        supabase.table('message_reports').insert({
            'id': str(uuid.uuid4()),
            'message_id': data.message_id,
            'reporter_id': current_user['id'],
            'reason': data.reason,
            'created_at': datetime.now(timezone.utc).isoformat()
        }).execute()
    except Exception:
        raise HTTPException(400, "Already reported")

    # Auto-hide if 3+ unique reports
    reports = supabase.table('message_reports').select('id').eq('message_id', data.message_id).execute()
    if len(reports.data) >= 3:
        supabase.table('messages').update({'hidden': True, 'flagged': True}).eq('id', data.message_id).execute()

    return {"ok": True}

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

@api.post("/users/claim-card-bonus")
async def claim_card_bonus(current_user: dict = Depends(get_current_user)):
    if current_user.get('has_card_bonus'):
        raise HTTPException(status_code=400, detail="Bonus already claimed")

    required = ['deck_size', 'deck_company', 'fav_trick', 'fav_spot', 'birth_date']
    missing = [f for f in required if not current_user.get(f) or str(current_user.get(f)).strip() == '']
    if missing:
        raise HTTPException(status_code=400, detail=f"Still missing: {', '.join(missing)}")

    bonus = 5.0
    new_balance = (current_user.get('wallet_balance') or 0) + bonus

    supabase.table('users').update({
        'has_card_bonus': True,
        'wallet_balance': new_balance
    }).eq('username', current_user['username']).execute()

    supabase.table('transactions').insert({
        'id': str(uuid.uuid4()),
        'sender_id': 'SOLRIDE_BONUS',
        'receiver_id': current_user['username'],
        'amount': bonus,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'type': 'card_bonus'
    }).execute()

    return {"success": True, "bonus": bonus, "new_balance": new_balance}

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

    if update_data:
        supabase.table('users').update(update_data).eq('username', current_user['username']).execute()

    return {"message": "Profile updated"}

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
