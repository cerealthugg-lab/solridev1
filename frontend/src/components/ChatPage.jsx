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
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 p-4 flex items-center justify-between sticky top-0 bg-black z-20">
        <div className="flex items-center gap-3">
          <Link to="/">
            <ArrowLeft className="text-zinc-500 hover:text-white" />
          </Link>
          <div>
            <p className="font-black uppercase tracking-widest text-sm">Global Chat</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Be kind • 10s cooldown
            </p>
          </div>
        </div>
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
          {messages.length} msgs
        </span>
      </div>

      {/* Ban banner */}
      {ban && (
        <div className="bg-[#FF3366]/20 border-b border-[#FF3366] p-3 text-center">
          <p className="text-[#FF3366] text-xs font-black uppercase tracking-widest">
            🚫 Banned · Strike {ban.strike_count}/5
          </p>
          <p className="text-[10px] text-zinc-400 mt-1">
            Until {new Date(ban.banned_until).toLocaleString()}
          </p>
          <p className="text-[10px] text-zinc-500 mt-1 italic">Reason: {ban.reason}</p>
        </div>
      )}

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-zinc-600 text-xs uppercase tracking-widest mt-12">
            No messages yet · Be the first
          </p>
        )}
          
          
   {messages.map(function (msg) {
  var isMine = msg.user_id === (currentUser && currentUser.id);
  return (
    <div key={msg.id} className={'flex flex-col ' + (isMine ? 'items-end' : 'items-start')}>
      <div className="max-w-[78%]">
        {!isMine && (
          <div className="flex items-baseline gap-2 mb-1 px-2">
            <span className="text-[10px] uppercase tracking-[0.15em] font-black text-zinc-400">
              {msg.username}
            </span>
            <span className="text-[9px] text-zinc-600">{formatTime(msg.created_at)}</span>
          </div>
        )}

        {msg.reply_to_username && (
          <div className={
            'text-[10px] text-zinc-500 border-l-2 pl-2 mb-1 italic ' +
            (isMine ? 'border-[#D2FF00]/40 text-right' : 'border-zinc-700')
          }>
            ↪ {msg.reply_to_username}: {msg.reply_to_content}
          </div>
        )}

        <div className={
          'px-4 py-2.5 text-sm break-words leading-relaxed shadow-sm ' +
          (isMine
            ? 'bg-[#D2FF00] text-black rounded-3xl rounded-br-md'
            : 'bg-zinc-900 text-white rounded-3xl rounded-bl-md')
        }>
          {msg.content}
        </div>

        {isMine && (
          <span className="text-[9px] text-zinc-600 mt-1 px-2 self-end">
            {formatTime(msg.created_at)}
          </span>
        )}

        {!isMine && (
          <div className="flex gap-3 mt-1.5 px-2">
            <button
              onClick={function () { setReplyTo(msg); }}
              className="text-[10px] text-zinc-600 hover:text-[#D2FF00] uppercase tracking-widest flex items-center gap-1 transition-colors"
            >
              <Reply size={10} /> Reply
            </button>
            <button
              onClick={function () { handleReport(msg); }}
              className="text-[10px] text-zinc-600 hover:text-[#FF3366] uppercase tracking-widest flex items-center gap-1 transition-colors"
            >
              <Flag size={10} /> Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
})}
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="bg-zinc-900 border-t border-zinc-800 p-2 flex items-center justify-between">
          <div className="flex-1 text-xs">
            <span className="text-[#D2FF00] uppercase tracking-widest text-[10px]">Replying to {replyTo.username}</span>
            <p className="text-zinc-500 truncate">{replyTo.content}</p>
          </div>
          <button onClick={function () { setReplyTo(null); }}>
            <X size={16} className="text-zinc-500 hover:text-white" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-zinc-900 p-3 bg-black sticky bottom-0">
  <div className="flex gap-2 items-center">
    <input
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
      className="flex-1 bg-zinc-900 text-white border border-transparent rounded-full px-4 h-11 text-sm focus:outline-none focus:border-[#D2FF00]/50 disabled:opacity-50 transition-colors"
    />
    <Button
      onClick={handleSend}
      disabled={ban || cooldown > 0 || !input.trim() || sending}
      className="bg-[#D2FF00] text-black hover:bg-[#c2eb00] h-11 w-11 p-0 rounded-full disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
    >
      <Send size={16} />
    </Button>
  </div>
  <p className="text-[9px] text-zinc-700 mt-2 text-center uppercase tracking-[0.2em]">
    Be respectful · auto-filter active
  </p>
</div>
    </div>
  );
}

export default ChatPage;