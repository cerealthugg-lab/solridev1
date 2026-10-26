import Welcome from './components/Welcome';
import FeedbackModal from './components/FeedbackModal';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster, toast } from "./components/ui/sonner";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Home, MapPin, Wallet, User, Play, Square, Send, LogOut, Wrench, Volume2, Navigation, Battery, Wifi, WifiOff, Radio, Crosshair, History, Zap, Lock, Flame, Shield, Sparkles } from 'lucide-react';
import { Label } from "./components/ui/label";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import SpotsMapPage from './components/SpotsMapPage';
import TricksFeed from './components/TricksFeed';
import confetti from 'canvas-confetti';
import ChatPage from './components/ChatPage';
import { MessageCircle } from 'lucide-react'; 
import SkaterProfile from './components/SkaterProfile';
import DirectMessages from "./components/DirectMessages";
import Conversation from "./components/Conversation";
import MyProfile from "./components/MyProfile";
import AdminPage from './components/AdminPage';
import LegalPage from './components/LegalPage';

// add to lucide imports

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

const register = async (username, password, email, code, accepted_terms) => {
  await api.post('/auth/register', { username, password, email, code, accepted_terms });
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
  const [showFirstRideCelebration, setShowFirstRideCelebration] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const startLock = useRef(false);
  const stopLock = useRef(false);
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
    if (startLock.current || isStarting || isActive) return;
    startLock.current = true;
    setIsStarting(true);
    try {
      const { data } = await api.post('/rides/start');
      setRideId(data.id);
      setIsActive(true);
      setDistance(0);
      setCoords([]);
    } catch (e) {
      toast.error("Failed to start ride");
    } finally {
      setIsStarting(false);
      setTimeout(() => { startLock.current = false; }, 400);
    }
  };

  const stopRide = async () => {
    if (stopLock.current || isStopping || !isActive || !rideId) return;
    stopLock.current = true;
    setIsStopping(true);
    try {
     const { data } = await api.post(`/rides/${rideId}/stop`, { distance_meters: distance });
        
      const rideDistance = distance;
      setIsActive(false);
      setRideId(null);
      setCoords([]);
      setDistance(0);

      if (data.is_first_ride) {
        const duration = 4000;
        const end = Date.now() + duration;
        const colors = ['#D2FF00', '#FF3366', '#ffffff'];
        (function frame() {
          confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0 }, colors });
          confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1 }, colors });
          if (Date.now() < end) requestAnimationFrame(frame);
        })();
        setShowFirstRideCelebration({
          earned: data.earned,
          bonus: data.first_ride_bonus,
          distance: rideDistance
        });
      } else {
        toast.success(`Ride ended! +${data.earned.toFixed(2)} DFQ`);
      }
      fetchUser();
        
        
  } catch (e) {
      toast.error("Failed to stop ride");
    } finally {
      setIsStopping(false);
      setTimeout(() => { stopLock.current = false; }, 400);
    }
  };

  return (
    <RideContext.Provider value={{ isActive, rideId, distance, startRide, stopRide, isStarting, isStopping, showFirstRideCelebration, setShowFirstRideCelebration }}>
      
      
      {children}
    </RideContext.Provider>
  );
};

const useRide = () => useContext(RideContext);

// first ride celebration 

