import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { MapPin, Plus, X, Camera, Navigation, Users, Filter, Trash2 } from 'lucide-react';
import { toast } from "./ui/sonner";
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const api = axios.create({ baseURL: `${BACKEND_URL}/api` });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const SPOT_TYPES = [
  { value: 'street', label: 'Street', color: '#D2FF00' },
  { value: 'park', label: 'Park', color: '#00D2FF' },
  { value: 'diy', label: 'DIY', color: '#FF3366' },
  { value: 'bowl', label: 'Bowl', color: '#FF9900' },
  { value: 'flatground', label: 'Flat', color: '#AA66FF' },
];

const createSpotIcon = (color) => new L.DivIcon({
  className: 'custom-spot-marker',
  html: `<div style="background: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid #000; box-shadow: 0 0 10px ${color}40;"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const riderIcon = new L.DivIcon({
  className: 'rider-marker',
  html: `<div style="background: #D2FF00; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #000; box-shadow: 0 0 15px #D2FF00; animation: pulse 2s infinite;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const newPinIcon = new L.DivIcon({
  className: 'new-pin-marker',
  html: `<div style="background: #FF3366; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 20px #FF3366; display: flex; align-items: center; justify-content: center;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const MapClickHandler = ({ onMapClick, isAdding }) => {
  useMapEvents({
    click(e) {
      if (isAdding) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
};

const FlyToLocation = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 15);
  }, [position, map]);
  return null;
};

const SpotsMapPage = ({ currentUser }) => {
  const [spots, setSpots] = useState([]);
  const [riders, setRiders] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newPin, setNewPin] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', spot_type: 'street' });
  const [photos, setPhotos] = useState([]);
  const [showRiders, setShowRiders] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const fileInputRef = useRef(null);
  const listRef = useRef(null);

  const fetchSpots = async () => {
    try {
      const { data } = await api.get('/spots');
      setSpots(data);
    } catch (e) {
      console.error("Failed to fetch spots", e);
    }
  };

  const fetchRiders = async () => {
    try {
      const { data } = await api.get('/riders/active');
      setRiders(data);
    } catch (e) {
      console.error("Failed to fetch riders", e);
    }
  };

  const shareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          try {
            await api.post('/riders/location', loc);
          } catch (e) {}
        },
        (err) => console.error("Geolocation error", err),
        { enableHighAccuracy: true }
      );
    }
  };

  useEffect(() => {
    fetchSpots();
    fetchRiders();
    shareLocation();

    const spotsInterval = setInterval(fetchSpots, 5000);
    const ridersInterval = setInterval(() => {
      fetchRiders();
      shareLocation();
    }, 10000);

    setLoading(false);

    return () => {
      clearInterval(spotsInterval);
      clearInterval(ridersInterval);
      api.delete('/riders/location').catch(() => {});
    };
  }, []);

  const handleMapClick = (latlng) => {
    setNewPin(latlng);
    setShowForm(true);
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos(prev => [...prev.slice(0, 4), reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmitSpot = async () => {
    if (!formData.name.trim()) return toast.error("Give the spot a name!");
    if (!newPin) return toast.error("Drop a pin on the map first");

    try {
      await api.post('/spots', {
        name: formData.name,
        description: formData.description,
        lat: newPin.lat,
        lng: newPin.lng,
        spot_type: formData.spot_type,
        photos: photos,
      });
      toast.success("Spot added to the map!");
      setIsAdding(false);
      setShowForm(false);
      setNewPin(null);
      setFormData({ name: '', description: '', spot_type: 'street' });
      setPhotos([]);
      await fetchSpots();
      // Scroll to the list so user sees the new spot
      setTimeout(() => {
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to add spot");
    }
  };

  const handleDeleteSpot = async (spotId) => {
    try {
      await api.delete(`/spots/${spotId}`);
      toast.success("Spot removed");
      fetchSpots();
    } catch (e) {
      toast.error("Can't delete this spot");
    }
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setShowForm(false);
    setNewPin(null);
    setFormData({ name: '', description: '', spot_type: 'street' });
    setPhotos([]);
  };

  const filteredSpots = filterType === 'all' ? spots : spots.filter(s => s.spot_type === filterType);

  const getDistanceKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const nearbySpots = userLocation
    ? filteredSpots
        .map(s => ({ ...s, distance: getDistanceKm(userLocation.lat, userLocation.lng, s.lat, s.lng) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 13)
    : filteredSpots.slice(0, 13).map(s => ({ ...s, distance: null }));

  const mapCenter = userLocation ? [userLocation.lat, userLocation.lng] : [52.2297, 21.0122];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold uppercase flex items-center gap-2">
          <MapPin className="text-[#D2FF00]" size={20} /> Spots Map
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRiders(!showRiders)}
            className={`p-2 rounded-full transition-colors ${showRiders ? 'bg-[#D2FF00]/20 text-[#D2FF00]' : 'bg-zinc-800 text-zinc-500'}`}
          >
            <Users size={16} />
          </button>
          <span className="text-[10px] text-zinc-500 font-mono">{riders.length} riding</span>
        </div>
      </div>

      {/* Active Riders Banner */}
      <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Users size={18} className="text-[#D2FF00]" />
            {riders.length > 0 && <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#D2FF00] rounded-full animate-pulse"></div>}
          </div>
          <div>
            <span className="text-2xl font-black text-[#D2FF00] font-mono">{riders.length}</span>
            <span className="text-xs text-zinc-500 ml-2 uppercase tracking-widest">riders online</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-white font-mono">{nearbySpots.length}</span>
          <span className="text-xs text-zinc-500 ml-1 uppercase tracking-widest">nearest spots</span>
        </div>
      </div>

      {/* Map */}
      <Card className="bg-zinc-900 border-zinc-800 rounded-none overflow-hidden">
        <div className="h-72 relative">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
            />

            <MapClickHandler onMapClick={handleMapClick} isAdding={isAdding} />
            {userLocation && <FlyToLocation position={[userLocation.lat, userLocation.lng]} />}

            {/* Spot markers */}
            {filteredSpots.map(spot => {
              const typeInfo = SPOT_TYPES.find(t => t.value === spot.spot_type) || SPOT_TYPES[0];
              const isSelected = selectedSpot?.id === spot.id;
              return (
                <Marker
                  key={spot.id}
                  position={[spot.lat, spot.lng]}
                  icon={createSpotIcon(isSelected ? '#FFFFFF' : typeInfo.color)}
                  eventHandlers={{
                    click: () => {
                      setSelectedSpot(selectedSpot?.id === spot.id ? null : spot);
                    }
                  }}
                />
              );
            })}

            {/* Active riders */}
            {showRiders && riders.map(rider => (
              <Marker key={rider.username} position={[rider.lat, rider.lng]} icon={riderIcon}>
                <Popup>
                  <div className="text-black text-xs">
                    <strong>{rider.username}</strong>
                    <div className="text-zinc-500">Riding now</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* New pin while adding */}
            {newPin && (
              <Marker position={[newPin.lat, newPin.lng]} icon={newPinIcon}>
                <Popup>New spot here</Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Adding mode overlay */}
          {isAdding && !showForm && (
            <div className="absolute top-2 left-2 right-2 z-[1000] bg-[#FF3366]/90 px-3 py-2 rounded text-center">
              <span className="text-white text-xs font-bold uppercase tracking-widest">Tap the map to drop a pin</span>
            </div>
          )}

          {/* Spot count */}
          <div className="absolute bottom-2 left-2 z-[1000] bg-black/80 px-2 py-1 rounded">
            <span className="text-[10px] text-zinc-400 font-mono">{filteredSpots.length} spots</span>
          </div>
        </div>
      </Card>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border transition-colors ${
            filterType === 'all' ? 'bg-[#D2FF00] text-black border-[#D2FF00]' : 'bg-transparent text-zinc-500 border-zinc-800'
          }`}
        >All</button>
        {SPOT_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => setFilterType(t.value)}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border transition-colors ${
              filterType === t.value ? 'text-black' : 'bg-transparent text-zinc-500 border-zinc-800'
            }`}
            style={filterType === t.value ? { backgroundColor: t.color, borderColor: t.color } : {}}
          >{t.label}</button>
        ))}
      </div>

      {/* Add Spot Button / Form */}
      {!isAdding && !showForm ? (
        <Button
          onClick={() => setIsAdding(true)}
          className="w-full bg-[#D2FF00] text-black hover:bg-[#c2eb00] font-bold uppercase tracking-widest rounded-none h-12"
        >
         <Plus size={18} className="mr-2" /> Add Spot <span className="ml-2 text-[10px] opacity-70">• 1 DFQ</span>
        </Button>
      ) : showForm ? (
        <Card className="bg-zinc-900 border-zinc-800 rounded-none">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">New Spot</h3>
              <button onClick={cancelAdd} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>

            <Input
              placeholder="Spot name"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="text-white bg-black border-zinc-800 rounded-none h-10"
            />

            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full bg-black text-white border border-zinc-800 rounded-none p-2 text-sm resize-none h-16 focus:outline-none focus:border-[#D2FF00]"
            />

            <div className="flex gap-2 flex-wrap">
              {SPOT_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setFormData({...formData, spot_type: t.value})}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                    formData.spot_type === t.value ? 'text-black' : 'bg-transparent text-zinc-500 border-zinc-800'
                  }`}
                  style={formData.spot_type === t.value ? { backgroundColor: t.color, borderColor: t.color } : {}}
                >{t.label}</button>
              ))}
            </div>

            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-xs text-zinc-500 hover:text-[#D2FF00] uppercase tracking-widest"
              >
                <Camera size={14} /> Add photos ({photos.length}/5)
              </button>
              {photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {photos.map((p, i) => (
                    <div key={i} className="relative w-16 h-16 flex-shrink-0">
                      <img src={p} alt="" className="w-full h-full object-cover border border-zinc-800" />
                      <button
                        onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 bg-[#FF3366] rounded-full w-4 h-4 flex items-center justify-center"
                      >
                        <X size={10} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={handleSubmitSpot}
              className="w-full bg-[#D2FF00] text-black hover:bg-[#c2eb00] font-bold uppercase tracking-widest rounded-none h-10"
            >
              Save Spot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button
          onClick={cancelAdd}
          variant="outline"
          className="w-full border-[#FF3366] text-[#FF3366] hover:bg-[#FF3366]/10 rounded-none h-10"
        >
          <X size={16} className="mr-2" /> Cancel
        </Button>
      )}

      {/* My location button */}
      <button
        onClick={() => {
          shareLocation();
          toast.success("Location updated");
        }}
        className="w-full flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-[#D2FF00] uppercase tracking-widest py-2"
      >
        <Navigation size={14} /> Center on me
      </button>

      {/* Spot Detail Card */}
      {selectedSpot && (() => {
        const typeInfo = SPOT_TYPES.find(t => t.value === selectedSpot.spot_type) || SPOT_TYPES[0];
        const dist = userLocation ? getDistanceKm(userLocation.lat, userLocation.lng, selectedSpot.lat, selectedSpot.lng) : null;
        return (
          <Card className="bg-zinc-900 border-2 rounded-none overflow-hidden" style={{ borderColor: typeInfo.color }}>
            {selectedSpot.photos && selectedSpot.photos.length > 0 && (
            <div className="flex overflow-x-auto gap-2 snap-x p-2">
                {selectedSpot.photos.map((photo, i) => (
                  <img key={i} src={photo} alt={`${selectedSpot.name} ${i+1}`} className="w-64 h-64 object-cover flex-shrink-0 snap-center rounded border border-zinc-700" />
                ))}
              </div>
                ))}
              </div>
            )}
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedSpot.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5" style={{ backgroundColor: typeInfo.color, color: '#000' }}>{typeInfo.label}</span>
                    {dist !== null && (
                      <span className="text-xs font-mono text-zinc-400">
                        {dist < 1 ? `${(dist * 1000).toFixed(0)}m away` : `${dist.toFixed(1)}km away`}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedSpot(null)} className="text-zinc-500 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>

              {selectedSpot.description && (
                <p className="text-sm text-zinc-400 leading-relaxed">{selectedSpot.description}</p>
              )}

              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Added by <span className="text-white font-bold">{selectedSpot.user_id}</span></span>
                <span className="font-mono">{new Date(selectedSpot.created_at).toLocaleDateString()}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const { lat, lng } = selectedSpot;
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 h-10 border border-[#D2FF00] text-[#D2FF00] text-xs font-bold uppercase tracking-widest hover:bg-[#D2FF00]/10 transition-colors"
                >
                  <Navigation size={14} /> Navigate
                </button>
                {selectedSpot.user_id === currentUser?.username && (
                  <button
                    onClick={() => { handleDeleteSpot(selectedSpot.id); setSelectedSpot(null); }}
                    className="flex items-center justify-center gap-2 h-10 px-4 border border-[#FF3366] text-[#FF3366] text-xs font-bold uppercase tracking-widest hover:bg-[#FF3366]/10 transition-colors"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Nearest Spots List */}
      <div className="space-y-2" ref={listRef}>
        <h3 className="text-zinc-500 text-xs uppercase tracking-widest flex items-center justify-between">
          <span className="flex items-center gap-2">
            Nearest Spots
            <span className="w-1.5 h-1.5 bg-[#D2FF00] rounded-full animate-pulse"></span>
            <span className="text-[8px] text-[#D2FF00] font-mono">LIVE</span>
          </span>
          <span className="text-[#D2FF00] font-mono">{nearbySpots.length}</span>
        </h3>
        {nearbySpots.length === 0 ? (
          <div className="text-center py-6 text-zinc-600 text-sm">
            No spots yet — be the first to add one!
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {nearbySpots.map(spot => {
              const typeInfo = SPOT_TYPES.find(t => t.value === spot.spot_type) || SPOT_TYPES[0];
              const isSelected = selectedSpot?.id === spot.id;
              return (
                <div
                  key={spot.id}
                  onClick={() => setSelectedSpot(isSelected ? null : spot)}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-zinc-800 border-l-2 border-r border-t border-b border-zinc-700'
                      : 'bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700'
                  }`}
                  style={isSelected ? { borderLeftColor: typeInfo.color } : {}}
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: typeInfo.color }}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-white truncate">{spot.name}</span>
                      <span className="text-[10px] font-mono text-zinc-500 flex-shrink-0">
                        {spot.distance !== null ? (spot.distance < 1 ? `${(spot.distance * 1000).toFixed(0)}m` : `${spot.distance.toFixed(1)}km`) : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] uppercase tracking-widest" style={{ color: typeInfo.color }}>{typeInfo.label}</span>
                      <span className="text-[10px] text-zinc-600">by {spot.user_id}</span>
                      {spot.photos && spot.photos.length > 0 && (
                        <span className="text-[10px] text-zinc-600"><Camera size={10} className="inline" /> {spot.photos.length}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotsMapPage;
