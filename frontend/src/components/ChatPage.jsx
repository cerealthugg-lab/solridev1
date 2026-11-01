import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Send, Flag, Reply, X, ArrowLeft, ArrowDown, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const api = axios.create({ baseURL: `${BACKEND_URL}/api` });
api.interceptors.request.use(function (config) {
  var token = localStorage.getItem('token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

const POLL_MS = 4000;

function formatTime(iso) {
  var d = new Date(iso);
  var diffMin = Math.floor((new Date() - d) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return diffMin + 'm';
  if (diffMin < 1440) return Math.floor(diffMin / 60) + 'h';
  return d.toLocaleDateString();
}

// Same list? Then skip the re-render so the scroll position never jumps.
function sameList(a, b) {
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].content !== b[i].content) return false;
  }
  return true;
}

function ChatPage({ currentUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [ban, setBan] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const [navH, setNavH] = useState(0);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const atBottomRef = useRef(true);   // is the user reading the newest messages?
  const firstLoadRef = useRef(true);
  const prevLenRef = useRef(0);

  // Keep the chat exactly between the top of the screen and the bottom nav bar,
  // so the type box is always visible without scrolling the page.
  useLayoutEffect(function () {
    function measure() {
      var nav = document.querySelector('nav.fixed');
      setNavH(nav && nav.offsetParent !== null ? nav.offsetHeight : 0);
    }
    measure();
    window.addEventListener('resize', measure);
    return function () { window.removeEventListener('resize', measure); };
  }, []);

  const fetchMessages = async function () {
    try {
      var res = await api.get('/chat/messages');
      var next = res.data || [];
      setMessages(function (prev) { return sameList(prev, next) ? prev : next; });
    } catch (e) {}
  };

  const fetchBan = async function () {
    try {
      var res = await api.get('/chat/ban-status');
      setBan(res.data.banned ? res.data : null);
    } catch (e) {}
  };

  useEffect(function () {
    fetchMessages();
    fetchBan();
    var msgInterval = setInterval(function () { if (!document.hidden) fetchMessages(); }, POLL_MS);
    var banInterval = setInterval(fetchBan, 30000);
    return function () { clearInterval(msgInterval); clearInterval(banInterval); };
  }, []);

  const scrollToBottom = function (smooth) {
    var el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    atBottomRef.current = true;
    setUnseen(0);
  };

  const handleScroll = function () {
    var el = listRef.current;
    if (!el) return;
    var atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = atBottom;
    if (atBottom) setUnseen(0);
  };

  // Only follow new messages if the user was already at the bottom.
  // If they scrolled up to read, stay put and show a "new messages" pill instead.
  useLayoutEffect(function () {
    var added = messages.length - prevLenRef.current;
    prevLenRef.current = messages.length;
    if (!messages.length) return;
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      scrollToBottom(false);
      return;
    }
    if (atBottomRef.current) scrollToBottom(true);
    else if (added > 0) setUnseen(function (n) { return n + added; });
  }, [messages]);

  useEffect(function () {
    if (cooldown > 0) {
      var t = setTimeout(function () { setCooldown(cooldown - 1); }, 1000);
      return function () { clearTimeout(t); };
    }
  }, [cooldown]);

  const handleSend = async function () {
    if (sending || !input.trim()) return;
    if (cooldown > 0) return toast.error('Wait ' + cooldown + 's');
    if (ban) return toast.error('You are banned');

    setSending(true);
    try {
      await api.post('/chat/send', { content: input.trim(), reply_to: replyTo ? replyTo.id : null });
      setInput('');
      setReplyTo(null);
      setCooldown(10);
      if (inputRef.current) inputRef.current.style.height = 'auto';
      atBottomRef.current = true; // your own message always brings you down
      await fetchMessages();
    } catch (e) {
      var detail = e.response && e.response.data && e.response.data.detail;
      if (detail && detail.type === 'cooldown') {
        setCooldown(detail.wait_seconds);
        toast.error('Wait ' + detail.wait_seconds + 's');
      } else if (detail && detail.type === 'profanity') {
        toast.error(detail.banned_until
          ? 'Banned until ' + new Date(detail.banned_until).toLocaleString()
          : 'Warning: strike ' + detail.strikes + '/5');
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

  const handleReport = async function (msg) {
    if (!window.confirm('Report this message?')) return;
    try {
      await api.post('/chat/report', { message_id: msg.id, reason: 'inappropriate' });
      toast.success('Reported');
    } catch (e) {
      toast.error('Already reported');
    }
  };

  const startReply = function (msg) {
    setReplyTo(msg);
    if (inputRef.current) inputRef.current.focus();
  };

  const locked = !!ban || cooldown > 0;

  return (
    <div
      data-testid="chat-page"
      className="fixed top-0 left-0 right-0 lg:left-64 z-40 mx-auto max-w-md lg:max-w-none flex flex-col bg-[#09090b] text-neutral-100 font-sans antialiased selection:bg-[#D2FF00] selection:text-black"
      style={{ bottom: navH }}
    >
      {/* Header */}
      <div
        className="shrink-0 border-b border-neutral-900 bg-[#09090b]/90 backdrop-blur-xl px-3 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        {/* room for the "riders online" badge that floats at the top on phones */}
        <div className="h-6 lg:hidden" />
        <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/" data-testid="chat-back-button" aria-label="Back"
            className="w-10 h-10 shrink-0 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <p className="text-lg font-black tracking-tight text-white leading-tight">Global chat</p>
            <p className="text-xs text-neutral-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D2FF00] animate-pulse" /> Live - 10s cooldown
            </p>
          </div>
        </div>
        <span data-testid="chat-message-count" className="shrink-0 text-[11px] font-semibold px-2.5 h-7 inline-flex items-center rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400">
          {messages.length} msgs
        </span>
        </div>
      </div>

      {ban && (
        <div data-testid="chat-ban-banner" className="shrink-0 bg-[#FF3366]/10 border-b border-[#FF3366]/30 px-4 py-3 flex items-center gap-3">
          <Ban size={18} className="text-[#FF3366] shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#FF3366]">Muted - strike {ban.strike_count}/5</p>
            <p className="text-xs text-neutral-500">Ends {new Date(ban.banned_until).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Messages - the only part that scrolls */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={listRef}
          onScroll={handleScroll}
          data-testid="chat-message-list"
          className="h-full overflow-y-auto overscroll-contain px-4 py-4 space-y-4"
        >
          {messages.length === 0 && (
            <p className="text-center text-neutral-600 text-sm mt-12">No messages yet. Be the first.</p>
          )}

          {messages.map(function (msg) {
            var isMine = !!currentUser && (
              msg.username === currentUser.username ||
              msg.user_id === currentUser.id ||
              msg.user_id === currentUser.username
            );
            return (
              <div key={msg.id} data-testid={`chat-message-${msg.id}`} className={'flex flex-col w-full ' + (isMine ? 'items-end' : 'items-start')}>
                <div className="max-w-[80%] min-w-0">
                  {!isMine && (
                    <div className="flex items-baseline gap-2 mb-1 px-1">
                      <Link to={'/skater/' + msg.username} className="text-xs font-semibold text-neutral-300 hover:text-[#D2FF00]">@{msg.username}</Link>
                      <span className="text-[10px] text-neutral-600">{formatTime(msg.created_at)}</span>
                    </div>
                  )}

                  {msg.reply_to_username && (
                    <div className={'text-xs text-neutral-500 border-l-2 pl-2 mb-1 truncate ' + (isMine ? 'border-[#D2FF00]/40' : 'border-neutral-700')}>
                      @{msg.reply_to_username}: {msg.reply_to_content}
                    </div>
                  )}

                  <div className={'px-4 py-2.5 text-[15px] break-words leading-relaxed rounded-2xl ' +
                    (isMine ? 'bg-[#D2FF00] text-black font-medium rounded-tr-md' : 'bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-tl-md')}>
                    {msg.content}
                  </div>

                  {isMine ? (
                    <div className="text-right px-1 mt-1"><span className="text-[10px] text-neutral-600">{formatTime(msg.created_at)}</span></div>
                  ) : (
                    <div className="flex gap-1 mt-1">
                      <button onClick={function () { startReply(msg); }} data-testid={`chat-reply-${msg.id}`}
                        className="h-8 px-2 rounded-full text-[11px] font-semibold text-neutral-500 hover:text-[#D2FF00] flex items-center gap-1 transition-colors">
                        <Reply size={12} /> Reply
                      </button>
                      <button onClick={function () { handleReport(msg); }} data-testid={`chat-report-${msg.id}`}
                        className="h-8 px-2 rounded-full text-[11px] font-semibold text-neutral-500 hover:text-[#FF3366] flex items-center gap-1 transition-colors">
                        <Flag size={12} /> Report
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Shown when you scrolled up and new messages arrived */}
        {unseen > 0 && (
          <button
            onClick={function () { scrollToBottom(true); }}
            data-testid="chat-new-messages-button"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 h-9 px-4 rounded-full bg-[#D2FF00] text-black text-xs font-semibold flex items-center gap-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] active:scale-95 transition-transform"
          >
            <ArrowDown size={14} /> {unseen} new {unseen === 1 ? 'message' : 'messages'}
          </button>
        )}
      </div>

      {/* Type box - always visible */}
      <div
        className="shrink-0 border-t border-neutral-900 bg-[#09090b] px-3 pt-3"
        style={{ paddingBottom: navH ? 12 : 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        {replyTo && (
          <div data-testid="chat-reply-bar" className="mb-2 rounded-xl bg-neutral-900 border border-neutral-800 pl-3 pr-1 py-1.5 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-[#D2FF00]">Replying to @{replyTo.username}</span>
              <p className="text-xs text-neutral-500 truncate">{replyTo.content}</p>
            </div>
            <button onClick={function () { setReplyTo(null); }} data-testid="chat-reply-cancel" aria-label="Cancel reply"
              className="w-9 h-9 shrink-0 rounded-full text-neutral-500 hover:text-white flex items-center justify-center">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={function (e) { setInput(e.target.value); }}
            onKeyDown={function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            onInput={function (e) {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
            disabled={locked}
            placeholder={ban ? 'You are muted' : cooldown > 0 ? 'Wait ' + cooldown + 's...' : 'Drop a message...'}
            maxLength={500}
            rows={1}
            data-testid="chat-input"
            className="flex-1 min-h-[44px] max-h-32 bg-neutral-900/80 text-white border border-neutral-800 rounded-3xl px-4 py-2.5 text-base leading-snug focus:outline-none focus:border-[#D2FF00]/50 disabled:opacity-50 transition-colors resize-none overflow-y-auto placeholder:text-neutral-600"
          />
          <button
            onClick={handleSend}
            disabled={locked || !input.trim() || sending}
            data-testid="chat-send-button"
            aria-label="Send"
            className="w-11 h-11 shrink-0 rounded-full bg-[#D2FF00] text-black hover:bg-[#c2eb00] disabled:bg-neutral-800 disabled:text-neutral-600 flex items-center justify-center active:scale-95 transition-all"
          >
            {cooldown > 0 ? <span className="text-xs font-semibold">{cooldown}</span> : <Send size={16} className={sending ? 'animate-pulse' : ''} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;