const FirstRideCelebration = () => {
  const { showFirstRideCelebration, setShowFirstRideCelebration } = useRide();
  if (!showFirstRideCelebration) return null;

  const { earned, bonus, distance } = showFirstRideCelebration;
  const baseEarn = earned - bonus;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
      <div className="bg-zinc-900 border-2 border-[#D2FF00] rounded-none max-w-sm w-full p-8 text-center">
        <div className="text-6xl mb-4 animate-bounce">🛹</div>
        <h2 className="text-3xl font-black text-white uppercase tracking-widest mb-2">
          First Ride!
        </h2>
        <p className="text-[#D2FF00] text-sm uppercase tracking-widest font-bold mb-6">
          Welcome to the crew
        </p>

        <div className="bg-black/50 border border-zinc-800 p-4 mb-6 space-y-2">
          <div className="flex justify-between text-xs uppercase tracking-widest">
            <span className="text-zinc-500">Distance</span>
            <span className="text-white font-bold">{distance.toFixed(0)}m</span>
          </div>
          <div className="flex justify-between text-xs uppercase tracking-widest">
            <span className="text-zinc-500">Earned</span>
            <span className="text-white font-bold">{baseEarn.toFixed(2)} DFQ</span>
          </div>
          <div className="flex justify-between text-xs uppercase tracking-widest pt-2 border-t border-zinc-800">
            <span className="text-[#D2FF00]">First-ride bonus</span>
            <span className="text-[#D2FF00] font-bold">+{bonus.toFixed(0)} DFQ</span>
          </div>
          <div className="flex justify-between text-sm uppercase tracking-widest pt-2 border-t border-[#D2FF00]/30">
            <span className="text-white font-bold">Total</span>
            <span className="text-[#D2FF00] font-black text-lg">+{earned.toFixed(2)} DFQ</span>
          </div>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed mb-6 italic">
          "Every ride from here matters. Every kilometer earns DFQ. Every spot you discover, every skater you meet — that's the network."
        </p>

        <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-6">
          ▸ Add spots · Send DFQ · Find your crew
        </p>

        <Button
          onClick={() => setShowFirstRideCelebration(null)}
          className="w-full bg-[#D2FF00] text-black hover:bg-[#c2eb00] font-black uppercase tracking-widest rounded-none h-12"
        >
          Let's Ride 🛹
        </Button>
      </div>
    </div>
  );
};

// --- Layout ---

const Layout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [onlineCount, setOnlineCount] = useState(0);

  // Global presence: while the app is open and the user is logged in,
  // ping the backend every 30s. That ping also keeps the user counted
  // as "online" even when they're on /wallet, /profile, /trucks, etc.
  // We also poll the count every 15s for the badge in the nav.
  useEffect(() => {
    if (!user) return;

    let alive = true;
    const ping = () => { api.post('/presence/ping').catch(() => {}); };
    const fetchCount = () => {
      api.get('/presence/count')
        .then((r) => { if (alive) setOnlineCount(r.data.online || 0); })
        .catch(() => {});
    };

    ping();
    fetchCount();
    const p = setInterval(ping, 30000);
    const c = setInterval(fetchCount, 15000);

    // Re-ping when the tab returns to the foreground so the count
    // updates quickly after the phone is unlocked.
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        ping();
        fetchCount();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      alive = false;
      clearInterval(p);
      clearInterval(c);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user]);

  if (!user) return <div className="bg-[#09090b] min-h-screen text-[#EDEDED] font-sans selection:bg-[#D2FF00] selection:text-black">{children}</div>;

 const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/spots', icon: MapPin, label: 'Spots' },
    { path: '/tricks', icon: Flame, label: 'Tricks' },
    { path: '/wallet', icon: Wallet, label: 'Wallet' },
    { path: '/profile', icon: User, label: 'Profile' },
];

