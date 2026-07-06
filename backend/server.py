from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Form, File, UploadFile
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
    has_card_bonus: bool = False

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
    
# DFQ earning rate: 1 DFQ per 100 meters
DFQ_PER_METER = 0.01
FIRST_RIDE_BONUS = 10.0

# --- Public Skater Profile ---
@api.get("/users/{username}/public")
async def get_public_profile(username: str):
    username = username.lower().strip()

    res = supabase.table('users').select(
        'username, deck_size, deck_company, fav_trick, fav_spot, '
        'self_comment, birth_date, has_first_ride, created_at'
    ).eq('username', username).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Skater not found")

    user = res.data[0]

    # Stats — spots created + rides finished
    try:
        spots_res = supabase.table('spots').select(
            'id', count='exact'
        ).eq('user_id', username).execute()
        spot_count = spots_res.count or 0
    except Exception:
        spot_count = 0

    try:
        # NOTE: stop_ride writes status='finished', NOT 'completed'
        rides_res = supabase.table('rides').select(
            'id', count='exact'
        ).eq('user_id', username).eq('status', 'finished').execute()
        ride_count = rides_res.count or 0
    except Exception:
        ride_count = 0

    user['spot_count'] = spot_count
    user['ride_count'] = ride_count
    return user

@api.post("/rides/{ride_id}/stop")
async def stop_ride(ride_id: str, payload: RideFinish, current_user: dict = Depends(get_current_user)):
    result = supabase.table('rides').select('*').eq('id', ride_id).eq('user_id', current_user['username']).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Ride not found")

    ride = result.data[0]

    # Idempotent: already finished → return last result, no double-credit
    if ride.get('status') == 'finished':
        return {
            "earned": float(ride.get('coins_earned') or 0.0),
            "is_first_ride": False,
            "first_ride_bonus": 0.0,
            "distance_meters": float(ride.get('distance_meters') or 0.0)
        }

    distance = max(0.0, float(payload.distance_meters or 0.0))
    base_earn = round(distance * DFQ_PER_METER, 2)

    finished = supabase.table('rides').select('id').eq('user_id', current_user['username']).eq('status', 'finished').limit(1).execute()
    is_first_ride = len(finished.data) == 0
    first_ride_bonus = FIRST_RIDE_BONUS if is_first_ride else 0.0
    earned = round(base_earn + first_ride_bonus, 2)

    end_time = datetime.now(timezone.utc).isoformat()
    supabase.table('rides').update({
        'status': 'finished',
        'end_time': end_time,
        'distance_meters': distance,
        'coins_earned': earned
    }).eq('id', ride_id).eq('status', 'active').execute()

    new_balance = (current_user.get('wallet_balance') or 0) + earned
    supabase.table('users').update({'wallet_balance': new_balance}).eq('username', current_user['username']).execute()

    if earned > 0:
        supabase.table('transactions').insert({
            'id': str(uuid.uuid4()),
            'sender_id': 'SOLRIDE_RIDE',
            'receiver_id': current_user['username'],
            'amount': earned,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'type': 'ride_earning'
        }).execute()

    return {
        "earned": earned,
        "is_first_ride": is_first_ride,
        "first_ride_bonus": first_ride_bonus,
        "distance_meters": distance
    }

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

# --- Presence (online count) ---
# Lightweight heartbeat used to compute "X RIDERS ONLINE" across the app.
# Reuses the existing rider_locations table (no schema change). The lat/lng
# are not displayed; they just keep updated_at fresh so the user counts
# as online. Real GPS pins remain a future DFQ-paid feature.

