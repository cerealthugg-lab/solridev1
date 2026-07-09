import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { MapPin, Plus, X, Camera, Navigation, Users, Filter, Trash2 } from 'lucide-react';
import { toast } from "./ui/sonner";
import axios from 'axios';
import { Link } from 'react-router-dom';
import TrickUploadModal from './TrickUploadModal';
import { Video, Play } from 'lucide-react';   // Play is already imported if you kept the original

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
  html: '<div style="background: ' + color + '; width: 20px; height: 20px; border-radius: 50%; border: 2px solid #000; box-shadow: 0 0 10px ' + color + '40;"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const riderIcon = new L.DivIcon({
  className: 'rider-marker',
  html: '<div style="background: #D2FF00; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #000; box-shadow: 0 0 15px #D2FF00;"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const newPinIcon = new L.DivIcon({
  className: 'new-pin-marker',
  html: '<div style="background: #FF3366; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 20px #FF3366; display: flex; align-items: center; justify-content: center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const userIcon = new L.DivIcon({
  className: 'user-marker',
  html: '<div style="background: #00D2FF; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 15px #00D2FF;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});


var MapClickHandler = function(props) {
  useMapEvents({
    click: function(e) {
      if (props.isAdding) {
        props.onMapClick(e.latlng);
      }
    }
  });
  return null;
};

var FlyToLocation = function(props) {
  var map = useMap();
  var hasFlownRef = useRef(false);

  // Fly ONCE on first load (city zoom)
  useEffect(function() {
    if (!props.position) return;
    if (!hasFlownRef.current) {
      map.flyTo(props.position, 13, { duration: 1.5 });
      hasFlownRef.current = true;
    }
  }, [props.position, map]);

  // Fly on manual trigger (closer zoom on button click)
  useEffect(function() {
    if (props.position && props.trigger > 0) {
      map.flyTo(props.position, 15, { duration: 1.2 });
    }
  }, [props.trigger]);

  return null;
};

