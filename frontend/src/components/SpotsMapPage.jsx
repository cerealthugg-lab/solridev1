import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Plus, X, Camera, Navigation, Users, Trash2, Play, Video, Flag } from 'lucide-react';
import { toast } from "./ui/sonner";
import axios from 'axios';
import { Link } from 'react-router-dom';
import TrickUploadModal from './TrickUploadModal';
import ReportBlockSheet from './ReportBlockSheet';
// Play is already imported if you kept the original

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
  var [reportOpen, setReportOpen] = useState(false);
    

  var typeInfo = SPOT_TYPES.find(function(t) { return t.value === spot.spot_type; }) || SPOT_TYPES[0];
  var dist = userLocation ? getDistanceKm(userLocation.lat, userLocation.lng, spot.lat, spot.lng) : null;

  return (
      <div data-testid="spot-detail-card" className="relative bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
      <div className="h-1 w-full" style={{ backgroundColor: typeInfo.color }}></div>
      {spot.photos && spot.photos.length > 0 && (
        <div className="flex overflow-x-auto gap-2 snap-x p-3 pb-0">
          {spot.photos.map(function(photo, i) {
            return <img key={i} src={photo} alt={spot.name} className="w-56 h-56 object-cover flex-shrink-0 snap-center rounded-xl" />;
          })}
        </div>
      )}
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{spot.name}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full" style={{ backgroundColor: typeInfo.color + '22', color: typeInfo.color }}>{typeInfo.label}</span>
              {dist !== null && <span className="text-xs text-neutral-400">{formatDist(dist)} away</span>}
            </div>
          </div>
          <button data-testid="spot-detail-close" onClick={onClose} className="w-8 h-8 shrink-0 rounded-full bg-neutral-900 text-neutral-400 hover:text-white flex items-center justify-center active:scale-90 transition-transform">
            <X size={16} />
          </button>
        </div>

        {spot.description && <p className="text-sm text-neutral-400 leading-relaxed">{spot.description}</p>}

        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>
            Added by{' '}
            <Link to={"/skater/" + spot.user_id} onClick={function(e) { e.stopPropagation(); }} className="text-[#D2FF00] hover:underline font-semibold">
              @{spot.user_id}
            </Link>
          </span>
          <span>{new Date(spot.created_at).toLocaleDateString()}</span>
        </div>

        <div className="border-t border-neutral-900 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-neutral-300">
              Tricks landed <span className="text-neutral-500">· {props.spotTricks ? props.spotTricks.length : 0}</span>
            </div>
            <button
              onClick={function() { if (props.onOpenTrickModal) props.onOpenTrickModal(); }}
              data-testid="add-trick-btn"
              className="text-[11px] font-semibold text-black bg-[#D2FF00] px-3 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <Video size={12} /> Add trick · +5 DFQ
            </button>
          </div>
          {props.spotTricks && props.spotTricks.length > 0 && (
            <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
              {props.spotTricks.slice(0, 6).map(function(t) {
                return (
                  <a key={t.id} href={"/tricks#" + t.id} className="relative aspect-square bg-black overflow-hidden group" title={t.trick_name + " by " + t.user_id}>
                    <video src={t.video_url} muted playsInline preload="metadata" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                      <Play size={18} className="text-white" fill="white" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent text-white text-[9px] font-bold px-1.5 pt-3 pb-1 truncate">
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
            data-testid="spot-navigate-btn"
            onClick={function() { window.open('https://www.google.com/maps/dir/?api=1&destination=' + spot.lat + ',' + spot.lng, '_blank'); }}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-full bg-neutral-900 border border-neutral-800 text-white text-sm font-semibold hover:bg-neutral-800 active:scale-[0.98] transition-all"
          >
            <Navigation size={15} className="text-[#D2FF00]" /> Navigate
          </button>
            
            {!canDelete && (
  <button onClick={function() { setReportOpen(true); }}
    className="flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm font-semibold">
    <Flag size={15} className="text-[#FF3366]" /> Report
  </button>
)}
                  
          {canDelete && (
            <button
              data-testid="spot-delete-btn"
              onClick={function() { onDelete(spot.id); onClose(); }}
              className="flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-[#FF3366]/10 text-[#FF3366] text-sm font-semibold hover:bg-[#FF3366]/20 active:scale-[0.98] transition-all"
            >
              <Trash2 size={15} /> Remove
            </button>
          )}
        </div>
      </div>
          <ReportBlockSheet open={reportOpen} onClose={function() { setReportOpen(false); }} contentType="spot"
        contentId={spot.id} ownerUsername={spot.user_id} onHidden={onClose} />
    </div>
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
      <div className="space-y-4" data-testid="spots-map-page">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Spots</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            <span className="text-[#D2FF00] font-semibold">{riders.length}</span> riding now · {filteredSpots.length} spots on the map
          </p>
        </div>
        <button
          data-testid="toggle-riders-btn"
          onClick={function() { setShowRiders(!showRiders); }}
          className={"flex items-center gap-2 px-3.5 h-9 rounded-full text-xs font-semibold transition-colors " + (showRiders ? 'bg-[#D2FF00] text-black' : 'bg-neutral-900 text-neutral-400 border border-neutral-800')}
        >
          <Users size={14} /> {showRiders ? 'Riders on' : 'Show riders'}
        </button>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950">
        <div className="h-80 lg:h-[460px] relative">
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%', background: '#0a0a0a' }} zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" className="dark-tiles" />
            <MapClickHandler onMapClick={handleMapClick} isAdding={isAdding} />
            {userLocation && <FlyToLocation position={[userLocation.lat, userLocation.lng]} trigger={centerTrigger} />}
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                <Popup><div className="text-black text-xs"><strong>You</strong><div className="text-zinc-500">You are here</div></div></Popup>
              </Marker>
            )}
            {filteredSpots.map(function(spot) {
              var typeInfo = SPOT_TYPES.find(function(t) { return t.value === spot.spot_type; }) || SPOT_TYPES[0];
              var isSel = selectedSpot && selectedSpot.id === spot.id;
              return (
                <Marker key={spot.id} position={[spot.lat, spot.lng]} icon={createSpotIcon(isSel ? '#FFFFFF' : typeInfo.color)}
                  eventHandlers={{ click: function() { setSelectedSpot(isSel ? null : spot); } }} />
              );
            })}
            {showRiders && riders.map(function(rider) {
              return (
                <Marker key={rider.username} position={[rider.lat, rider.lng]} icon={riderIcon}>
                  <Popup><div className="text-black text-xs"><strong>{rider.username}</strong><div className="text-zinc-500">Riding now</div></div></Popup>
                </Marker>
              );
            })}
            {newPin && (
              <Marker position={[newPin.lat, newPin.lng]} icon={newPinIcon}><Popup>New spot here</Popup></Marker>
            )}
          </MapContainer>

          {/* Filter chips floating over the map */}
          <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2 overflow-x-auto no-scrollbar" data-testid="spot-filters">
            {[{ value: 'all', label: 'All', color: '#D2FF00' }].concat(SPOT_TYPES).map(function(t) {
              var active = filterType === t.value;
              return (
                <button
                  key={t.value}
                  data-testid={'spot-filter-' + t.value}
                  onClick={function() { setFilterType(t.value); }}
                  className={"flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap backdrop-blur-md transition-colors " + (active ? 'text-black' : 'bg-black/60 text-neutral-300 border border-white/10')}
                  style={active ? { backgroundColor: t.color } : {}}
                >
                  {!active && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }}></span>}
                  {t.label}
                </button>
              );
            })}
          </div>

          {isAdding && !showForm && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[1000] bg-[#FF3366] px-4 py-2 rounded-full shadow-lg shadow-[#FF3366]/30">
              <span className="text-white text-xs font-semibold whitespace-nowrap">Tap the map to drop a pin</span>
            </div>
          )}

          <button
            data-testid="center-on-me-btn"
            onClick={function() { shareLocation(); setCenterTrigger(function(prev) { return prev + 1; }); toast.success("Centering..."); }}
            className="absolute bottom-3 right-3 z-[1000] w-11 h-11 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[#D2FF00] flex items-center justify-center active:scale-90 transition-transform"
            title="Center on me"
          >
            <Navigation size={18} />
          </button>
        </div>
      </div>

      {!isAdding && !showForm ? (
        <button
          data-testid="add-spot-btn"
          onClick={function() { setIsAdding(true); }}
          className="w-full flex items-center justify-center gap-2 bg-[#D2FF00] text-black hover:bg-[#c2eb00] font-semibold rounded-full h-12 shadow-[0_0_20px_rgba(210,255,0,0.15)] active:scale-[0.98] transition-all"
        >
          <Plus size={18} /> Add a spot <span className="text-xs opacity-60 font-medium">· 1 DFQ</span>
        </button>
      ) : showForm ? (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-4" data-testid="new-spot-form">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white">New spot</h3>
            <button data-testid="cancel-spot-btn" onClick={cancelAdd} className="w-8 h-8 rounded-full bg-neutral-900 text-neutral-400 hover:text-white flex items-center justify-center"><X size={16} /></button>
          </div>
          <input
            data-testid="spot-name-input"
            placeholder="Spot name"
            value={formData.name}
            onChange={function(e) { setFormData(Object.assign({}, formData, { name: e.target.value })); }}
            className="w-full text-white bg-neutral-900 border border-neutral-800 focus:border-[#D2FF00]/50 rounded-xl h-11 px-4 text-base outline-none transition-colors"
          />
          <textarea
            data-testid="spot-description-input"
            placeholder="Description (optional)"
            value={formData.description}
            onChange={function(e) { setFormData(Object.assign({}, formData, { description: e.target.value })); }}
            className="w-full bg-neutral-900 text-white border border-neutral-800 focus:border-[#D2FF00]/50 rounded-xl p-3 text-base resize-none h-20 outline-none transition-colors"
          />
          <div className="flex gap-2 flex-wrap">
            {SPOT_TYPES.map(function(t) {
              var active = formData.spot_type === t.value;
              return (
                <button
                  key={t.value}
                  data-testid={'spot-type-' + t.value}
                  onClick={function() { setFormData(Object.assign({}, formData, { spot_type: t.value })); }}
                  className={"px-3.5 h-8 rounded-full text-xs font-semibold transition-colors " + (active ? 'text-black' : 'bg-neutral-900 text-neutral-400 border border-neutral-800')}
                  style={active ? { backgroundColor: t.color } : {}}
                >{t.label}</button>
              );
            })}
          </div>
          <div className="space-y-2">
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />
            <span className="text-xs text-neutral-500">Photos ({photos.length}/5)</span>
            <div className="grid grid-cols-5 gap-2">
              {photos.map(function(p, i) {
                return (
                  <div key={i} className="relative aspect-square">
                    <img src={p} alt="" className="w-full h-full object-cover rounded-lg" />
                    <button
                      onClick={function() { setPhotos(function(prev) { return prev.filter(function(_, idx) { return idx !== i; }); }); }}
                      className="absolute -top-1.5 -right-1.5 bg-[#FF3366] rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      <X size={12} className="text-white" />
                    </button>
                  </div>
                );
              })}
              {photos.length < 5 && (
                <button
                  data-testid="add-spot-photo-btn"
                  onClick={function() { if (fileInputRef.current) fileInputRef.current.click(); }}
                  className="aspect-square rounded-lg border border-dashed border-neutral-700 hover:border-[#D2FF00] flex items-center justify-center transition-colors group"
                >
                  <Camera size={18} className="text-neutral-600 group-hover:text-[#D2FF00] transition-colors" />
                </button>
              )}
            </div>
          </div>
          <button
            data-testid="save-spot-btn"
            onClick={handleSubmitSpot}
            disabled={isSubmitting}
            className="w-full bg-[#D2FF00] text-black hover:bg-[#c2eb00] font-semibold rounded-full h-11 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Saving...
              </span>
            ) : 'Save spot'}
          </button>
        </div>
      ) : (
        <button data-testid="cancel-pin-btn" onClick={cancelAdd} className="w-full flex items-center justify-center gap-2 rounded-full h-11 bg-[#FF3366]/10 text-[#FF3366] text-sm font-semibold">
          <X size={16} /> Cancel
        </button>
      )}

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
          onUploaded={function(newTrick) { setSpotTricks(function(prev) { return [newTrick].concat(prev); }); }}
        />
      )}

      <div className="space-y-3 pt-2" ref={listRef}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            Nearest spots
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#D2FF00] bg-[#D2FF00]/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-[#D2FF00] rounded-full animate-pulse"></span> Live
            </span>
          </h3>
          <span className="text-xs text-neutral-500">{nearbySpots.length}</span>
        </div>
        {nearbySpots.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-dashed border-neutral-800 text-neutral-500 text-sm">No spots yet. Be the first to add one!</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto" data-testid="nearest-spots-list">
            {nearbySpots.map(function(spot) {
              var typeInfo = SPOT_TYPES.find(function(t) { return t.value === spot.spot_type; }) || SPOT_TYPES[0];
              var isSel = selectedSpot && selectedSpot.id === spot.id;
              var thumb = spot.photos && spot.photos.length > 0 ? spot.photos[0] : null;
              return (
                <div
                  key={spot.id}
                  data-testid={'nearest-spot-' + spot.id}
                  onClick={function() { setSelectedSpot(isSel ? null : spot); }}
                  className={"flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-colors " + (isSel ? 'bg-neutral-900 ring-1 ring-neutral-700' : 'bg-neutral-950 hover:bg-neutral-900')}
                >
                  <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ backgroundColor: typeInfo.color + '1f' }}>
                    {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <MapPin size={18} style={{ color: typeInfo.color }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-white truncate">{spot.name}</span>
                      <span className="text-xs text-neutral-500 flex-shrink-0">{formatDist(spot.distance)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                      <span className="font-medium" style={{ color: typeInfo.color }}>{typeInfo.label}</span>
                      <span className="text-neutral-600">by @{spot.user_id}</span>
                      {spot.photos && spot.photos.length > 0 && (
                        <span className="text-neutral-600 flex items-center gap-0.5"><Camera size={11} /> {spot.photos.length}</span>
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