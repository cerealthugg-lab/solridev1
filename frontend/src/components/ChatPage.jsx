import React, { useState, useEffect, useRef, useContext, createContext } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Send, Flag, Reply, X, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const api = axios.create({ baseURL: `${BACKEND_URL}/api` });
api.interceptors.request.use(function (config) {
  var token = localStorage.getItem('token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

function formatTime(iso) {
  var d = new Date(iso);
  var now = new Date();
  var diffMs = now - d;
  var diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return diffMin + 'm';
  if (diffMin < 1440) return Math.floor(diffMin / 60) + 'h';
  return d.toLocaleDateString();
}

function ChatPage(props) {
  var currentUser = props.currentUser;
  var msgState = useState([]);
  var messages = msgState[0];
  var setMessages = msgState[1];
  var inputState = useState('');
  var input = inputState[0];
  var setInput = inputState[1];
  var cooldownState = useState(0);
  var cooldown = cooldownState[0];
  var setCooldown = cooldownState[1];
  var banState = useState(null);
  var ban = banState[0];
  var setBan = banState[1];
  var replyState = useState(null);
  var replyTo = replyState[0];
  var setReplyTo = replyState[1];
  var sendingState = useState(false);
  var sending = sendingState[0];
  var setSending = sendingState[1];
  var listRef = useRef(null);

  var fetchMessages = async function () {
    try {
      var res = await api.get('/chat/messages');
      setMessages(res.data);
    } catch (e) {}
  };

  var fetchBan = async function () {
    try {
      var res = await api.get('/chat/ban-status');
      if (res.data.banned) setBan(res.data);
      else setBan(null);
    } catch (e) {}
  };

  useEffect(function () {
    fetchMessages();
    fetchBan();
    var msgInterval = setInterval(fetchMessages, 3000);
    var banInterval = setInterval(fetchBan, 30000);
    return function () {
      clearInterval(msgInterval);
      clearInterval(banInterval);
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(function () {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Cooldown timer
  useEffect(function () {
    if (cooldown > 0) {
      var t = setTimeout(function () { setCooldown(cooldown - 1); }, 1000);
      return function () { clearTimeout(t); };
    }
  }, [cooldown]);

  var handleSend = async function () {
    if (sending) return;
    if (!input.trim()) return;
    if (cooldown > 0) return toast.error('Wait ' + cooldown + 's');
    if (ban) return toast.error('You are banned');

    setSending(true);
    try {
      await api.post('/chat/send', {
        content: input.trim(),
        reply_to: replyTo ? replyTo.id : null
      });
      setInput('');
      setReplyTo(null);
      setCooldown(10);
      fetchMessages();
    } catch (e) {
      var detail = e.response && e.response.data && e.response.data.detail;
      if (detail && detail.type === 'cooldown') {
        setCooldown(detail.wait_seconds);
        toast.error('Wait ' + detail.wait_seconds + 's');
      } else if (detail && detail.type === 'profanity') {
        var banMsg = detail.banned_until
          ? 'BANNED until ' + new Date(detail.banned_until).toLocaleString()
          : 'WARNING: Strike ' + detail.strikes + '/5';
        toast.error(banMsg);
        fetchBan();
      } else if (detail && detail.type === 'banned') {
        toast.error('You are banned');
        fetchBan();
      } else {
        toast.error(typeof detail === 'string' ? detail : 'Send failed');
      }
    } finally {
      setSending(false);
    }
  };

  var handleReport = async function (msg) {
    if (!window.confirm('Report this message?')) return;
    try {
      await api.post('/chat/report', { message_id: msg.id, reason: 'inappropriate' });
      toast.success('Reported');
    } catch (e) {
      toast.error('Already reported');
    }
  };

  return (
    /* FIXED VIEWPORT FRAME: Completely locks the window height to prevent the input from shifting out of frame */
    <div className="h-screen w-full bg-black text-zinc-100 flex flex-col font-sans antialiased overflow-hidden selection:bg-[#D2FF00] selection:text-black">
      
      {/* 1. FIXED TOP HEADER BAR - Never Moves */}
      <div className="border-b border-zinc-900 bg-black p-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center justify-center text-zinc-500 hover:text-white transition-colors animate-none" style={{ minWidth: '44px', minHeight: '44px' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="font-black uppercase tracking-widest text-sm text-white">Global Chat</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
              Be kind • 10s cooldown
            </p>
          </div>
        </div>
        <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono px-2 py-0.5 rounded uppercase tracking-wider">
          {messages.length} msgs
        </span>
      </div>

      {/* FIXED BAN TICKER - Stays pinned under header if restricted */}
      {ban && (
        <div className="bg-[#FF3366]/10 border-b border-[#FF3366]/30 p-3 text-center shrink-0">
          <p className="text-[#FF3366] text-xs font-black uppercase tracking-widest">
            🚫 LINK MUTED · STRIKE {ban.strike_count}/5
          </p>
          <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
            Lifting: {new Date(ban.banned_until).toLocaleString()}
          </p>
        </div>
      )}

      {/* 2. DYNAMIC SCROLLING TRACK - The only section that slides up/down */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar bg-black">
        {messages.length === 0 && (
          <p className="text-center text-zinc-700 text-xs uppercase tracking-widest font-bold mt-12">
            No messages yet · Be the first
          </p>
        )}
          
        {messages.map(function (msg) {
          // FIXED AUTH LOGIC: Multi-property validation checking to verify ownership correctly
          var isMine = false;
          if (currentUser) {
            isMine = msg.username === currentUser.username || 
                     msg.user_id === currentUser.id || 
                     msg.user_id === currentUser.username;
          }
          
          return (
            <div key={msg.id} className={'flex flex-col ' + (isMine ? 'items-end' : 'items-start') + ' w-full animate-in fade-in duration-100'}>
              <div className="max-w-[80%]">
                
                {/* Username Header Stamp */}
                {!isMine && (
                  <div className="flex items-baseline gap-2 mb-1 px-1">
                    <span className="text-[10px] uppercase tracking-wider font-black text-zinc-400">
                      @{msg.username}
                    </span>
                    <span className="text-[8px] text-zinc-600 font-mono">{formatTime(msg.created_at)}</span>
                  </div>
                )}

                {/* Subdued Inline Reply Bubble Link */}
                {msg.reply_to_username && (
                  <div className={'text-[10px] text-zinc-500 border-l border-zinc-800 pl-2 mb-1 italic truncate max-w-xs ' + (isMine ? 'text-right border-[#D2FF00]/40' : '')}>
                    ↪ @{msg.reply_to_username}: {msg.reply_to_content}
                  </div>
                )}

                {/* Message Body Block - Your texts instantly highlight neon green! */}
                <div className={
                  'px-4 py-2.5 text-sm break-words leading-relaxed shadow-sm rounded-2xl ' +
                  (isMine
                    ? 'bg-[#D2FF00] text-black font-semibold rounded-tr-sm'
                    : 'bg-zinc-900 text-zinc-100 rounded-tl-sm')
                }>
                  {msg.content}
                </div>

                {/* Sender Self Time Tag */}
                {isMine && (
                  <div className="text-right px-1 mt-1">
                    <span className="text-[8px] text-zinc-600 font-mono">{formatTime(msg.created_at)}</span>
                  </div>
                )}

                {/* Timeline Interaction Triggers */}
                {!isMine && (
                  <div className="flex gap-4 mt-1 px-1 opacity-50 hover:opacity-100 transition-opacity">
                    <button
                      onClick={function () { setReplyTo(msg); }}
                      className="text-[9px] text-zinc-500 hover:text-[#D2FF00] uppercase tracking-widest flex items-center gap-1 h-6"
                    >
                      <Reply size={9} /> Reply
                    </button>
                    <button
                      onClick={function () { handleReport(msg); }}
                      className="text-[9px] text-zinc-500 hover:text-[#FF3366] uppercase tracking-widest flex items-center gap-1 h-6"
                    >
                      <Flag size={9} /> Report
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. FIXED INTERACTIVE FOOTER WRAPPER - Stays completely locked to the bottom wire */}
      <div className="border-t border-zinc-900 p-3 bg-black shrink-0 pb-6 z-20">
        
        {/* Reply Context Bar Anchor */}
        {replyTo && (
          <div className="bg-zinc-900 border border-zinc-800 border-b-0 rounded-t-2xl px-3 py-2 flex items-center justify-between text-xs animate-in slide-in-from-bottom-2 duration-100">
            <div className="flex-1 truncate pr-3">
              <span className="text-[#D2FF00] uppercase tracking-widest text-[9px] font-black">Replying to @{replyTo.username}</span>
              <p className="text-zinc-500 truncate text-[11px] mt-0.5">"{replyTo.content}"</p>
            </div>
            <button 
              onClick={function () { setReplyTo(null); }} 
              className="text-zinc-500 hover:text-white p-1"
              style={{ minWidth: '32px', minHeight: '32px', display: 'flex', alignItems: 'center', justify: 'center' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Dynamic Typing Capsule Layout */}
        <div className={'flex gap-2 items-center ' + (replyTo ? 'bg-zinc-900 rounded-b-2xl border-x border-b border-zinc-800 p-2 pt-0' : '')}>
          <textarea
            value={input}
            onChange={function (e) { setInput(e.target.value); }}
            onKeyDown={function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={ban || cooldown > 0}
            placeholder={
              ban ? 'You are banned' :
              cooldown > 0 ? 'Wait ' + cooldown + 's...' :
              'Drop a message...'
            }
            maxLength={500}
            rows={1}
            className="flex-1 bg-zinc-900 text-white border border-transparent rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#D2FF00]/40 disabled:opacity-50 transition-colors resize-none leading-relaxed max-h-32 overflow-y-auto"
            onInput={function (e) {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
          />

          <Button
            onClick={handleSend}
            disabled={ban || cooldown > 0 || !input.trim() || sending}
            className="bg-[#D2FF00] text-black hover:bg-[#c2eb00] h-11 w-11 p-0 rounded-full disabled:opacity-20 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all shrink-0 flex items-center justify-center active:scale-95"
          >
            <Send size={15} className={sending ? "animate-pulse" : ""} />
          </Button>
        </div>
        
        {/* Core System Compliance Feedback Sub-Ticker */}
        <p className="text-[9px] text-zinc-700 mt-2 text-center uppercase tracking-[0.2em] font-mono select-none">
          Be respectful · auto-filter active
        </p>
      </div>

    </div>
  );


export default ChatPage;

