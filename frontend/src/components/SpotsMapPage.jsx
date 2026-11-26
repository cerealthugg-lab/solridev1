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

  // Fix half-rendered map glitch on first load / mobile
  useEffect(function() {
    if (!map) return;
    map.invalidateSize();
    var timer = setTimeout(function() {
      map.invalidateSize();
    }, 250);
    return function() { clearTimeout(timer); };
  }, [map]);

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
  }, [props.trigger, props.position]);

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

var SpotPhotoLightbox = function(props) {
  var photos = props.photos;
  var spotName = props.spotName;
  var onClose = props.onClose;

  var indexState = useState(props.index);
  var currentIndex = indexState[0];
  var setCurrentIndex = indexState[1];

  var scaleState = useState(1);
  var scale = scaleState[0];
  var setScale = scaleState[1];

  var posState = useState({ x: 0, y: 0 });
  var pos = posState[0];
  var setPos = posState[1];

  var containerRef = useRef(null);
  var imgRef = useRef(null);

  var stateRef = useRef({
    scale: 1,
    pos: { x: 0, y: 0 },
    startX: 0,
    startY: 0,
    swipeStartX: 0,
    swipeStartY: 0,
    initialDist: 0,
    initialScale: 1,
    isPinching: false,
    justPinchedTime: 0,
    isMouseDown: false
  });

  // Keep stateRef in sync with scale and pos for event handlers
  stateRef.current.scale = scale;
  stateRef.current.pos = pos;

  // Clamp pan coordinates so corners and edges lock to screen boundaries
  var clampPos = function(newX, newY, currentScale) {
    if (!containerRef.current || !imgRef.current || currentScale <= 1) {
      return { x: 0, y: 0 };
    }
    var rect = imgRef.current.getBoundingClientRect();
    var baseW = rect.width / (currentScale || 1);
    var baseH = rect.height / (currentScale || 1);
    var maxX = Math.max(0, (baseW * currentScale - containerRef.current.clientWidth) / 2);
    var maxY = Math.max(0, (baseH * currentScale - containerRef.current.clientHeight) / 2);

    return {
      x: Math.min(Math.max(newX, -maxX), maxX),
      y: Math.min(Math.max(newY, -maxY), maxY)
    };
  };

  var resetZoom = function() {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  // Keyboard controls for laptop (Esc, ArrowLeft, ArrowRight)
  useEffect(function() {
    var handleKeyDown = function(e) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) {
        resetZoom();
        setCurrentIndex(function(i) { return i + 1; });
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        resetZoom();
        setCurrentIndex(function(i) { return i - 1; });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return function() { window.removeEventListener('keydown', handleKeyDown); };
  }, [currentIndex, photos.length, onClose]);

  // Trackpad / Mouse Wheel Zoom on Laptop
  var handleWheel = function(e) {
    e.preventDefault();
    e.stopPropagation();
    var delta = -e.deltaY * 0.003;
    var newScale = Math.min(Math.max(scale + delta, 1), 4);
    setScale(newScale);
    if (newScale <= 1) {
      setPos({ x: 0, y: 0 });
    } else {
      setPos(function(p) { return clampPos(p.x, p.y, newScale); });
    }
  };

  // Double-tap or double-click to toggle 2.5x zoom
  var lastTapRef = useRef(0);
  var handleDoubleTap = function(e) {
    e.stopPropagation();
    var now = Date.now();
    if (now - lastTapRef.current < 320) {
      if (scale > 1) {
        resetZoom();
      } else {
        setScale(2.5);
      }
    }
    lastTapRef.current = now;
  };

  // Touch Handlers (Mobile)
  var handleTouchStart = function(e) {
    if (e.touches.length === 2) {
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      stateRef.current.initialDist = Math.hypot(dx, dy);
      stateRef.current.initialScale = scale;
      stateRef.current.isPinching = true;
    } else if (e.touches.length === 1) {
      stateRef.current.startX = e.touches[0].clientX - pos.x;
      stateRef.current.startY = e.touches[0].clientY - pos.y;
      stateRef.current.swipeStartX = e.touches[0].clientX;
      stateRef.current.swipeStartY = e.touches[0].clientY;
    }
  };

  var handleTouchMove = function(e) {
    if (e.touches.length === 2 && stateRef.current.isPinching) {
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      var dist = Math.hypot(dx, dy);
      var factor = dist / (stateRef.current.initialDist || 1);
      var newScale = Math.min(Math.max(stateRef.current.initialScale * factor, 1), 4);
      setScale(newScale);
      setPos(function(p) { return clampPos(p.x, p.y, newScale); });
    } else if (e.touches.length === 1 && scale > 1) {
      var rawX = e.touches[0].clientX - stateRef.current.startX;
      var rawY = e.touches[0].clientY - stateRef.current.startY;
      setPos(clampPos(rawX, rawY, scale));
    }
  };

  var handleTouchEnd = function(e) {
    if (stateRef.current.isPinching) {
      stateRef.current.isPinching = false;
      stateRef.current.justPinchedTime = Date.now();
      if (scale < 1.05) resetZoom();
      return;
    }

    // Block accidental photo flip right after pinch-zooming out
    if (Date.now() - stateRef.current.justPinchedTime < 350) return;

    if (scale <= 1) {
      resetZoom();
      var endX = e.changedTouches[0] ? e.changedTouches[0].clientX : 0;
      var endY = e.changedTouches[0] ? e.changedTouches[0].clientY : 0;
      var diffX = endX - stateRef.current.swipeStartX;
      var diffY = endY - stateRef.current.swipeStartY;

      // Vertical swipe down to close
      if (diffY > 80 && Math.abs(diffX) < 55) {
        onClose();
        return;
      }
      // Horizontal swipe to next/prev
      if (diffX < -50 && currentIndex < photos.length - 1) {
        resetZoom();
        setCurrentIndex(currentIndex + 1);
      } else if (diffX > 50 && currentIndex > 0) {
        resetZoom();
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  // Mouse drag handlers for Laptop
  var handleMouseDown = function(e) {
    if (scale > 1) {
      stateRef.current.isMouseDown = true;
      stateRef.current.startX = e.clientX - pos.x;
      stateRef.current.startY = e.clientY - pos.y;
    }
  };
  var handleMouseMove = function(e) {
    if (stateRef.current.isMouseDown && scale > 1) {
      var rawX = e.clientX - stateRef.current.startX;
      var rawY = e.clientY - stateRef.current.startY;
      setPos(clampPos(rawX, rawY, scale));
    }
  };
  var handleMouseUp = function() {
    stateRef.current.isMouseDown = false;
  };

  var prevPhoto = function(e) {
    e.stopPropagation();
    if (currentIndex > 0) {
      resetZoom();
      setCurrentIndex(currentIndex - 1);
    }
  };

  var nextPhoto = function(e) {
    e.stopPropagation();
    if (currentIndex < photos.length - 1) {
      resetZoom();
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[10000] bg-black/95 flex flex-col justify-between p-4 backdrop-blur-md select-none touch-none"
      onClick={onClose}
      onWheel={handleWheel}
      onMouseUp={handleMouseUp}
    >
      {/* Top Header Bar */}
      <div 
        className="flex items-center justify-between z-30 px-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
        onClick={function(e) { e.stopPropagation(); }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-[#D2FF00]">
            {currentIndex + 1} / {photos.length}
          </span>
          <span className="text-[11px] text-neutral-500 font-bold hidden sm:inline">
            · Double-tap / Scroll to zoom · Drag to pan
          </span>
        </div>
        <button 
          onClick={onClose} 
          className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-700 text-white flex items-center justify-center text-base hover:bg-neutral-800 active:scale-90 transition-transform"
        >
          ✕
        </button>
      </div>

      {/* Main Interactive Stage */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center relative w-full h-full overflow-hidden"
        onClick={handleDoubleTap}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: scale > 1 ? 'grab' : 'zoom-in' }}
      >
        {/* Laptop Prev Button */}
        {currentIndex > 0 && (
          <button
            onClick={prevPhoto}
            className="hidden sm:flex absolute left-4 z-30 w-11 h-11 rounded-full bg-black/60 border border-neutral-800 text-white items-center justify-center hover:bg-[#D2FF00] hover:text-black hover:border-transparent transition-all active:scale-90 shadow-xl"
            title="Previous (Left Arrow)"
          >
            ←
          </button>
        )}

        {/* The Photo with Clamped Matrix */}
        <img 
          ref={imgRef}
          src={photos[currentIndex]} 
          alt={spotName} 
          style={{
            transform: 'translate3d(' + pos.x + 'px, ' + pos.y + 'px, 0) scale(' + scale + ')',
            transition: stateRef.current.isPinching || stateRef.current.isMouseDown ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)'
          }}
          className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl pointer-events-none" 
        />

        {/* Laptop Next Button */}
        {currentIndex < photos.length - 1 && (
          <button
            onClick={nextPhoto}
            className="hidden sm:flex absolute right-4 z-30 w-11 h-11 rounded-full bg-black/60 border border-neutral-800 text-white items-center justify-center hover:bg-[#D2FF00] hover:text-black hover:border-transparent transition-all active:scale-90 shadow-xl"
            title="Next (Right Arrow)"
          >
            →
          </button>
        )}
      </div>

      {/* Bottom Dot Navigation */}
      <div 
        className="flex justify-center gap-1.5 py-4 z-30"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        onClick={function(e) { e.stopPropagation(); }}
      >
        {photos.map(function(_, idx) {
          return (
            <button
              key={idx} 
              onClick={function() { resetZoom(); setCurrentIndex(idx); }}
              className={'h-2 rounded-full transition-all ' + (idx === currentIndex ? 'bg-[#D2FF00] w-6' : 'bg-neutral-700 w-2 hover:bg-neutral-500')} 
            />
          );
        })}
      </div>
    </div>
  );
};

var SpotDetailCard = function(props) {
  var [photoIndex, setPhotoIndex] = useState(null);
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
            return (
            <img 
            key={i}
            src={photo}
            alt={spot.name}
            onClick={function() { setPhotoIndex(i); }}
            className="w-56 h-56 object-cover flex-shrink-0 snap-center rounded-xl cursor-pointer active:scale-95 transition-transform" />
          );
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
        {/* Interactive Zoomable & Swipeable Photo Lightbox */}
        {photoIndex !== null && spot.photos && spot.photos.length > 0 && (
          <SpotPhotoLightbox 
            photos={spot.photos} 
            index={photoIndex} 
            spotName={spot.name}
            onClose={function() { setPhotoIndex(null); }} 
          />
        )}
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
  var fullCardState = useState(false);
  var openSourceState = useState(null); // 'map' or 'list'
  var openSource = openSourceState[0];
  var setOpenSource = openSourceState[1];
  var isFullCardOpen = fullCardState[0];
  var setIsFullCardOpen = fullCardState[1];
  var fileInputRef = useRef(null);
  var listRef = useRef(null);
  var mapCardRef = useRef(null);
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

  var shareLocation = function(onSuccess) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async function(pos) {
          var loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          if (onSuccess) onSuccess(loc);
          try { await api.post('/riders/location', loc); } catch (e) {}
        },
        function(err) {
          if (err && err.code === 1) {
            toast.error("Location access denied in device settings.");
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    }
  };

   useEffect(function() {
    fetchSpots(); // Fetches fresh spots as soon as user opens the map
    fetchRiders();
    shareLocation();
    // Only poll active live riders (every 20s), zero spot re-fetching
    var ri = setInterval(function() { if (!document.hidden) { fetchRiders(); shareLocation(); } }, 20000);
    setLoading(false);
    return function() {
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
        <div className="h-80 lg:h-[460px] relative w-full overflow-hidden">
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%', background: '#0a0a0a' }} zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" className="dark-tiles" />
            <MapClickHandler onMapClick={handleMapClick} isAdding={isAdding} />
            {userLocation && <FlyToLocation position={[userLocation.lat, userLocation.lng]} trigger={centerTrigger} />}
                        {userLocation && (
              <Marker 
                position={[userLocation.lat, userLocation.lng]} 
                icon={userIcon}
                eventHandlers={{
                  click: function(e) {
                    if (isAdding) {
                      handleMapClick(e.latlng);
                    }
                  }
                }}
              >
                {!isAdding && (
                  <Popup><div className="text-black text-xs"><strong>You</strong><div className="text-zinc-500">You are here</div></div></Popup>
                )}
              </Marker>
            )}
            {filteredSpots.map(function(spot) {
              var typeInfo = SPOT_TYPES.find(function(t) { return t.value === spot.spot_type; }) || SPOT_TYPES[0];
              var isSel = selectedSpot && selectedSpot.id === spot.id;
              return (
                <Marker key={spot.id} position={[spot.lat, spot.lng]} icon={createSpotIcon(isSel ? '#FFFFFF' : typeInfo.color)}
                  eventHandlers={{ 
                  click: function() { 
                    if (isSel) {
                      setSelectedSpot(null);
                      setIsFullCardOpen(false);
                      setOpenSource(null);
                    } else {
                      setSelectedSpot(spot);
                      setIsFullCardOpen(true); // Open card directly!
                      setOpenSource('map'); // Originated from map!
                      setTimeout(function() {
                        if (mapCardRef.current) {
                          mapCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 120);
                    }
                  } 

                }} />
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
           {/* 🛹 Only shows under map if user tapped a pin on the MAP */}
      {selectedSpot && openSource === 'map' && (
        <div 
          className={"bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden transition-all duration-300 ease-out shadow-2xl " + (isFullCardOpen ? "ring-1 ring-[#D2FF00]/40" : "hover:border-neutral-700")}
        >
          {/* Header Banner */}
          <div 
            onClick={function() { setIsFullCardOpen(!isFullCardOpen); }}
            className="p-3 bg-neutral-900/80 flex items-center justify-between gap-3 cursor-pointer select-none border-b border-neutral-900"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-black flex-shrink-0 flex items-center justify-center border border-neutral-800">
                {selectedSpot.photos && selectedSpot.photos.length > 0 ? (
                  <img src={selectedSpot.photos[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <MapPin size={18} className="text-[#D2FF00]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-white uppercase tracking-tight truncate">{selectedSpot.name}</h4>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#D2FF00]/10 text-[#D2FF00] border border-[#D2FF00]/20">
                    {selectedSpot.spot_type}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                  <span>{isFullCardOpen ? "▲ Tap to collapse" : "▼ Tap to expand full spot"}</span>
                </p>
              </div>
            </div>

            <button 
              onClick={function(e) { e.stopPropagation(); setSelectedSpot(null); setIsFullCardOpen(false); setOpenSource(null); }}
              className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center text-sm active:scale-90 transition-transform"
            >
              ✕
            </button>
          </div>

          {/* Smooth Slide-out Content Body */}
          <div 
            className={"transition-all duration-300 ease-in-out overflow-hidden " + (isFullCardOpen ? "max-h-[650px] opacity-100 overflow-y-auto" : "max-h-0 opacity-0 pointer-events-none")}
          >
            <SpotDetailCard
              spot={selectedSpot}
              onClose={function() { setIsFullCardOpen(false); }}
              onDelete={function(id) { handleDeleteSpot(id); setIsFullCardOpen(false); setSelectedSpot(null); setOpenSource(null); }}
              canDelete={currentUser && selectedSpot.user_id === currentUser.username}
              userLocation={userLocation}
              spotTricks={spotTricks}
              onOpenTrickModal={function() { setTrickModalOpen(true); }}
            />
          </div>
        </div>
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
              var isSelectedInList = selectedSpot && selectedSpot.id === spot.id && openSource === 'list';
              var thumb = spot.photos && spot.photos.length > 0 ? spot.photos[0] : null;

              return (
                <div 
                  key={spot.id} 
                  data-testid={'nearest-spot-' + spot.id}
                  className={"rounded-2xl overflow-hidden transition-all duration-300 " + (isSelectedInList ? "border border-[#D2FF00]/40 bg-neutral-950 shadow-2xl my-3" : "bg-neutral-950 border border-transparent hover:bg-neutral-900")}
                >
                  {/* Spot Row Header */}
                  <div
                    onClick={function() {
                      if (isSelectedInList) {
                        setSelectedSpot(null);
                        setOpenSource(null);
                      } else {
                        setSelectedSpot(spot);
                        setOpenSource('list'); // Open inline right here in the list!
                      }
                    }}
                    className="flex items-center gap-3 p-2.5 cursor-pointer select-none"
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
                    <span className="text-neutral-500 text-xs px-2">
                      {isSelectedInList ? "▲" : "▼"}
                    </span>
                  </div>

                  {/* Inline Expanded Spot Details (Slides out directly under this row in the list!) */}
                  {isSelectedInList && (
                    <div className="border-t border-neutral-900 animate-in slide-in-from-top-2 duration-300">
                      <SpotDetailCard
                        spot={selectedSpot}
                        onClose={function() { setSelectedSpot(null); setOpenSource(null); }}
                        onDelete={function(id) { handleDeleteSpot(id); setSelectedSpot(null); setOpenSource(null); }}
                        canDelete={currentUser && selectedSpot.user_id === currentUser.username}
                        userLocation={userLocation}
                        spotTricks={spotTricks}
                        onOpenTrickModal={function() { setTrickModalOpen(true); }}
                      />
                    </div>
                  )}
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