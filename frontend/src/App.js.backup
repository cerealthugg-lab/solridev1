import Welcome from './components/Welcome';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster, toast } from "./components/ui/sonner";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Home, MapPin, Wallet, User, Play, Square, Send, LogOut, Wrench, Volume2, Navigation, Battery, Wifi, WifiOff, Radio, Crosshair, History, Zap, Lock } from 'lucide-react';
import { Label } from "./components/ui/label";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom tool marker
const toolIcon = new L.DivIcon({
  className: 'custom-tool-marker',
  html: `<div style="background: #D2FF00; width: 24px; height: 24px; border-radius: 50%; border: 3px solid #000; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px #D2FF00;">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// --- API Setup ---
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const api = axios.create({ baseURL: `${BACKEND_URL}/api` });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Context ---
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const { data } = await api.get('/users/me');
      setUser(data);
    } catch (e) {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) fetchUser();
    else setLoading(false);
  }, []);

  const login = async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const { data } = await api.post('/auth/login', formData);
    localStorage.setItem('token', data.access_token);
    await fetchUser();
  };

  const register = async (username, password) => {
    await api.post('/auth/register', { username, password });
    await login(username, password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, fetchUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// --- Ride Context ---
const RideContext = createContext();

const RideProvider = ({ children }) => {
  const { user, fetchUser } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [rideId, setRideId] = useState(null);
  const [distance, setDistance] = useState(0);
  const [coords, setCoords] = useState([]);
  const wakeLock = useRef(null);
  const watchId = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('solride_state');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.isActive) {
          setIsActive(true);
          setRideId(p.rideId);
          setDistance(p.distance);
          if (p.lastCoord) {
            setCoords([p.lastCoord]);
          }
        }
      } catch (e) {
        console.error("Failed to restore ride state", e);
      }
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      const state = {
        isActive,
        rideId,
        distance,
        lastCoord: coords.length > 0 ? coords[coords.length - 1] : null
      };
      localStorage.setItem('solride_state', JSON.stringify(state));
    } else {
      localStorage.removeItem('solride_state');
    }
  }, [isActive, rideId, distance, coords]);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLock.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.error("Wake Lock error:", err);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLock.current) {
      try {
        await wakeLock.current.release();
        wakeLock.current = null;
      } catch (err) {
        console.error("Wake Lock release error:", err);
      }
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(p1) * Math.cos(p2) *
      Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  useEffect(() => {
    if (!isActive) {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      releaseWakeLock();
      return;
    }

    requestWakeLock();

    if (navigator.geolocation && !watchId.current) {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const timestamp = position.timestamp;
          
          setCoords(prev => {
            if (prev.length > 0) {
              const last = prev[prev.length - 1];
              const dist = calculateDistance(last.lat, last.lon, latitude, longitude);
              const timeDiff = (timestamp - last.timestamp) / 1000;
              
              if (dist > 2) {
                if (timeDiff > 0) {
                    const speedMPS = dist / timeDiff;
                    const speedKPH = speedMPS * 3.6;
                    
                    if (speedKPH > 35) {
                        return prev;
                    }
                }

                setDistance(d => d + dist);
                return [...prev, { lat: latitude, lon: longitude, timestamp }];
              }
              return prev;
            }
            return [{ lat: latitude, lon: longitude, timestamp }];
          });
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    }

    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      releaseWakeLock();
    };
  }, [isActive]);

  const startRide = async () => {
    try {
      const { data } = await api.post('/rides/start');
      setRideId(data.id);
      setIsActive(true);
      setDistance(0);
      setCoords([]);
    } catch (e) {
      toast.error("Failed to start ride");
    }
  };

  const stopRide = async () => {
    try {
      const { data } = await api.post(`/rides/${rideId}/stop`, { distance_meters: distance });
      setIsActive(false);
      setRideId(null);
      setCoords([]);
      setDistance(0);
      toast.success(`Ride ended! You earned ${data.earned.toFixed(2)} DFQ`);
      fetchUser();
    } catch (e) {
      toast.error("Failed to stop ride");
    }
  };

  return (
    <RideContext.Provider value={{ isActive, rideId, distance, startRide, stopRide }}>
      {children}
    </RideContext.Provider>
  );
};

const useRide = () => useContext(RideContext);

// --- Layout ---

const Layout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <div className="bg-[#09090b] min-h-screen text-[#EDEDED] font-sans selection:bg-[#D2FF00] selection:text-black">{children}</div>;

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
  ];

  return (
    <div className="bg-[#09090b] min-h-screen text-[#EDEDED] font-sans pb-20 max-w-md mx-auto relative shadow-2xl shadow-black overflow-hidden border-x border-zinc-900">
       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D2FF00] to-[#FF3366] z-50"></div>
      <main className="p-4 pt-8">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-zinc-800 flex justify-around p-4 z-50 max-w-md mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => (
          <Link key={path} to={path} className={`flex flex-col items-center gap-1 transition-all ${location.pathname === path ? 'text-[#D2FF00] scale-110' : 'text-zinc-500 hover:text-white'}`}>
            <Icon size={24} strokeWidth={location.pathname === path ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

// --- Pages ---

const AuthPage = () => {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) await login(username, password);
      else await register(username, password);
      toast.success(isLogin ? "Welcome back!" : "Welcome to the crew!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
<Link
  to="/welcome"
  className="absolute top-4 left-4 text-[10px] tracking-[0.2em] uppercase text-zinc-500 hover:text-white font-bold"
>
  ← Learn more
</Link>
      <h1 className="text-6xl font-black italic tracking-tighter mb-2 bg-gradient-to-br from-[#D2FF00] to-[#ffffff] bg-clip-text text-transparent">SOLRIDE</h1>
      <p className="text-zinc-500 mb-8 uppercase tracking-[0.2em] text-xs">Ride. Track. Earn.</p>
      
      <Card className="w-full bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label className="uppercase text-xs text-zinc-500">Username</Label>
            <Input 
              value={username} onChange={e => setUsername(e.target.value)} 
              className="text-white bg-black border-zinc-800 focus:border-[#D2FF00] rounded-none h-12 text-lg"
              placeholder="skater_boi"
            />
          </div>
          <div className="space-y-2">
            <Label className="uppercase text-xs text-zinc-500">Password</Label>
            <Input 
              type="password" value={password} onChange={e => setPassword(e.target.value)} 
              className="text-white bg-black border-zinc-800 focus:border-[#D2FF00] rounded-none h-12"
            />
          </div>
          <Button onClick={handleSubmit} className="w-full bg-[#D2FF00] text-black hover:bg-[#c2eb00] font-black uppercase tracking-widest rounded-none h-12 text-lg mt-4">
            {isLogin ? 'Login' : 'Join'}
          </Button>

          <div className="text-center mt-4">
            <button onClick={() => setIsLogin(!isLogin)} className="text-xs text-zinc-500 hover:text-[#D2FF00] uppercase tracking-wider underline decoration-zinc-800 underline-offset-4">
              {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Welcome back</h2>
           <h1 className="text-3xl font-bold">{user.username}</h1>
        </div>
        <div className="text-right">
            <h2 className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Balance</h2>
            <div className="text-3xl font-black text-[#D2FF00]">{user.wallet_balance.toFixed(2)} <span className="text-sm text-white">DFQ</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
         <Link to="/ride">
          <Card className="bg-zinc-900/50 border-zinc-800 hover:border-[#D2FF00] transition-colors cursor-pointer group">
             <CardContent className="p-6 flex flex-col items-center justify-center gap-2 aspect-square">
                <div className="p-3 bg-zinc-950 rounded-full group-hover:bg-[#D2FF00] group-hover:text-black transition-colors text-white">
                  <Play size={24} className="ml-1" />
                </div>
                <span className="font-bold uppercase tracking-wider text-sm text-white">Ride Now</span>
             </CardContent>
          </Card>
         </Link>
         <Link to="/wallet">
          <Card className="bg-zinc-900/50 border-zinc-800 hover:border-[#D2FF00] transition-colors cursor-pointer group">
             <CardContent className="p-6 flex flex-col items-center justify-center gap-2 aspect-square">
                <div className="p-3 bg-zinc-950 rounded-full group-hover:bg-[#D2FF00] group-hover:text-black transition-colors text-white">
                  <Send size={24} />
                </div>
                <span className="font-bold uppercase tracking-wider text-sm text-white">Wallet</span>
             </CardContent>
          </Card>
         </Link>
      </div>

      <Link to="/find-tool" className="block mt-4">
        <Card className="bg-zinc-900/50 border-zinc-800 hover:border-[#D2FF00] transition-colors cursor-pointer group">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-950 rounded-full group-hover:bg-[#D2FF00] group-hover:text-black transition-colors text-white">
                <Wrench size={20} />
              </div>
              <div>
                <span className="font-bold uppercase tracking-wider text-sm text-white block">Find My Tool</span>
                <span className="text-xs text-zinc-500">GPS Tracker • Beep</span>
              </div>
            </div>
            <div className="text-xs text-[#D2FF00] font-mono uppercase">V2</div>
          </CardContent>
        </Card>
      </Link>

      <Link to="/profile" className="block mt-6">
        <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800 hover:border-[#D2FF00] transition-colors cursor-pointer group">
          <CardHeader>
              <CardTitle className="uppercase tracking-widest text-sm text-zinc-500 group-hover:text-white transition-colors">Skater Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Deck Size</span>
                  <span className="font-mono text-[#D2FF00]">{user.deck_size || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Deck Company</span>
                  <span className="font-mono text-[#D2FF00]">{user.deck_company || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Fav Trick</span>
                  <span className="font-mono text-[#D2FF00]">{user.fav_trick || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Fav Spot</span>
                  <span className="font-mono text-[#D2FF00]">{user.fav_spot || '-'}</span>
              </div>
              {user.birth_date && (
                <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-zinc-400">Birth Date</span>
                    <span className="font-mono text-[#D2FF00]">
                      {user.birth_date} ({Math.floor((new Date() - new Date(user.birth_date)) / (365.25 * 24 * 60 * 60 * 1000))} y.o.)
                    </span>
                </div>
              )}
              {user.self_comment && (
                <div className="pt-3">
                    <span className="text-zinc-500 text-xs uppercase tracking-widest block mb-2">About</span>
                    <p className="text-sm text-white/80 leading-relaxed">"{user.self_comment}"</p>
                </div>
              )}
          </CardContent>
        </Card>
      </Link>
    </div>
  );
};

const RidePage = () => {
  const { isActive, distance, startRide, stopRide } = useRide();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        <div className="relative">
            <div className="absolute inset-0 bg-[#D2FF00] blur-[100px] opacity-20 rounded-full"></div>
            <h1 className="text-[6rem] font-black font-mono leading-none relative z-10">
                {distance.toFixed(0)}<span className="text-2xl text-zinc-600">m</span>
            </h1>
        </div>
        
        {isActive ? (
             <Button onClick={stopRide} className="w-full max-w-xs h-24 bg-[#FF3366] hover:bg-[#ff1f55] text-white text-2xl font-black uppercase tracking-widest rounded-none">
                <Square className="mr-4 fill-current" /> Stop
            </Button>
        ) : (
            <Button onClick={startRide} className="w-full max-w-xs h-24 bg-[#D2FF00] hover:bg-[#c2eb00] text-black text-2xl font-black uppercase tracking-widest rounded-none">
                <Play className="mr-4 fill-current" /> Start Ride
            </Button>
        )}
        
        <p className="text-zinc-500 text-xs uppercase tracking-widest">
            {isActive ? "Tracking GPS..." : "Ready to shred?"}
        </p>
    </div>
  );
};

const WalletPage = () => {
  const { user, fetchUser } = useAuth();
  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('');
  const [history, setHistory] = useState([]);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/wallet/history');
      setHistory(data);
    } catch(e) {}
  };

  useEffect(() => {
    fetchHistory();
    fetchUser();
    
    const interval = setInterval(() => {
      if (localStorage.getItem('token')) {
        fetchUser();
        fetchHistory();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    try {
        await api.post('/wallet/transfer', { receiver_username: receiver, amount: parseFloat(amount) });
        toast.success("Coins sent!");
        setReceiver('');
        setAmount('');
        fetchUser();
        const { data } = await api.get('/wallet/history');
        setHistory(data);
    } catch (e) {
        toast.error(e.response?.data?.detail || "Transfer failed");
    }
  };

  return (
    <div className="space-y-6">
       <div className="bg-zinc-900/50 p-4 border border-zinc-800 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock size={14} className="text-zinc-500" />
            <span className="text-zinc-400 text-xs uppercase tracking-widest font-bold">On-Chain Withdrawal</span>
          </div>
          <p className="text-zinc-600 text-xs">Solana wallet integration coming in Phase 2</p>
       </div>

       <Card className="bg-[#D2FF00] border-none text-black">
        <CardContent className="p-6 text-center">
            <h2 className="text-xs uppercase tracking-widest font-bold opacity-70 mb-2">Total Balance</h2>
            <div className="text-5xl font-black">{user.wallet_balance.toFixed(2)} DFQ</div>
        </CardContent>
       </Card>

       <div className="space-y-4">
         <h3 className="text-zinc-500 text-xs uppercase tracking-widest">Send DFQ</h3>
         
         <div className="flex gap-2">
            <Input 
                type="number" 
                placeholder="Amount" 
                value={amount} onChange={e=>setAmount(e.target.value)}
                className="text-white bg-black border-zinc-800 rounded-none h-12 flex-1"
            />
            <Button onClick={()=>setAmount(String(user.wallet_balance))} className="w-16 bg-zinc-800 text-white hover:bg-zinc-700 font-bold uppercase tracking-widest rounded-none h-12 text-xs">
                MAX
            </Button>
         </div>
         
         <div className="space-y-2">
            <Input 
                placeholder="Username" 
                value={receiver} onChange={e=>setReceiver(e.target.value)}
                className="text-white bg-black border-zinc-800 rounded-none h-12"
            />
            <Button onClick={handleSend} className="w-full bg-white text-black hover:bg-zinc-200 font-bold uppercase tracking-widest rounded-none h-12">
                Send <Send size={16} className="ml-2"/>
            </Button>
         </div>
       </div>

       <div className="space-y-4">
         <h3 className="text-zinc-500 text-xs uppercase tracking-widest">History</h3>
         <div className="space-y-2">
            {history.map(tx => {
                const isSender = tx.sender_id === user.username;
                const isRide = tx.type === 'ride_earning';
                
                let colorClass = isSender ? 'text-[#FF3366]' : 'text-[#D2FF00]';
                if (isRide) colorClass = 'text-purple-500';
                
                let label = isSender ? `To: ${tx.receiver_id}` : `From: ${tx.sender_id}`;
                if (isRide) label = "Ride Earnings";
                
                return (
                <div key={tx.id} className="flex justify-between items-center bg-zinc-900/50 p-3 border border-zinc-800">
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-500">{new Date(tx.timestamp).toLocaleDateString()}</span>
                        <span className="font-bold text-sm">{label}</span>
                    </div>
                    <span className={`font-mono font-bold ${colorClass}`}>
                        {isSender ? '-' : '+'}{tx.amount.toFixed(2)}
                    </span>
                </div>
            )})}
            {history.length === 0 && <div className="text-center text-zinc-600 text-sm">No transactions yet</div>}
         </div>
       </div>
    </div>
  );
};

const ProfilePage = () => {
    const { user, logout, fetchUser } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        full_name: '', deck_size: '', deck_company: '', fav_trick: '', fav_spot: '', self_comment: '', birth_date: ''
    });

    useEffect(() => {
        if(user) setFormData({
            full_name: user.full_name || '',
            deck_size: user.deck_size || '',
            deck_company: user.deck_company || '',
            fav_trick: user.fav_trick || '',
            fav_spot: user.fav_spot || '',
            self_comment: user.self_comment || '',
            birth_date: user.birth_date || ''
        });
    }, [user]);

    const handleUpdate = async () => {
        try {
            await api.put('/users/me', formData);
            toast.success("Profile Updated");
            await fetchUser();
            navigate('/');
        } catch(e) {
            toast.error("Update failed");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold uppercase">Profile Settings</h1>
                <Button variant="ghost" size="icon" onClick={logout} className="text-[#FF3366] hover:bg-[#FF3366]/10">
                    <LogOut size={20} />
                </Button>
            </div>
            
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs uppercase text-zinc-500">Birth Date</Label>
                    <Input type="date" value={formData.birth_date} onChange={e=>setFormData({...formData, birth_date: e.target.value})} className="text-white bg-black border-zinc-800 rounded-none"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs uppercase text-zinc-500">Deck Size</Label>
                        <Input value={formData.deck_size} onChange={e=>setFormData({...formData, deck_size: e.target.value})} className="text-white bg-black border-zinc-800 rounded-none"/>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs uppercase text-zinc-500">Deck Company</Label>
                        <Input value={formData.deck_company} onChange={e=>setFormData({...formData, deck_company: e.target.value})} className="text-white bg-black border-zinc-800 rounded-none"/>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs uppercase text-zinc-500">Favorite Trick</Label>
                    <Input value={formData.fav_trick} onChange={e=>setFormData({...formData, fav_trick: e.target.value})} className="text-white bg-black border-zinc-800 rounded-none"/>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs uppercase text-zinc-500">Favorite Spot</Label>
                    <Input value={formData.fav_spot} onChange={e=>setFormData({...formData, fav_spot: e.target.value})} className="text-white bg-black border-zinc-800 rounded-none"/>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs uppercase text-zinc-500">About <span className="text-zinc-600">({formData.self_comment.length}/130)</span></Label>
                    <textarea 
                        value={formData.self_comment} 
                        onChange={e => {
                            if (e.target.value.length <= 130) {
                                setFormData({...formData, self_comment: e.target.value});
                            }
                        }} 
                        className="w-full h-24 text-white bg-black border border-zinc-800 rounded-none p-3 resize-none focus:outline-none focus:border-[#D2FF00]" 
                        placeholder="Tell us about yourself..."
                        maxLength={130}
                    />
                </div>

                <Button onClick={handleUpdate} className="w-full bg-zinc-800 text-white hover:bg-zinc-700 font-bold uppercase tracking-widest rounded-none h-12 mt-4">
                    Save Changes
                </Button>
            </div>
        </div>
    );
};

// --- Find My Tool Page ---

const RecenterMap = ({ position }) => {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.setView(position, map.getZoom());
        }
    }, [position, map]);
    return null;
};

const FindMyToolPage = () => {
    const [tool, setTool] = useState(null);
    const [isBeeping, setIsBeeping] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isTracking, setIsTracking] = useState(false);
    const [locationHistory, setLocationHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(true);
    const trackingInterval = useRef(null);

    const simulateMovement = useCallback(() => {
        setTool(prev => {
            if (!prev) return prev;
            
            const movement = {
                lat: (Math.random() - 0.5) * 0.001,
                lng: (Math.random() - 0.5) * 0.001
            };
            
            const newLocation = {
                ...prev.lastLocation,
                lat: prev.lastLocation.lat + movement.lat,
                lng: prev.lastLocation.lng + movement.lng
            };

            const speed = (Math.random() * 15 + 5).toFixed(1);

            setLocationHistory(hist => {
                const newHist = [...hist, { 
                    lat: newLocation.lat, 
                    lng: newLocation.lng, 
                    time: new Date(),
                    speed 
                }];
                return newHist.slice(-100);
            });

            return {
                ...prev,
                lastLocation: newLocation,
                lastSeen: new Date(),
                speed: parseFloat(speed),
                isOnline: true
            };
        });
    }, []);

    useEffect(() => {
        setTimeout(() => {
            const startLat = 52.2297;
            const startLng = 21.0122;
            
            setTool({
                id: 'SRTOOL-001',
                name: 'SOLRIDE Tool V2',
                battery: 78,
                lastSeen: new Date(),
                lastLocation: {
                    name: 'Skate Park Central',
                    lat: startLat,
                    lng: startLng
                },
                isOnline: true,
                firmware: '1.0.2',
                speed: 0
            });

            setLocationHistory([{
                lat: startLat,
                lng: startLng,
                time: new Date(),
                speed: '0'
            }]);

            setLoading(false);
        }, 1000);
    }, []);

    const toggleTracking = () => {
        if (isTracking) {
            if (trackingInterval.current) {
                clearInterval(trackingInterval.current);
                trackingInterval.current = null;
            }
            setIsTracking(false);
            toast.success("Tracking paused");
        } else {
            setIsTracking(true);
            toast.success("Live tracking started!");
            trackingInterval.current = setInterval(simulateMovement, 2000);
        }
    };

    useEffect(() => {
        return () => {
            if (trackingInterval.current) {
                clearInterval(trackingInterval.current);
            }
        };
    }, []);

    const handleBeep = () => {
        if (!tool?.isOnline) {
            toast.error("Tool not in range. Try when connected to same WiFi.");
            return;
        }
        setIsBeeping(true);
        toast.success("BEEPING TOOL!");
        setTimeout(() => setIsBeeping(false), 3000);
    };

    const handleNavigate = () => {
        if (tool?.lastLocation) {
            const { lat, lng } = tool.lastLocation;
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
        }
    };

    const formatLastSeen = (date) => {
        if (!date) return 'Unknown';
        const diff = Date.now() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        if (seconds > 0) return `${seconds}s ago`;
        return 'Just now';
    };

    const clearHistory = () => {
        if (tool?.lastLocation) {
            setLocationHistory([{
                lat: tool.lastLocation.lat,
                lng: tool.lastLocation.lng,
                time: new Date(),
                speed: '0'
            }]);
            toast.success("History cleared");
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-[#D2FF00] font-mono animate-pulse flex items-center gap-3">
                    <Radio className="animate-spin" /> CONNECTING TO TOOL...
                </div>
            </div>
        );
    }

    if (!tool) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold uppercase flex items-center gap-2">
                    <Wrench className="text-[#D2FF00]" /> Find My Tool
                </h1>
                
                <Card className="bg-zinc-900 border-zinc-800 rounded-none">
                    <CardContent className="p-8 text-center space-y-4">
                        <div className="w-20 h-20 mx-auto rounded-full bg-zinc-800 flex items-center justify-center">
                            <WifiOff size={40} className="text-zinc-600" />
                        </div>
                        <h2 className="text-xl font-bold text-white">No Tool Paired</h2>
                        <p className="text-zinc-500 text-sm">
                            Connect your SOLRIDE Tool V2 to start tracking
                        </p>
                        <Button className="bg-[#D2FF00] text-black hover:bg-[#b8e600] font-bold uppercase tracking-widest rounded-none h-12 mt-4">
                            + Pair New Tool
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-zinc-800 border-dashed rounded-none">
                    <CardContent className="p-6 text-center space-y-2">
                        <p className="text-zinc-400 text-sm">Don't have a SOLRIDE Tool?</p>
                        <p className="text-[#D2FF00] text-xs font-mono">COMING SOON - V2 WITH GPS</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const historyCoords = locationHistory.map(h => [h.lat, h.lng]);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold uppercase flex items-center gap-2">
                    <Wrench className="text-[#D2FF00]" /> Find My Tool
                </h1>
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 ${
                    tool.isOnline ? 'bg-[#D2FF00]/20 text-[#D2FF00]' : 'bg-zinc-800 text-zinc-500'
                }`}>
                    {isTracking && <Radio size={12} className="animate-pulse" />}
                    {tool.isOnline ? 'LIVE' : 'OFFLINE'}
                </div>
            </div>

            <Card className="bg-zinc-900 border-zinc-800 rounded-none overflow-hidden">
                <div className="h-64 relative">
                    <MapContainer 
                        center={[tool.lastLocation.lat, tool.lastLocation.lng]} 
                        zoom={16} 
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                    >
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        />
                        
                        {showHistory && historyCoords.length > 1 && (
                            <Polyline 
                                positions={historyCoords} 
                                color="#D2FF00" 
                                weight={3}
                                opacity={0.7}
                            />
                        )}
                        
                        <Marker 
                            position={[tool.lastLocation.lat, tool.lastLocation.lng]}
                            icon={toolIcon}
                        >
                            <Popup>
                                <div className="text-black font-mono text-xs">
                                    <strong>SOLRIDE Tool</strong><br/>
                                    Speed: {tool.speed || 0} km/h<br/>
                                    Battery: {tool.battery}%
                                </div>
                            </Popup>
                        </Marker>
                        
                        <RecenterMap position={[tool.lastLocation.lat, tool.lastLocation.lng]} />
                    </MapContainer>

                    <div className="absolute top-2 left-2 z-[1000] bg-black/80 px-3 py-2 rounded">
                        <div className="flex items-center gap-2 text-xs">
                            <Zap size={14} className="text-[#D2FF00]" />
                            <span className="text-white font-mono">{tool.speed || 0} km/h</span>
                        </div>
                    </div>

                    <div className="absolute bottom-2 left-2 z-[1000] bg-black/80 px-2 py-1 rounded">
                        <span className="text-[10px] text-zinc-400 font-mono">
                            {tool.lastLocation.lat.toFixed(5)}, {tool.lastLocation.lng.toFixed(5)}
                        </span>
                    </div>

                    <div className="absolute bottom-2 right-2 z-[1000] bg-black/80 px-2 py-1 rounded">
                        <span className="text-[10px] text-zinc-400">
                            Updated: {formatLastSeen(tool.lastSeen)}
                        </span>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
                <Button 
                    onClick={toggleTracking}
                    className={`h-14 font-bold uppercase tracking-widest rounded-none ${
                        isTracking 
                            ? 'bg-[#FF3366] text-white hover:bg-[#FF3366]/80' 
                            : 'bg-[#D2FF00] text-black hover:bg-[#b8e600]'
                    }`}
                >
                    {isTracking ? (
                        <><Crosshair size={20} className="mr-2 animate-pulse" /> TRACKING</>
                    ) : (
                        <><Radio size={20} className="mr-2" /> START TRACK</>
                    )}
                </Button>

                <Button 
                    onClick={handleBeep}
                    disabled={isBeeping || !tool.isOnline}
                    className={`h-14 font-bold uppercase tracking-widest rounded-none ${
                        isBeeping ? 'animate-pulse bg-[#D2FF00]' : 'bg-zinc-800 text-white hover:bg-zinc-700'
                    }`}
                >
                    <Volume2 size={20} className={`mr-2 ${isBeeping ? 'animate-bounce' : ''}`} />
                    {isBeeping ? 'BEEPING...' : 'BEEP'}
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Button 
                    onClick={handleNavigate}
                    variant="outline"
                    className="h-12 border-[#D2FF00] text-[#D2FF00] hover:bg-[#D2FF00]/10 rounded-none"
                >
                    <Navigation size={18} className="mr-2" /> Navigate
                </Button>

                <Button 
                    onClick={() => setShowHistory(!showHistory)}
                    variant="outline"
                    className={`h-12 rounded-none ${showHistory ? 'border-[#D2FF00] text-[#D2FF00]' : 'border-zinc-700 text-zinc-500'}`}
                >
                    <History size={18} className="mr-2" /> Trail {showHistory ? 'ON' : 'OFF'}
                </Button>
            </div>

            <Card className="bg-zinc-900/50 border-zinc-800 rounded-none">
                <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Battery size={16} className={tool.battery > 20 ? 'text-[#D2FF00]' : 'text-[#FF3366]'} />
                                <span className="text-sm text-zinc-400 font-mono">{tool.battery}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Wifi size={16} className="text-[#D2FF00]" />
                                <span className="text-sm text-zinc-400">Connected</span>
                            </div>
                        </div>
                        <Button 
                            onClick={clearHistory}
                            variant="ghost" 
                            size="sm"
                            className="text-xs text-zinc-500 hover:text-white"
                        >
                            Clear Trail
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <p className="text-center text-xs text-zinc-600">
                {locationHistory.length} points tracked • {tool.id}
            </p>
        </div>
    );
};

// --- App Root ---

function App() {
  return (
    <BrowserRouter>
      <Toaster theme="dark" position="top-center" />
      <AuthProvider>
        <RideProvider>
          <Layout>
              <Routes>
                <Route path="/welcome" element={<Welcome />} /> 
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                  <Route path="/ride" element={<PrivateRoute><RidePage /></PrivateRoute>} />
                  <Route path="/wallet" element={<PrivateRoute><WalletPage /></PrivateRoute>} />
                  <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                  <Route path="/find-tool" element={<PrivateRoute><FindMyToolPage /></PrivateRoute>} />
              </Routes>
          </Layout>
        </RideProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#D2FF00] font-mono">LOADING...</div>;
  if (!user) {
    const seenWelcome = localStorage.getItem("solride.welcomeSeen") === "true";
    return <Navigate to={seenWelcome ? "/auth" : "/welcome"} replace />;
  }
  return children;
};

export default App;