const OnlineBadge = ({ className = '' }) => (
    <div className={`flex items-center gap-2 px-3 py-1 bg-black/70 backdrop-blur-md border border-zinc-800 rounded-full w-fit ${className}`}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#D2FF00] opacity-75 animate-ping"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D2FF00]"></span>
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
        <span className="text-[#D2FF00]">{onlineCount}</span> rider{onlineCount === 1 ? '' : 's'} online
      </span>
    </div>
  );

  return (
    <div className="bg-black min-h-screen lg:flex">
      <FirstRideCelebration />

      {/* Desktop sidebar (lg and up only) */}
      <aside data-testid="desktop-sidebar" className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-neutral-950 border-r border-neutral-900 px-5 py-8 z-50">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D2FF00] to-[#FF3366]"></div>
        <Link to="/" className="text-3xl font-black italic tracking-tighter bg-gradient-to-br from-[#D2FF00] to-white bg-clip-text text-transparent pr-2 mb-1">SOLRIDE</Link>
        <p className="text-[10px] tracking-[0.25em] uppercase text-neutral-600 mb-10">Ride. Track. Earn.</p>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path} data-testid={`sidebar-${label.toLowerCase()}`}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${active ? 'bg-[#D2FF00]/10 text-[#D2FF00]' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'}`}>
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span className="text-sm font-semibold tracking-wide">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-4">
          <OnlineBadge />
          <p className="text-xs text-neutral-500 truncate">@{user.username}</p>
        </div>
      </aside>

      <div className="bg-[#09090b] min-h-screen text-[#EDEDED] font-sans pb-20 lg:pb-8 max-w-md lg:max-w-none mx-auto lg:ml-64 lg:mr-0 lg:flex-1 relative shadow-2xl shadow-black overflow-hidden border-x border-zinc-900 lg:border-x-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D2FF00] to-[#FF3366] z-50 lg:hidden"></div>

        {/* X RIDERS ONLINE badge - mobile only, desktop shows it in the sidebar */}
        <div data-testid="online-riders-badge" className="fixed top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none lg:hidden">
          <OnlineBadge />
        </div>

     <main className={`p-4 pt-8 lg:p-10 lg:mx-auto ${location.pathname === '/profile' ? 'lg:max-w-5xl' : 'lg:max-w-2xl'}`}>{children}</main> 

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-zinc-800 flex justify-around p-4 z-50 max-w-md mx-auto">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link key={path} to={path} className={`flex flex-col items-center gap-1 transition-all ${location.pathname === path ? 'text-[#D2FF00] scale-110' : 'text-zinc-500 hover:text-white'}`}>
              <Icon size={24} strokeWidth={location.pathname === path ? 2.5 : 2} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
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
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const sendCode = async () => {
  if (sending) return; setSending(true);
  try {
    const { data } = await api.post('/auth/send-code', { email });
    if (data.email_verification === false) toast.success('No code needed right now, just tap Join');
    else { setCodeSent(true); toast.success('Code sent, check your inbox'); }
  }
  catch (err) { toast.error(err.response?.data?.detail || "Couldn't send code"); }
  finally { setSending(false); }
  };

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (isLogin) await login(username, password);
      else await register(username, password, email, code, accepted);
      toast.success(isLogin ? "Welcome back!" : "Welcome to the crew!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };
return (
    <div className="lg:grid lg:grid-cols-2 lg:min-h-screen">
    {/* Desktop brand panel (lg and up only) */}
    <section data-testid="auth-desktop-hero" className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-neutral-950 border-r border-neutral-900 p-14">
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-[#D2FF00]/10 blur-3xl"></div>
      <div className="absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full bg-[#FF3366]/10 blur-3xl"></div>
      <span className="relative text-xs tracking-[0.3em] uppercase text-neutral-500 font-bold">Solride</span>
      <div className="relative space-y-6">
        <h2 className="text-6xl xl:text-7xl font-black italic tracking-tighter leading-[0.9] text-white">Ride more.<br /><span className="text-[#D2FF00]">Stack DFQ.</span></h2>
        <p className="text-neutral-400 max-w-md text-base leading-relaxed">Track your rides, drop tricks, find spots and link up with skaters near you.</p>
        <div className="flex flex-wrap gap-3 pt-2">
          {['Live spots map', 'Trick feed', 'DFQ wallet', 'Rider chat'].map(t => (
            <span key={t} className="px-4 py-2 rounded-full bg-neutral-900/80 backdrop-blur-md border border-neutral-800 text-xs font-semibold text-neutral-300">{t}</span>
          ))}
        </div>
      </div>
      <span className="relative text-[10px] tracking-[0.25em] uppercase text-neutral-600">SOLRIDE © 2026</span>
    </section>

    <div className="flex flex-col items-center justify-center min-h-[80vh] lg:min-h-screen px-6">

      <h1 className="text-5xl font-black italic tracking-tighter mb-2 bg-gradient-to-br from-[#D2FF00] to-[#ffffff] bg-clip-text text-transparent pr-3">SOLRIDE</h1>
      <p className="text-zinc-500 mb-10 tracking-[0.2em] text-xs">Ride. Track. Earn.</p>
      
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] uppercase text-zinc-500 tracking-widest">Username</label>
          <input 
            value={username} 
            onChange={e => setUsername(e.target.value.toLowerCase().trim())} 
            className="w-full text-white bg-zinc-900/80 border border-zinc-800 focus:border-[#D2FF00]/50 rounded-xl h-12 px-4 text-base outline-none transition-colors"
            placeholder="skater_boi"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            autoComplete="username"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase text-zinc-500 tracking-widest">Password</label>
          <input 
            type="password" value={password} onChange={e => setPassword(e.target.value)} 
            className="w-full text-white bg-zinc-900/80 border border-zinc-800 focus:border-[#D2FF00]/50 rounded-xl h-12 px-4 text-base outline-none transition-colors"
            autoComplete="current-password"
          />
        </div>

     {!isLogin && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] uppercase text-zinc-500 tracking-widest">Email</label>
              <div className="flex gap-2">
                <input type="email" value={email}
                  onChange={e => { setEmail(e.target.value.trim()); setCodeSent(false); setCode(''); }}
                  className="flex-1 min-w-0 text-white bg-zinc-900/80 border border-zinc-800 focus:border-[#D2FF00]/50 rounded-xl h-12 px-4 text-base outline-none"
                  placeholder="you@email.com" autoCapitalize="off" autoCorrect="off" autoComplete="email" />
                <button type="button" onClick={sendCode} disabled={sending || !email}
                  className="px-4 h-12 rounded-xl bg-zinc-800 text-[#D2FF00] text-xs font-bold uppercase disabled:opacity-50">
                  {sending ? '...' : codeSent ? 'Resend' : 'Send code'}
                </button>
              </div>
            </div>
            {codeSent && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-zinc-500 tracking-widest">6-digit code</label>
                <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                  className="w-full text-white bg-zinc-900/80 border border-zinc-800 focus:border-[#D2FF00]/50 rounded-xl h-12 px-4 text-base tracking-[0.5em] outline-none" />
              </div>
            )}
            <label className="flex items-start gap-3 text-xs text-zinc-400 py-2">
              <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}
                className="mt-0.5 w-5 h-5 accent-[#D2FF00]" />
              <span>I'm 13 or older and agree to the <Link to="/terms" className="text-[#D2FF00] underline">Terms</Link> and <Link to="/privacy" className="text-[#D2FF00] underline">Privacy Policy</Link>. No tolerance for abusive content or users.</span>
            </label>
          </>
        )}
      {!isLogin && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] uppercase text-zinc-500 tracking-widest">Email</label>
              <div className="flex gap-2">
                <input type="email" value={email}
                  onChange={e => { setEmail(e.target.value.trim()); setCodeSent(false); setCode(''); }}
                  className="flex-1 min-w-0 text-white bg-zinc-900/80 border border-zinc-800 focus:border-[#D2FF00]/50 rounded-xl h-12 px-4 text-base outline-none"
                  placeholder="you@email.com" autoCapitalize="off" autoCorrect="off" autoComplete="email" />
                <button type="button" onClick={sendCode} disabled={sending || !email}
                  className="px-4 h-12 rounded-xl bg-zinc-800 text-[#D2FF00] text-xs font-bold uppercase disabled:opacity-50">
                  {sending ? '...' : codeSent ? 'Resend' : 'Send code'}
                </button>
              </div>
            </div>
            {codeSent && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-zinc-500 tracking-widest">6-digit code</label>
                <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                  className="w-full text-white bg-zinc-900/80 border border-zinc-800 focus:border-[#D2FF00]/50 rounded-xl h-12 px-4 text-base tracking-[0.5em] outline-none" />
              </div>
            )}
            <label className="flex items-start gap-3 text-xs text-zinc-400 py-2">
              <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}
                className="mt-0.5 w-5 h-5 accent-[#D2FF00]" />
              <span>I'm 13 or older and agree to the <Link to="/terms" className="text-[#D2FF00] underline">Terms</Link> and <Link to="/privacy" className="text-[#D2FF00] underline">Privacy Policy</Link>. No tolerance for abusive content or users.</span>
            </label>
          </>
        )}
        <button type="submit" disabled={busy || (!isLogin && (!accepted || !email || (codeSent && code.length !== 6)))}

          className="w-full bg-[#D2FF00] text-black hover:bg-[#c2eb00] font-semibold tracking-wider rounded-full h-12 text-base mt-2 shadow-[0_0_20px_rgba(210,255,0,0.15)] active:scale-[0.98] transition-all disabled:opacity-50">
          {busy ? 'Loading...' : isLogin ? 'Login' : 'Join'}
        </button>
      </form>

      <div className="text-center mt-6">
        <button onClick={() => setIsLogin(!isLogin)} className="text-xs text-zinc-500 hover:text-[#D2FF00] tracking-wider transition-colors">
          {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
        </button>
      </div>

      <div className="mt-10 flex flex-col items-center gap-3">
        <Link to="/welcome" className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 hover:text-[#D2FF00] font-bold py-2 transition-colors">
          Learn more →
        </Link>
        <span className="text-[10px] tracking-[0.25em] uppercase text-zinc-600">SOLRIDE © 2026</span>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, fetchUser } = useAuth();

  const handleClaimCardBonus = async () => {
    try {
      const { data } = await api.post('/users/claim-card-bonus');
      toast.success(`+${data.bonus} DFQ claimed!`);
      fetchUser();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Couldn't claim bonus");
    }
  };

  const required = ['deck_size', 'deck_company', 'fav_trick', 'fav_spot', 'birth_date'];
  const filled = required.filter(f => user[f] && String(user[f]).trim() !== '').length;
  const total = required.length;
  const percent = Math.round((filled / total) * 100);
  const isComplete = filled === total;
  const missing = required.filter(f => !user[f] || String(user[f]).trim() === '');

  const quickLinks = [
    { to: '/spots', icon: MapPin, title: 'Spots Map', sub: 'Find spots · Live riders', color: '#00D2FF', tag: 'New', id: 'spots' },
    { to: '/chat', icon: MessageCircle, title: 'Global Chat', sub: 'Talk to skaters worldwide', color: '#D2FF00', tag: 'Live', id: 'chat' },
    ...(user.is_admin ? [{ to: '/admin', icon: Shield, title: 'Admin Panel', sub: 'Moderate · Manage', color: '#FF3366', id: 'admin' }] : []),
  ];

  return (
    <div className="space-y-5" data-testid="dashboard">
      {/* Greeting */}
      <div className="flex items-center justify-between pt-2">
        <div className="min-w-0">
          <p className="text-xs text-neutral-500">Welcome back</p>
          <h1 className="text-2xl font-black tracking-tight text-white truncate">@{user.username}</h1>
        </div>
        <Link to="/profile" data-testid="dashboard-avatar-link" className="shrink-0">
          {user.photo_url ? (
            <img src={user.photo_url} alt={user.username} className="w-11 h-11 rounded-full object-cover ring-2 ring-[#D2FF00]/60 ring-offset-2 ring-offset-[#09090b]" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-neutral-900 ring-2 ring-[#D2FF00]/60 ring-offset-2 ring-offset-[#09090b] flex items-center justify-center text-lg font-black text-[#D2FF00]">
              {user.username?.[0]?.toUpperCase()}
            </div>
          )}
        </Link>
      </div>

      {/* Balance card */}
      <Link to="/wallet" data-testid="dashboard-balance-card" className="block relative overflow-hidden rounded-2xl bg-neutral-950 border border-neutral-800 p-5 group">
        <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-[#D2FF00]/15 blur-3xl group-hover:bg-[#D2FF00]/25 transition-colors"></div>
        <p className="relative text-xs text-neutral-500">Your balance</p>
        <div className="relative flex items-end justify-between mt-1">
          <div className="text-4xl font-black text-white tracking-tight" data-testid="dashboard-balance">
            {user.wallet_balance.toFixed(2)} <span className="text-base font-bold text-[#D2FF00]">DFQ</span>
          </div>
          <span className="text-xs font-semibold text-neutral-400 group-hover:text-[#D2FF00] transition-colors flex items-center gap-1">
            Wallet <Send size={12} />
          </span>
        </div>
      </Link>

      {/* Main actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/ride" data-testid="dashboard-ride-btn" className="relative overflow-hidden rounded-2xl bg-[#D2FF00] text-black p-5 aspect-square lg:aspect-auto lg:h-44 flex flex-col justify-between active:scale-[0.98] transition-transform">
          <div className="w-11 h-11 rounded-full bg-black/10 flex items-center justify-center">
            <Play size={20} className="ml-0.5" fill="black" />
          </div>
          <div>
            <span className="block text-lg font-black leading-tight">Ride now</span>
            <span className="block text-xs font-medium opacity-60">Track & earn DFQ</span>
          </div>
        </Link>
        <Link to="/tricks" data-testid="dashboard-tricks-btn" className="relative overflow-hidden rounded-2xl bg-neutral-950 border border-neutral-800 p-5 aspect-square lg:aspect-auto lg:h-44 flex flex-col justify-between hover:border-neutral-700 active:scale-[0.98] transition-all">
          <div className="w-11 h-11 rounded-full bg-[#FF3366]/15 flex items-center justify-center text-[#FF3366]">
            <Flame size={20} />
          </div>
          <div>
            <span className="block text-lg font-black leading-tight text-white">Tricks</span>
            <span className="block text-xs text-neutral-500">Watch the feed</span>
          </div>
        </Link>
      </div>

      {/* Quick links */}
      <div className="rounded-2xl bg-neutral-950 border border-neutral-800 divide-y divide-neutral-900 overflow-hidden">
        {quickLinks.map(({ to, icon: Icon, title, sub, color, tag, id }) => (
          <Link key={to} to={to} data-testid={`dashboard-link-${id}`} className="flex items-center gap-3 p-4 hover:bg-neutral-900 transition-colors">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color + '1f', color }}>
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-white">{title}</span>
              <span className="block text-xs text-neutral-500 truncate">{sub}</span>
            </div>
            {tag && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: color + '1f', color }}>{tag}</span>}
          </Link>
        ))}
      </div>

      {/* Profile completion bonus */}
      {!user.has_card_bonus && (
        <div data-testid="profile-bonus-card" className="rounded-2xl border border-[#D2FF00]/20 bg-gradient-to-br from-[#D2FF00]/10 to-transparent p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">{isComplete ? 'Profile complete!' : 'Complete your profile'}</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {isComplete ? 'Claim your reward' : `${filled}/${total} · missing: ${missing.join(', ').replace(/_/g, ' ')}`}
              </p>
            </div>
            <span className="text-[#D2FF00] font-black text-lg shrink-0">+5 DFQ</span>
          </div>
          <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
            <div className="h-full rounded-full bg-[#D2FF00] transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
          {isComplete ? (
            <button data-testid="claim-bonus-btn" onClick={handleClaimCardBonus} className="w-full bg-[#D2FF00] text-black hover:bg-[#c2eb00] font-semibold rounded-full h-11 text-sm active:scale-[0.98] transition-all">
              Claim 5 DFQ
            </button>
          ) : (
            <Link to="/profile" data-testid="finish-profile-btn" className="w-full flex items-center justify-center bg-neutral-900 border border-neutral-800 text-white font-semibold rounded-full h-11 text-sm hover:bg-neutral-800 transition-colors">
              Finish profile
            </Link>
          )}
          <p className="text-[11px] text-neutral-600 text-center">The note section is optional</p>
        </div>
      )}
    </div>
  );
};