@api.post("/presence/ping")
async def presence_ping(current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    existing = supabase.table('rider_locations').select('username').eq(
        'username', current_user['username']
    ).execute()
    if existing.data:
        supabase.table('rider_locations').update(
            {'updated_at': now}
        ).eq('username', current_user['username']).execute()
    else:
        supabase.table('rider_locations').insert({
            'username': current_user['username'],
            'lat': 0.0,
            'lng': 0.0,
            'updated_at': now,
        }).execute()
    return {"ok": True}


@api.get("/presence/count")
async def presence_count(current_user: dict = Depends(get_current_user)):
    """
    Online = anyone who matches AT LEAST ONE of:
      - has a ride with status='active' (riding right now), OR
      - has pinged in the last 2 minutes (app is open on any page).
    Returns a single integer; no locations leak out.
    """
    try:
        from datetime import timedelta
        online = set()

        rides = supabase.table('rides').select('user_id').eq(
            'status', 'active'
        ).execute()
        for r in (rides.data or []):
            online.add(r['user_id'])

        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=2)).isoformat()
        recent = supabase.table('rider_locations').select('username').gte(
            'updated_at', cutoff
        ).execute()
        for r in (recent.data or []):
            online.add(r['username'])

        return {"online": len(online)}
    except Exception:
        return {"online": 0}
    
    # --- Tricks (short skate clips tied to a spot) ---
TRICK_REWARD = 5.0            # DFQ granted on trick upload
TIP_AMOUNT = 1.0              # DFQ tipped per tap
DAILY_TRICK_LIMIT = 5         # max tricks per user per 24h
MAX_VIDEO_BYTES = 50 * 1024 * 1024  # 50 MB safety cap
MIN_TRICK_SECONDS = 1
MAX_TRICK_SECONDS = 15


import subprocess
import tempfile
import shutil


def transcode_to_mp4_h264(input_bytes: bytes, crop_x: int = 50, crop_y: int = 50) -> bytes:
    """
    Re-encode any uploaded video to a browser-universal H.264 + AAC MP4,
    AND crop it to a centered 1:1 square. `crop_x` / `crop_y` are 0-100
    percentages controlling where the square window sits on the longer axis.
    """
    if not shutil.which("ffmpeg"):
        return input_bytes

    crop_x = max(0, min(100, int(crop_x)))
    crop_y = max(0, min(100, int(crop_y)))

    with tempfile.NamedTemporaryFile(suffix=".src", delete=False) as src, \
         tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as dst:
        src_path, dst_path = src.name, dst.name
        src.write(input_bytes)

    try:
        # Square crop using ffmpeg expressions:
        #   side = min(iw, ih)
        #   x    = (iw - side) * crop_x/100
        #   y    = (ih - side) * crop_y/100
        # Then scale to a max of 720x720 for reasonable file size.
        vf = (
            f"crop='min(iw,ih)':'min(iw,ih)':"
            f"'(iw-min(iw,ih))*{crop_x}/100':'(ih-min(iw,ih))*{crop_y}/100',"
            f"scale='min(720,iw)':'min(720,ih)',"
            f"scale=trunc(iw/2)*2:trunc(ih/2)*2"
        )

        cmd = [
            "ffmpeg", "-y", "-i", src_path,
            "-vcodec", "libx264",
            "-profile:v", "baseline", "-level", "3.1",
            "-preset", "veryfast",
            "-crf", "24",
            "-pix_fmt", "yuv420p",
            "-vf", vf,
            "-acodec", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            "-max_muxing_queue_size", "1024",
            dst_path,
        ]
        proc = subprocess.run(cmd, capture_output=True, timeout=120)
        if proc.returncode != 0:
            err = proc.stderr.decode("utf-8", errors="ignore")[-400:]
            raise HTTPException(400, f"Video conversion failed: {err}")

        with open(dst_path, "rb") as f:
            return f.read()
    finally:
        for p in (src_path, dst_path):
            try:
                os.unlink(p)
            except Exception:
                pass


