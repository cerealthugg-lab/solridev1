import React, { useState } from 'react';
import { X, Sparkles, Award, Lock, Share2, Store, Check, Flame, MapPin } from 'lucide-react';
import { toast } from './ui/sonner';

export function calculateSkaterLevel(tricksCount = 0) {
  const level = Math.min(10, Math.max(1, Math.floor(tricksCount / 10) + 1));
  const isMax = tricksCount >= 100;
  const progress = isMax ? 100 : ((tricksCount % 10) / 10) * 100;
  const remainingForNext = isMax ? 0 : 10 - (tricksCount % 10);
  
  let rankTitle = 'Amateur Street Ripper';
  if (level >= 10) rankTitle = 'SLS PRO RIDER';
  else if (level >= 8) rankTitle = 'Master Tech Specialist';
  else if (level >= 6) rankTitle = 'Sponsored Flow Team';
  else if (level >= 4) rankTitle = 'Local Spot Legend';
  else if (level >= 2) rankTitle = 'Rising Street Gun';

  return { level, progress, remainingForNext, isMax, rankTitle };
}

export default function SLSProCardModal({ open, onClose, user, tricksCount = 0, isOwn = false }) {
  const [listed, setListed] = useState(false);
  const { level, isMax, rankTitle } = calculateSkaterLevel(tricksCount);

  if (!open || !user) return null;

  const handleListInStore = () => {
    if (!isMax) {
      toast.error("Reach Level 10 (100 tricks) to unlock and list your SLS Pro Card!");
      return;
    }
    setListed(true);
    toast.success("Card listed on the SOLRIDE Pro Shop for 250 DFQ hype! 🔥");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${user.username}'s Official SLS Pro Skater Card`,
        text: `Check out ${user.username}'s official SLS Pro Skater Card on SOLRIDE!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      toast.success("Profile & Card link copied!");
    }
  };

  const serialNumber = `SLS-${(user.username || 'SK8').slice(0, 4).toUpperCase()}-#${String(tricksCount).padStart(3, '0')}`;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <button aria-label="Close" className="absolute inset-0 bg-transparent" onClick={onClose} />
      
      <div 
        className="relative w-full max-w-sm rounded-3xl p-6 bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border border-neutral-800 shadow-[0_0_50px_rgba(0,0,0,0.9)] space-y-5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Holographic foil ambient sheen */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-gradient-to-br from-[#D2FF00]/20 via-[#FF3366]/20 to-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-gradient-to-tl from-[#D2FF00]/15 via-purple-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Modal Close Button */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#D2FF00]">
            <Sparkles size={14} /> Official SLS Collectible Card
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-neutral-900 text-neutral-400 hover:text-white flex items-center justify-center text-sm active:scale-90 transition-transform"
          >
            <X size={16} />
          </button>
        </div>

        {/* The Card Component */}
        <div className="relative rounded-2xl p-[3px] bg-gradient-to-tr from-[#D2FF00] via-yellow-300 via-pink-500 to-[#00D2FF] shadow-[0_0_25px_rgba(210,255,0,0.25)]">
          <div className="relative rounded-[14px] bg-[#09090b] p-5 space-y-4 overflow-hidden">
            
            {/* Card Header */}
            <div className="flex justify-between items-start border-b border-neutral-900 pb-3">
              <div>
                <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-neutral-500">SOLRIDE x SLS</span>
                <h3 className="text-lg font-black italic tracking-tighter text-white uppercase">PRO CARD</h3>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#D2FF00]/10 text-[#D2FF00] border border-[#D2FF00]/30">
                  {isMax ? 'LVL 10 PRO' : `LVL ${level}`}
                </span>
                <p className="text-[8px] font-mono text-neutral-500 mt-1">{serialNumber}</p>
              </div>
            </div>

            {/* Skater Photo & Foil Badge */}
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center group">
              {user.photo_url ? (
                <img src={user.photo_url} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-neutral-900 to-black flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-[#D2FF00]">{user.username?.[0]?.toUpperCase()}</span>
                  <span className="text-[9px] font-mono text-neutral-600 mt-1">NO PHOTO LOGGED</span>
                </div>
              )}
              
              {/* Foil Stamp */}
              <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-[#D2FF00]/40 text-[8px] font-black uppercase tracking-wider text-[#D2FF00] flex items-center gap-1 shadow-lg">
                <Award size={10} /> {rankTitle}
              </div>

              {/* Holographic Watermark */}
              <div className="absolute bottom-2 left-2 text-[9px] font-black tracking-widest text-white/50 uppercase italic pointer-events-none">
                SLS OFFICIAL CERTIFIED
              </div>
            </div>

            {/* Skater Info & Signature Trick */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-black tracking-tight text-white uppercase">@{user.username}</h4>
                  {user.full_name && <p className="text-xs text-neutral-400 font-medium">{user.full_name}</p>}
                </div>
                {user.fav_spot && (
                  <span className="text-[10px] text-neutral-400 font-bold flex items-center gap-1">
                    <MapPin size={10} className="text-[#D2FF00]" /> {user.fav_spot}
                  </span>
                )}
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-neutral-950/90 rounded-xl border border-neutral-900 text-center">
                <div>
                  <div className="text-xs font-black text-white">{tricksCount}</div>
                  <div className="text-[8px] font-bold uppercase tracking-wider text-neutral-500">Tricks</div>
                </div>
                <div>
                  <div className="text-xs font-black text-[#D2FF00]">{user.deck_company || 'Custom'}</div>
                  <div className="text-[8px] font-bold uppercase tracking-wider text-neutral-500">Deck</div>
                </div>
                <div>
                  <div className="text-xs font-black text-white">{user.fav_trick || 'Kickflip'}</div>
                  <div className="text-[8px] font-bold uppercase tracking-wider text-neutral-500">Sig. Move</div>
                </div>
              </div>

              {/* Digital Autograph Line */}
              <div className="pt-2 border-t border-neutral-900/80 flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-mono uppercase tracking-widest text-neutral-600">Digital Autograph</span>
                  <p className="font-serif italic text-sm text-[#D2FF00] tracking-wider select-none">
                    ~ {user.username} ~
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-neutral-600">Series</span>
                  <p className="text-[10px] font-black text-white">2026 EDITION</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Level Status & Actions */}
        <div className="space-y-3 pt-1">
          {isMax ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="text-[#D2FF00] flex items-center gap-1.5 font-black uppercase">
                  <Flame size={14} /> Level 10 Achieved!
                </span>
                <span className="text-[11px] text-neutral-400">100/100 Tricks</span>
              </div>
              
              {isOwn && (
                <button
                  onClick={handleListInStore}
                  disabled={listed}
                  className={`w-full h-11 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-95 ${
                    listed 
                      ? 'bg-neutral-900 border border-neutral-800 text-[#D2FF00]' 
                      : 'bg-[#D2FF00] text-black shadow-[0_0_20px_rgba(210,255,0,0.25)]'
                  }`}
                >
                  {listed ? <><Check size={14} /> Listed in Pro Shop</> : <><Store size={14} /> Place Card in Store (250 DFQ)</>}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 p-3 rounded-xl bg-neutral-950 border border-neutral-900">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                <span className="text-neutral-400 flex items-center gap-1">
                  <Lock size={12} className="text-[#FF3366]" /> Unlocks at LVL 10
                </span>
                <span className="text-[#D2FF00] font-mono">{tricksCount}/100 Tricks</span>
              </div>
              <p className="text-[10px] text-neutral-500 leading-relaxed">
                Log {100 - tricksCount} more clips to unlock your minted SLS Holographic Card and place it in the store for DFQ hype!
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="flex-1 h-10 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Share2 size={13} /> Share Card
            </button>
            <button
              onClick={onClose}
              className="px-5 h-10 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white text-xs font-bold uppercase tracking-wider active:scale-95 transition-transform"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