const RidePage = () => {
  const { isActive, distance, startRide, stopRide, isStarting, isStopping } = useRide();
  const busy = isStarting || isStopping;
  
  // ⚡ RESTORED SAFETY BLOCK: Keeps the app from white-screening and stops double-tap lags!
  const noMultiTouch = { 
    touchAction: 'manipulation', 
    WebkitUserSelect: 'none', 
    userSelect: 'none', 
    WebkitTouchCallout: 'none' 
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-10">
        <div className="relative">
            <div className="absolute inset-0 bg-[#D2FF00] blur-[80px] opacity-10 rounded-full"></div>
            <h1 className="text-7xl font-light font-mono leading-none relative z-10 tracking-tight">
                {distance.toFixed(0)}<span className="text-xl text-zinc-600 ml-1">m</span>
            </h1>
        </div>

        {/* Ride button */}
        {isActive ? (
          <button 
            onClick={function(e) { e.preventDefault(); stopRide(); }} 
            disabled={busy}
            style={noMultiTouch} /* Ensures mobile touch frames only fire once */
            className="w-44 h-44 rounded-full border-2 border-[#FF3366] text-[#FF3366] text-xl font-black uppercase italic tracking-tighter flex flex-col items-center justify-center bg-[#FF3366]/5 backdrop-blur-md transition-all duration-300 ease-out active:scale-95 disabled:opacity-40 mx-auto select-none"
          >
            {isStopping ? (
              <div className="flex flex-col items-center gap-1.5">
                <span className="inline-block w-5 h-5 border-2 border-[#FF3366] border-t-transparent rounded-full animate-spin"></span>
                <span className="text-[10px] font-bold tracking-widest not-italic opacity-60">SAVING</span>
              </div>
            ) : (
              <>
                <span className="drop-shadow-[0_0_8px_rgba(255,51,102,0.3)]">STOP</span>
                <span className="text-[9px] font-bold tracking-widest opacity-60 not-italic mt-0.5">ACTIVE</span>
              </>
            )}
          </button>
        ) : (
          <button 
            onClick={function(e) { e.preventDefault(); startRide(); }} 
            disabled={busy}
            style={noMultiTouch} /* Ensures mobile touch frames only fire once */
            className="w-44 h-44 rounded-full border-2 border-[#D2FF00] text-[#D2FF00] text-xl font-black uppercase italic tracking-tighter flex flex-col items-center justify-center bg-[#D2FF00]/5 backdrop-blur-md transition-all duration-300 ease-out active:scale-95 disabled:opacity-40 mx-auto select-none"
          >
            {isStarting ? (
              <div className="flex flex-col items-center gap-1.5">
                <span className="inline-block w-5 h-5 border-2 border-[#D2FF00] border-t-transparent rounded-full animate-spin"></span>
                <span className="text-[10px] font-bold tracking-widest not-italic opacity-60">SYNCING</span>
              </div>
            ) : (
              <>
                <span className="drop-shadow-[0_0_8px_rgba(210,255,0,0.35)]">RIDE</span>
                <span className="text-[9px] font-bold tracking-widest opacity-60 not-italic mt-0.5">READY</span>
              </>
            )}
          </button>
        )}

        <p className="text-zinc-500 text-xs tracking-wider uppercase tracking-widest font-mono">
            {isStopping ? "Saving ride..." : isStarting ? "Loading..." : (isActive ? "GPS tracking" : "Tap to start")}
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
      if (localStorage.getItem('token')) { fetchUser(); fetchHistory(); }
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
        fetchHistory();
    } catch (e) {
        toast.error(e.response?.data?.detail || "Transfer failed");
    }
  };

  return (
    <div className="space-y-6" data-testid="wallet-page">
      <h1 className="text-2xl font-black tracking-tight text-white pt-2">Wallet</h1>

      <div className="relative overflow-hidden rounded-2xl bg-[#D2FF00] p-6 text-black">
        <div className="absolute -bottom-16 -right-12 w-48 h-48 rounded-full bg-white/30 blur-2xl"></div>
        <p className="relative text-xs font-semibold opacity-60">Total balance</p>
        <div className="relative text-5xl font-black tracking-tight mt-1" data-testid="wallet-balance">{user.wallet_balance.toFixed(2)}</div>
        <p className="relative text-sm font-bold mt-1 opacity-70">DFQ</p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-neutral-950 border border-neutral-800 p-4">
        <div className="w-9 h-9 rounded-full bg-neutral-900 flex items-center justify-center shrink-0">
          <Sparkles size={15} className="text-[#D2FF00]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Rewards store coming soon</p>
          <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">Use your earned DFQ to claim street accessories, skate gear or custom vouchers.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-neutral-950 border border-neutral-800 p-4 space-y-3">
        <p className="text-sm font-bold text-white">Send DFQ</p>
        <input
          data-testid="wallet-receiver-input"
          placeholder="@username"
          value={receiver} onChange={e => setReceiver(e.target.value.toLowerCase().trim().replace(/^@/, ''))}
          autoCapitalize="off" autoCorrect="off" spellCheck="false"
          className="w-full text-white bg-neutral-900 border border-neutral-800 focus:border-[#D2FF00]/50 rounded-xl h-11 px-4 text-base outline-none transition-colors"
        />
        <div className="flex gap-2">
          <input
            data-testid="wallet-amount-input"
            type="number" inputMode="decimal" placeholder="Amount"
            value={amount} onChange={e => setAmount(e.target.value)}
            className="flex-1 min-w-0 text-white bg-neutral-900 border border-neutral-800 focus:border-[#D2FF00]/50 rounded-xl h-11 px-4 text-base outline-none transition-colors"
          />
          <button data-testid="wallet-max-btn" onClick={() => setAmount(String(user.wallet_balance))} className="px-4 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800 rounded-xl h-11 text-xs font-semibold transition-colors">
            Max
          </button>
        </div>
        <button data-testid="wallet-send-btn" onClick={handleSend} className="w-full bg-white text-black hover:bg-neutral-200 font-semibold rounded-full h-11 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
          Send <Send size={16} />
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-bold text-white">History</p>
        <div className="rounded-2xl bg-neutral-950 border border-neutral-800 divide-y divide-neutral-900 overflow-hidden" data-testid="wallet-history">
          {history.map(tx => {
            const isSender = tx.sender_id === user.username;
            const isRide = tx.type === 'ride_earning';
            let color = isSender ? '#FF3366' : '#D2FF00';
            if (isRide) color = '#c084fc';
            let label = isSender ? `To @${tx.receiver_id}` : `From @${tx.sender_id}`;
            if (isRide) label = 'Ride earnings';
            const Icon = isRide ? Zap : Send;
            return (
              <div key={tx.id} className="flex items-center gap-3 p-3.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color + '1f', color }}>
                  <Icon size={15} className={!isRide && !isSender ? 'rotate-180' : ''} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-white truncate">{label}</span>
                  <span className="block text-xs text-neutral-500">{new Date(tx.timestamp).toLocaleDateString()}</span>
                </div>
                <span className="font-bold text-sm" style={{ color }}>
                  {isSender ? '-' : '+'}{tx.amount.toFixed(2)}
                </span>
              </div>
            );
          })}
          {history.length === 0 && <div className="text-center text-neutral-500 text-sm py-8">No transactions yet</div>}
        </div>
      </div>
    </div>
  );
}; 