@api.get("/tricks/feed")
async def tricks_feed(limit: int = 20, offset: int = 0):
    """Global feed — newest tricks across every spot & rider."""
    res = supabase.table('tricks').select('*').order(
        'created_at', desc=True
    ).range(offset, offset + limit - 1).execute()
    tricks = res.data or []

    # Attach spot name for each trick (single roundtrip)
    spot_ids = list({t['spot_id'] for t in tricks if t.get('spot_id')})
    spot_map = {}
    if spot_ids:
        srs = supabase.table('spots').select('id, name').in_('id', spot_ids).execute()
        spot_map = {s['id']: s['name'] for s in (srs.data or [])}
    for t in tricks:
        t['spot_name'] = spot_map.get(t.get('spot_id'), 'Unknown spot')

    return tricks


@api.get("/tricks/my-tips")
async def my_tipped_tricks(current_user: dict = Depends(get_current_user)):
    """Which tricks the current user has already tipped (so the UI can grey the button)."""
    res = supabase.table('trick_tips').select('trick_id').eq(
        'tipper_id', current_user['username']
    ).execute()
    return {"tipped_trick_ids": [t['trick_id'] for t in (res.data or [])]}


@api.get("/tricks/spot/{spot_id}")
async def tricks_at_spot(spot_id: str):
    res = supabase.table('tricks').select('*').eq(
        'spot_id', spot_id
    ).order('created_at', desc=True).execute()
    return res.data or []


@api.get("/tricks/user/{username}")
async def tricks_by_user(username: str):
    username = username.lower().strip()
    res = supabase.table('tricks').select('*').eq(
        'user_id', username
    ).order('created_at', desc=True).execute()

    tricks = res.data or []
    # Attach spot name for the profile page
    spot_ids = list({t['spot_id'] for t in tricks if t.get('spot_id')})
    spot_map = {}
    if spot_ids:
        srs = supabase.table('spots').select('id, name').in_('id', spot_ids).execute()
        spot_map = {s['id']: s['name'] for s in (srs.data or [])}
    for t in tricks:
        t['spot_name'] = spot_map.get(t.get('spot_id'), 'Unknown spot')
    return tricks