var getDistanceKm = function(lat1, lng1, lat2, lng2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLng = (lng2 - lng1) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

var formatDist = function(d) {
  if (d === null) return '';
  if (d < 1) return Math.round(d * 1000) + 'm';
  return d.toFixed(1) + 'km';
};

var SpotDetailCard = function(props) {
  var spot = props.spot;
  var onClose = props.onClose;
  var onDelete = props.onDelete;
  var canDelete = props.canDelete;
  var userLocation = props.userLocation;

  var typeInfo = SPOT_TYPES.find(function(t) { return t.value === spot.spot_type; }) || SPOT_TYPES[0];
  var dist = userLocation ? getDistanceKm(userLocation.lat, userLocation.lng, spot.lat, spot.lng) : null;

  return (
    <Card className="bg-zinc-900 border-2 rounded-none overflow-hidden" style={{ borderColor: typeInfo.color }}>
      {spot.photos && spot.photos.length > 0 && (
        <div className="flex overflow-x-auto gap-2 snap-x p-2">
          {spot.photos.map(function(photo, i) {
            return <img key={i} src={photo} alt={spot.name} className="w-64 h-64 object-cover flex-shrink-0 snap-center rounded border border-zinc-700" />;
          })}
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-white">{spot.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5" style={{ backgroundColor: typeInfo.color, color: '#000' }}>{typeInfo.label}</span>
              {dist !== null && (
                <span className="text-xs font-mono text-zinc-400">{formatDist(dist)} away</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {spot.description && (
          <p className="text-sm text-zinc-400 leading-relaxed">{spot.description}</p>
        )}

     <div className="flex items-center justify-between text-xs text-zinc-500">
  <span>
    Added by{' '}
    <Link
      to={"/skater/" + spot.user_id}
      onClick={function(e) { e.stopPropagation(); }}
      className="text-[#D2FF00] hover:underline font-bold"
    >
      {spot.user_id}
    </Link>
  </span>
  <span className="font-mono">{new Date(spot.created_at).toLocaleDateString()}</span>
</div>
          
          {/* Tricks landed at this spot */}
        <div className="border-t border-zinc-800 pt-3 mt-1">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold">
              Tricks landed · {props.spotTricks ? props.spotTricks.length : 0}
            </div>
            <button
              onClick={function() { if (props.onOpenTrickModal) props.onOpenTrickModal(); }}
              data-testid="add-trick-btn"
              className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#D2FF00] hover:text-white flex items-center gap-1"
            >
              <Video size={12} /> Add trick · +5 DFQ
            </button>
          </div>
          {props.spotTricks && props.spotTricks.length > 0 && (
            <div className="grid grid-cols-3 gap-1">
              {props.spotTricks.slice(0, 6).map(function(t) {
                return (
                  <a
                    key={t.id}
                    href={"/tricks#" + t.id}
                    className="relative aspect-square bg-black border border-zinc-800 overflow-hidden group"
                    title={t.trick_name + " by " + t.user_id}
                  >
                    <video
                      src={t.video_url}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                      <Play size={20} className="text-white" fill="white" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-[8px] font-black uppercase tracking-wider px-1 py-0.5 truncate">
                      {t.trick_name}
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
          
          
        <div className="flex gap-2">
          <button
            onClick={function() {
              window.open('https://www.google.com/maps/dir/?api=1&destination=' + spot.lat + ',' + spot.lng, '_blank');
            }}
            className="flex-1 flex items-center justify-center gap-2 h-10 border border-[#D2FF00] text-[#D2FF00] text-xs font-bold uppercase tracking-widest hover:bg-[#D2FF00]/10 transition-colors"
          >
            <Navigation size={14} /> Navigate
          </button>
          {canDelete && (
            <button
              onClick={function() { onDelete(spot.id); onClose(); }}
              className="flex items-center justify-center gap-2 h-10 px-4 border border-[#FF3366] text-[#FF3366] text-xs font-bold uppercase tracking-widest hover:bg-[#FF3366]/10 transition-colors"
            >
              <Trash2 size={14} /> Remove
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

var SpotsMapPage = function(props) {
  var currentUser = props.currentUser;
  var spotsState = useState([]);
  var spots = spotsState[0];
  var setSpots = spotsState[1];
  var ridersState = useState([]);
  var riders = ridersState[0];
  var setRiders = ridersState[1];
  var addingState = useState(false);
  var isAdding = addingState[0];
  var setIsAdding = addingState[1];
  var pinState = useState(null);
  var newPin = pinState[0];
  var setNewPin = pinState[1];
  var formState = useState(false);
  var showForm = formState[0];
  var setShowForm = formState[1];
  var formDataState = useState({ name: '', description: '', spot_type: 'street' });
  var formData = formDataState[0];
  var setFormData = formDataState[1];
   var photosState = useState([]);
  var photos = photosState[0];
  var setPhotos = photosState[1];
  var submittingState = useState(false);
  var isSubmitting = submittingState[0];
  var setIsSubmitting = submittingState[1];
  var ridersVisState = useState(false);
  var showRiders = ridersVisState[0];
  var setShowRiders = ridersVisState[1];
  var filterState = useState('all');
  var filterType = filterState[0];
  var setFilterType = filterState[1];
  var locState = useState(null);
  var userLocation = locState[0];
  var setUserLocation = locState[1];
  var loadState = useState(true);
  var loading = loadState[0];
  var setLoading = loadState[1];
  var selectedState = useState(null);
  var selectedSpot = selectedState[0];
  var setSelectedSpot = selectedState[1];
  var fileInputRef = useRef(null);
  var listRef = useRef(null);
    var centerTriggerState = useState(0);
    var centerTrigger = centerTriggerState[0];
    var setCenterTrigger = centerTriggerState[1];
    // Tricks integration
  var trickModalState = useState(false);
  var trickModalOpen = trickModalState[0];
  var setTrickModalOpen = trickModalState[1];
  var spotTricksState = useState([]);
  var spotTricks = spotTricksState[0];
  var setSpotTricks = spotTricksState[1];

  // Load tricks whenever a new spot is selected
  useEffect(function() {
    if (!selectedSpot) { setSpotTricks([]); return; }
    api.get('/tricks/spot/' + selectedSpot.id)
      .then(function(res) { setSpotTricks(res.data || []); })
      .catch(function() { setSpotTricks([]); });
  }, [selectedSpot]);
    

  var fetchSpots = async function() {
    try {
      var res = await api.get('/spots');
      setSpots(res.data);
    } catch (e) {}
  };

  var fetchRiders = async function() {
    try {
      var res = await api.get('/riders/active');
      setRiders(res.data);
    } catch (e) {}
  };

  var shareLocation = function() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async function(pos) {
          var loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          try { await api.post('/riders/location', loc); } catch (e) {}
        },
        function(err) {
            toast.error("Location access denied - can't show your location.")
        },
        { enableHighAccuracy: true }
      );
    }
  };

  useEffect(function() {
    fetchSpots();
    fetchRiders();
    shareLocation();
    var si = setInterval(fetchSpots, 5000);
    var ri = setInterval(function() { fetchRiders(); shareLocation(); }, 10000);
    setLoading(false);
    return function() {
      clearInterval(si);
      clearInterval(ri);
      api.delete('/riders/location').catch(function() {});
    };
  }, []);

  var handleMapClick = function(latlng) {
    setNewPin(latlng);
    setShowForm(true);
  };

  var handlePhotoSelect = function(e) {
    var files = Array.from(e.target.files).slice(0, 5);
    files.forEach(function(file) {
      var reader = new FileReader();
      reader.onload = function() {
        setPhotos(function(prev) { return prev.slice(0, 4).concat([reader.result]); });
      };
      reader.readAsDataURL(file);
    });
  };

  var handleSubmitSpot = async function() {
    if (isSubmitting) return;
    if (!formData.name.trim()) return toast.error("Give the spot a name!");
    if (!newPin) return toast.error("Drop a pin on the map first");
    setIsSubmitting(true);
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
      setTimeout(function() {
        if (listRef.current) listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (e) {
      toast.error((e.response && e.response.data && e.response.data.detail) || "Failed to add spot");
    } finally {
      setIsSubmitting(false);
    }
  };

  var handleDeleteSpot = async function(spotId) {
    if (!window.confirm("Delete this spot? The  videos stay in the Tricks feed, but the spot info and map pin will be removed.")) return;
    try {
      await api.delete('/spots/' + spotId);
      toast.success("Spot removed");
      fetchSpots();
    } catch (e) {
      toast.error("Can't delete this spot");
    }
  };

  var cancelAdd = function() {
    setIsAdding(false);
    setShowForm(false);
    setNewPin(null);
    setFormData({ name: '', description: '', spot_type: 'street' });
    setPhotos([]);
  };

  var filteredSpots = filterType === 'all' ? spots : spots.filter(function(s) { return s.spot_type === filterType; });

  var nearbySpots = userLocation
    ? filteredSpots
        .map(function(s) { return Object.assign({}, s, { distance: getDistanceKm(userLocation.lat, userLocation.lng, s.lat, s.lng) }); })
        .sort(function(a, b) { return a.distance - b.distance; })
        .slice(0, 13)
    : filteredSpots.slice(0, 13).map(function(s) { return Object.assign({}, s, { distance: null }); });

  var mapCenter = userLocation ? [userLocation.lat, userLocation.lng] : [52.2297, 21.0122];

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold uppercase flex items-center gap-2">
          <MapPin className="text-[#D2FF00]" size={20} /> Spots Map
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={function() { setShowRiders(!showRiders); }}
            className={"p-2 rounded-full transition-colors " + (showRiders ? 'bg-[#D2FF00]/20 text-[#D2FF00]' : 'bg-zinc-800 text-zinc-500')}
          >
            <Users size={16} />
          </button>
          <span className="text-[10px] text-zinc-500 font-mono">{riders.length} riding</span>
        </div>
      </div>

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

      <Card className="bg-zinc-900 border-zinc-800 rounded-none overflow-hidden">
        <div className="h-72 relative">
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="CARTO" />
            <MapClickHandler onMapClick={handleMapClick} isAdding={isAdding} />
              
              
              
            {userLocation && (
  <FlyToLocation
    position={[userLocation.lat, userLocation.lng]}
    trigger={centerTrigger}
  />
)}
              
              {userLocation && (
  <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
    <Popup>
      <div className="text-black text-xs">
        <strong>You</strong>
        <div className="text-zinc-500">You are here</div>
      </div>
    </Popup>
  </Marker>
)}


            {filteredSpots.map(function(spot) {
              var typeInfo = SPOT_TYPES.find(function(t) { return t.value === spot.spot_type; }) || SPOT_TYPES[0];
              var isSel = selectedSpot && selectedSpot.id === spot.id;
              return (
                <Marker
                  key={spot.id}
                  position={[spot.lat, spot.lng]}
                  icon={createSpotIcon(isSel ? '#FFFFFF' : typeInfo.color)}
                  eventHandlers={{ click: function() { setSelectedSpot(isSel ? null : spot); } }}
                />
              );
            })}

            {showRiders && riders.map(function(rider) {
              return (
                <Marker key={rider.username} position={[rider.lat, rider.lng]} icon={riderIcon}>
                  <Popup>
                    <div className="text-black text-xs">
                      <strong>{rider.username}</strong>
                      <div className="text-zinc-500">Riding now</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {newPin && (
              <Marker position={[newPin.lat, newPin.lng]} icon={newPinIcon}>
                <Popup>New spot here</Popup>
              </Marker>
            )}
          </MapContainer>

          {isAdding && !showForm && (
            <div className="absolute top-2 left-2 right-2 z-[1000] bg-[#FF3366]/90 px-3 py-2 rounded text-center">
              <span className="text-white text-xs font-bold uppercase tracking-widest">Tap the map to drop a pin</span>
            </div>
          )}

          <div className="absolute bottom-2 left-2 z-[1000] bg-black/80 px-2 py-1 rounded">
            <span className="text-[10px] text-zinc-400 font-mono">{filteredSpots.length} spots</span>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={function() { setFilterType('all'); }}
          className={"px-3 py-1 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border transition-colors " + (filterType === 'all' ? 'bg-[#D2FF00] text-black border-[#D2FF00]' : 'bg-transparent text-zinc-500 border-zinc-800')}
        >All</button>
        {SPOT_TYPES.map(function(t) {
          return (
            <button
              key={t.value}
              onClick={function() { setFilterType(t.value); }}
              className={"px-3 py-1 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border transition-colors " + (filterType === t.value ? 'text-black' : 'bg-transparent text-zinc-500 border-zinc-800')}
              style={filterType === t.value ? { backgroundColor: t.color, borderColor: t.color } : {}}
            >{t.label}</button>
          );
        })}
      </div>

      {!isAdding && !showForm ? (
        <Button
          onClick={function() { setIsAdding(true); }}
          className="w-full bg-[#D2FF00] text-black hover:bg-[#c2eb00] font-bold uppercase tracking-widest rounded-none h-12"
        >
          <Plus size={18} className="mr-2" /> Add Spot <span className="ml-2 text-[10px] opacity-70">- 1 DFQ</span>
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
              onChange={function(e) { setFormData(Object.assign({}, formData, { name: e.target.value })); }}
              className="text-white bg-black border-zinc-800 rounded-none h-10"
            />
            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={function(e) { setFormData(Object.assign({}, formData, { description: e.target.value })); }}
              className="w-full bg-black text-white border border-zinc-800 rounded-none p-2 text-sm resize-none h-16 focus:outline-none focus:border-[#D2FF00]"
            />
            <div className="flex gap-2 flex-wrap">
              {SPOT_TYPES.map(function(t) {
                return (
                  <button
                    key={t.value}
                    onClick={function() { setFormData(Object.assign({}, formData, { spot_type: t.value })); }}
                    className={"px-3 py-1 text-[10px] font-bold uppercase tracking-widest border transition-colors " + (formData.spot_type === t.value ? 'text-black' : 'bg-transparent text-zinc-500 border-zinc-800')}
                    style={formData.spot_type === t.value ? { backgroundColor: t.color, borderColor: t.color } : {}}
                  >{t.label}</button>
                );
              })}
            </div>
            <div className="space-y-2">
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                  Photos ({photos.length}/5)
                </span>
                
              </div>
              <div className="grid grid-cols-5 gap-2">
                {photos.map(function(p, i) {
                  return (
                    <div key={i} className="relative aspect-square">
                      <img src={p} alt="" className="w-full h-full object-cover border border-zinc-800" />
                      <button
                        onClick={function() { setPhotos(function(prev) { return prev.filter(function(_, idx) { return idx !== i; }); }); }}
                        className="absolute -top-1 -right-1 bg-[#FF3366] rounded-full w-5 h-5 flex items-center justify-center"
                      >
                        <X size={12} className="text-white" />
                      </button>
                    </div>
                  );
                })}
                {photos.length < 5 && (
                  <button
                    onClick={function() { if (fileInputRef.current) fileInputRef.current.click(); }}
                    className="aspect-square border-2 border-dashed border-zinc-700 hover:border-[#D2FF00] flex flex-col items-center justify-center gap-1 transition-colors group"
                  >
                    <Camera size={20} className="text-zinc-600 group-hover:text-[#D2FF00] transition-colors" />
                    <span className="text-[8px] uppercase tracking-widest text-zinc-600 group-hover:text-[#D2FF00] transition-colors">
                      {photos.length === 0 ? 'Add' : '+'}
                    </span>
                  </button>
                )}
              </div>
            </div>
            <Button
              onClick={handleSubmitSpot}
              disabled={isSubmitting}
              className="w-full bg-[#D2FF00] text-black hover:bg-[#c2eb00] font-bold uppercase tracking-widest rounded-none h-10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save Spot'
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={cancelAdd} variant="outline" className="w-full border-[#FF3366] text-[#FF3366] hover:bg-[#FF3366]/10 rounded-none h-10">
          <X size={16} className="mr-2" /> Cancel
        </Button>
      )}

      <button
        onClick={function() {
  shareLocation();
  setCenterTrigger(function(prev) { return prev + 1; });
  toast.success("Centering...");
}}
        className="w-full flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-[#D2FF00] uppercase tracking-widest py-2"
      >
        <Navigation size={14} /> Center on me
      </button>

     {selectedSpot && (
  <SpotDetailCard
    spot={selectedSpot}
    onClose={function() { setSelectedSpot(null); }}
    onDelete={handleDeleteSpot}
    canDelete={currentUser && selectedSpot.user_id === currentUser.username}
    userLocation={userLocation}
    spotTricks={spotTricks}
    onOpenTrickModal={function() { setTrickModalOpen(true); }}
  />
)}

{selectedSpot && (
  <TrickUploadModal
    open={trickModalOpen}
    onClose={function() { setTrickModalOpen(false); }}
    spot={selectedSpot}
    onUploaded={function(newTrick) {
      setSpotTricks(function(prev) { return [newTrick].concat(prev); });
    }}
  />
)}

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
          <div className="text-center py-6 text-zinc-600 text-sm">No spots yet — be the first to add one!</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {nearbySpots.map(function(spot) {
              var typeInfo = SPOT_TYPES.find(function(t) { return t.value === spot.spot_type; }) || SPOT_TYPES[0];
              var isSel = selectedSpot && selectedSpot.id === spot.id;
              return (
                <div
                  key={spot.id}
                  onClick={function() { setSelectedSpot(isSel ? null : spot); }}
                  className={"flex items-center gap-3 p-3 cursor-pointer transition-all duration-200 " + (isSel ? 'bg-zinc-800 border-l-2 border-r border-t border-b border-zinc-700' : 'bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700')}
                  style={isSel ? { borderLeftColor: typeInfo.color } : {}}
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: typeInfo.color }}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-white truncate">{spot.name}</span>
                      <span className="text-[10px] font-mono text-zinc-500 flex-shrink-0">{formatDist(spot.distance)}</span>
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