const ProfilePage = () => {
  const { user, fetchUser, logout } = useAuth();
  return <MyProfile user={user} api={api} fetchUser={fetchUser} logout={logout} />;
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
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; '
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

const ChatWrapper = () => {
  const { user } = useAuth();
  return <ChatPage currentUser={user} />;
};


const SpotsMapWrapper = () => {
  const { user } = useAuth();
  return <SpotsMapPage currentUser={user} />;
};

const AdminWrapper = () => {
  const { user } = useAuth();
  return <AdminPage currentUser={user} />;
};

const TricksFeedWrapper = () => {
const { user } = useAuth(); // use your actual context/hook
return <TricksFeed currentUser={user} />;
};



const ConversationWrapper = () => {        
  const { user } = useAuth();
  return <Conversation currentUsername={user?.username} />;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster theme="dark" position="top-center" />

      <AuthProvider>
        <RideProvider>
          <Layout>
              <Routes>
                    <Route path="/spots" element={<PrivateRoute><SpotsMapWrapper /></PrivateRoute>} />
                    <Route path="/chat" element={<PrivateRoute><ChatWrapper /></PrivateRoute>} />
                    <Route path="/welcome" element={<Welcome />} /> 
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/ride" element={<PrivateRoute><RidePage /></PrivateRoute>} />
                    <Route path="/wallet" element={<PrivateRoute><WalletPage /></PrivateRoute>} />
                    <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                    <Route path="/skater/:username" element={<PrivateRoute><SkaterProfile /></PrivateRoute>} />
                 <Route path="/tricks" element={<PrivateRoute><TricksFeedWrapper /></PrivateRoute>}/>


<Route path="/messages" element={<PrivateRoute><DirectMessages /></PrivateRoute>}/>

<Route path="/messages/:cid" element={<PrivateRoute><ConversationWrapper /></PrivateRoute>}/>

<Route path="/admin" element={<PrivateRoute><AdminWrapper /></PrivateRoute>} />

<Route path="/privacy" element={<LegalPage kind="privacy" />} />

<Route path="/terms" element={<LegalPage kind="terms" />} />

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
  if (!user) return <Navigate to="/welcome" replace />;
  return children;
};

export default App;