@api.post("/tricks")
async def create_trick(
    trick_name: str = Form(...),
    caption: str = Form(""),
    spot_id: str = Form(...),
    tagged_users: str = Form(""),        # comma-separated usernames
    duration_seconds: float = Form(...),
    crop_x: int = Form(50),              # 0-100, square framing on longer axis
    crop_y: int = Form(50),
    video: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    
    # Validate basics
    trick_name = trick_name.strip()[:60]
    if not trick_name:
        raise HTTPException(400, "Trick name required")
    if duration_seconds < MIN_TRICK_SECONDS or duration_seconds > MAX_TRICK_SECONDS:
        raise HTTPException(400, f"Video must be {MIN_TRICK_SECONDS}-{MAX_TRICK_SECONDS} seconds")

    # Daily limit
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    recent = supabase.table('tricks').select('id', count='exact').eq(
        'user_id', current_user['username']
    ).gte('created_at', cutoff).execute()
    if (recent.count or 0) >= DAILY_TRICK_LIMIT:
        raise HTTPException(
            429,
            f"Daily limit reached ({DAILY_TRICK_LIMIT} tricks/24h). Come back tomorrow."
        )

    # Confirm spot exists
    spot_res = supabase.table('spots').select('id').eq('id', spot_id).execute()
    if not spot_res.data:
        raise HTTPException(404, "Spot not found")

    # Read + size check
    video_bytes = await video.read()
    if len(video_bytes) > MAX_VIDEO_BYTES:
        raise HTTPException(400, f"Video too big (max {MAX_VIDEO_BYTES // (1024*1024)}MB)")
    if len(video_bytes) < 1024:
        raise HTTPException(400, "Video is empty or corrupt")

               # --- AI moderation gate ---
    # Import here to keep this file paste-friendly; in your real backend/server.py
    # you'll likely move this to the top of the file.
    #from moderation import moderate_video
    #accepted, mod_reason, mod_confidence = await moderate_video(video_bytes)
    #if not accepted:
        #raise HTTPException(
            #status_code=400,
           # detail=(
                #"Video rejected by content check: "
                #f"{mod_reason}. "
               # "Try a clearer shot of your trick or spot."
           # ),
       # )
            

TRICK_REWARD = 5.0            # DFQ granted on trick upload
TIP_AMOUNT = 1.0              # DFQ tipped per tap
DAILY_TRICK_LIMIT = 5         # max tricks per user per 24h
MAX_VIDEO_BYTES = 50 * 1024 * 1024  # 50 MB safety cap
MIN_TRICK_SECONDS = 1
MAX_TRICK_SECONDS = 15


import subprocess
import tempfile
import shutil


def transcode_to_mp4_h264(input_bytes: bytes) -> bytes:
    """
    Re-encode any uploaded video (iPhone HEVC .mov, .webm, etc.) to a
    browser-universal H.264 + AAC MP4 with a moov atom up front so the
    <video> tag can start playing before the full file is downloaded.

    Requires the `ffmpeg` binary on PATH (installed via Dockerfile).
    """
    if not shutil.which("ffmpeg"):
        # No ffmpeg available — fall back to raw bytes (will fail on HEVC
        # for non-Safari clients, but the app keeps working locally).
        return input_bytes

    with tempfile.NamedTemporaryFile(suffix=".src", delete=False) as src, \
         tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as dst:
        src_path, dst_path = src.name, dst.name
        src.write(input_bytes)

    try:
        cmd = [
            "ffmpeg", "-y", "-i", src_path,
            "-vcodec", "libx264",
            "-profile:v", "baseline", "-level", "3.1",
            "-preset", "veryfast",
            "-crf", "24",
            "-pix_fmt", "yuv420p",
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-acodec", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            "-max_muxing_queue_size", "1024",
            dst_path,
        ]
        proc = subprocess.run(cmd, capture_output=True, timeout=120)
        if proc.returncode != 0:
            err = proc.stderr.decode("utf-8", errors="ignore")[-400:]
            raise HTTPException(400, f"Video conversion failed: {err}")

        with open(dst_path, "rb") as f:
            return f.read()
    finally:
        for p in (src_path, dst_path):
            try:
                os.unlink(p)
            except Exception:
                pass

    # --- Transcode to browser-safe H.264/AAC MP4 ---
    # iPhone videos are HEVC in a .mov container. Safari/iOS decodes HEVC
    # natively, so the uploader sees their own clip fine, but Chrome/Firefox
    # on desktop and most Android browsers show a black screen. Re-encoding
    # to H.264 + AAC in an MP4 container fixes this for everyone.
    try:
        video_bytes = transcode_to_mp4_h264(video_bytes, crop_x=crop_x, crop_y=crop_y)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Could not process video: {e}")

    if len(video_bytes) < 1024:
        raise HTTPException(400, "Video is empty after conversion")

    # Force extension + MIME after transcode
    ext = 'mp4'
    content_type = 'video/mp4'

    # Upload to Supabase Storage bucket 'tricks'
    video_key = f"{current_user['username']}/{uuid.uuid4().hex}.{ext}"
    try:
        supabase.storage.from_("tricks").upload(
            video_key,
            video_bytes,
            {"content-type": content_type},
        )
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {e}")
    video_url = supabase.storage.from_("tricks").get_public_url(video_key)

    # Filter tagged users to real accounts
    tag_list = [u.strip().lstrip('@').lower() for u in tagged_users.split(',') if u.strip()]
    tag_list = list({t for t in tag_list if t and t != current_user['username']})[:10]
    if tag_list:
        existing = supabase.table('users').select('username').in_('username', tag_list).execute()
        tag_list = [u['username'] for u in (existing.data or [])]

    # Insert trick row
    trick_id = str(uuid.uuid4())
    trick_data = {
        'id': trick_id,
        'user_id': current_user['username'],
        'spot_id': spot_id,
        'trick_name': trick_name,
        'caption': (caption or '').strip()[:280] or None,
        'video_url': video_url,
        'duration_seconds': float(duration_seconds),
        'tagged_users': tag_list,
        'tips_received': 0,
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    supabase.table('tricks').insert(trick_data).execute()

    # Grant 5 DFQ reward
    new_balance = (current_user.get('wallet_balance') or 0) + TRICK_REWARD
    supabase.table('users').update({'wallet_balance': new_balance}).eq(
        'username', current_user['username']
    ).execute()
    supabase.table('transactions').insert({
        'id': str(uuid.uuid4()),
        'sender_id': 'SOLRIDE_TRICKS',
        'receiver_id': current_user['username'],
        'amount': TRICK_REWARD,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'type': 'trick_reward',
    }).execute()

    return {"trick": trick_data, "earned": TRICK_REWARD, "new_balance": new_balance}


@api.post("/tricks/{trick_id}/tip")
async def tip_trick(trick_id: str, current_user: dict = Depends(get_current_user)):
    """Send 1 DFQ to the trick creator. One tip per user per trick."""
    trick_res = supabase.table('tricks').select('*').eq('id', trick_id).execute()
    if not trick_res.data:
        raise HTTPException(404, "Trick not found")
    trick = trick_res.data[0]

    if trick['user_id'] == current_user['username']:
        raise HTTPException(400, "Can't tip your own trick")

    balance = current_user.get('wallet_balance') or 0
    if balance < TIP_AMOUNT:
        raise HTTPException(400, f"Need {TIP_AMOUNT} DFQ to tip")

    # Already tipped?
    dup = supabase.table('trick_tips').select('id').eq(
        'trick_id', trick_id
    ).eq('tipper_id', current_user['username']).execute()
    if dup.data:
        raise HTTPException(400, "Already tipped this trick")

    # Insert tip
    supabase.table('trick_tips').insert({
        'id': str(uuid.uuid4()),
        'trick_id': trick_id,
        'tipper_id': current_user['username'],
        'amount': TIP_AMOUNT,
        'created_at': datetime.now(timezone.utc).isoformat(),
    }).execute()

    # Move DFQ tipper → creator
    supabase.table('users').update({'wallet_balance': balance - TIP_AMOUNT}).eq(
        'username', current_user['username']
    ).execute()
    creator_res = supabase.table('users').select('wallet_balance').eq(
        'username', trick['user_id']
    ).execute()
    if creator_res.data:
        creator_balance = creator_res.data[0].get('wallet_balance') or 0
        supabase.table('users').update({
            'wallet_balance': creator_balance + TIP_AMOUNT
        }).eq('username', trick['user_id']).execute()

    # Bump aggregate on trick
    new_tips = (trick.get('tips_received') or 0) + TIP_AMOUNT
    supabase.table('tricks').update({'tips_received': new_tips}).eq('id', trick_id).execute()

    # Log tx
    supabase.table('transactions').insert({
        'id': str(uuid.uuid4()),
        'sender_id': current_user['username'],
        'receiver_id': trick['user_id'],
        'amount': TIP_AMOUNT,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'type': 'trick_tip',
    }).execute()

    return {"tipped": TIP_AMOUNT, "new_tips_total": new_tips}


@api.delete("/tricks/{trick_id}")
async def delete_trick(trick_id: str, current_user: dict = Depends(get_current_user)):
    res = supabase.table('tricks').select('user_id, video_url').eq('id', trick_id).execute()
    if not res.data:
        raise HTTPException(404, "Trick not found")
    if res.data[0]['user_id'] != current_user['username']:
        raise HTTPException(403, "Not your trick")

    # Best-effort: delete the storage object too
    try:
        vurl = res.data[0].get('video_url', '')
        if '/tricks/' in vurl:
            key = vurl.split('/tricks/', 1)[1].split('?')[0]
            supabase.storage.from_("tricks").remove([key])
    except Exception:
        pass

    supabase.table('tricks').delete().eq('id', trick_id).execute()
    return {"message": "Trick removed"}
            
            

    # Everything under this line is unvisible to an app.
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
