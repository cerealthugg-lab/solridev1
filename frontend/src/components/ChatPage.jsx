
Action: view_file({"path":"/tmp/out/ChatPage.jsx"})
Observation: [Showing lines 1-340 of 340 total] /tmp/out/ChatPage.jsx:
1|import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
2|import axios from 'axios';
3|import { toast } from 'sonner';
4|import { Send, Flag, Reply, X, ArrowLeft, ArrowDown, Ban } from 'lucide-react';
5|import { Link } from 'react-router-dom';
6|
7|const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
8|const api = axios.create({ baseURL: `${BACKEND_URL}/api` });
9|api.interceptors.request.use(function (config) {
10|  var token = localStorage.getItem('token');
11|  if (token) config.headers.Authorization = 'Bearer ' + token;
12|  return config;
13|});
14|
15|const POLL_MS = 4000;
16|
17|function formatTime(iso) {
18|  var d = new Date(iso);
19|  var diffMin = Math.floor((new Date() - d) / 60000);
20|  if (diffMin < 1) return 'just now';
21|  if (diffMin < 60) return diffMin + 'm';
22|  if (diffMin < 1440) return Math.floor(diffMin / 60) + 'h';
23|  return d.toLocaleDateString();
24|}
25|
26|// Same list? Then skip the re-render so the scroll position never jumps.
27|function sameList(a, b) {
28|  if (a.length !== b.length) return false;
29|  for (var i = 0; i < a.length; i++) {
30|    if (a[i].id !== b[i].id || a[i].content !== b[i].content) return false;
31|  }
32|  return true;
33|}
34|
35|function ChatPage({ currentUser }) {
36|  const [messages, setMessages] = useState([]);
37|  const [input, setInput] = useState('');
38|  const [cooldown, setCooldown] = useState(0);
39|  const [ban, setBan] = useState(null);
40|  const [replyTo, setReplyTo] = useState(null);
41|  const [sending, setSending] = useState(false);
42|  const [unseen, setUnseen] = useState(0);
43|  const [navH, setNavH] = useState(0);
44|
45|  const listRef = useRef(null);
46|  const inputRef = useRef(null);
47|  const atBottomRef = useRef(true);   // is the user reading the newest messages?
48|  const firstLoadRef = useRef(true);
49|  const prevLenRef = useRef(0);
50|
51|  // Keep the chat exactly between the top of the screen and the bottom nav bar,
52|  // so the type box is always visible without scrolling the page.
53|  useLayoutEffect(function () {
54|    function measure() {
55|      var nav = document.querySelector('nav.fixed');
56|      setNavH(nav && nav.offsetParent !== null ? nav.offsetHeight : 0);
57|    }
58|    measure();
59|    window.addEventListener('resize', measure);
60|    return function () { window.removeEventListener('resize', measure); };
61|  }, []);
62|
63|  const fetchMessages = async function () {
64|    try {
65|      var res = await api.get('/chat/messages');
66|      var next = res.data || [];
67|      setMessages(function (prev) { return sameList(prev, next) ? prev : next; });
68|    } catch (e) {}
69|  };
70|
71|  const fetchBan = async function () {
72|    try {
73|      var res = await api.get('/chat/ban-status');
74|      setBan(res.data.banned ? res.data : null);
75|    } catch (e) {}
76|  };
77|
78|  useEffect(function () {
79|    fetchMessages();
80|    fetchBan();
81|    var msgInterval = setInterval(function () { if (!document.hidden) fetchMessages(); }, POLL_MS);
82|    var banInterval = setInterval(fetchBan, 30000);
83|    return function () { clearInterval(msgInterval); clearInterval(banInterval); };
84|  }, []);
85|
86|  const scrollToBottom = function (smooth) {
87|    var el = listRef.current;
88|    if (!el) return;
89|    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
90|    atBottomRef.current = true;
91|    setUnseen(0);
92|  };
93|
94|  const handleScroll = function () {
95|    var el = listRef.current;
96|    if (!el) return;
97|    var atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
98|    atBottomRef.current = atBottom;
99|    if (atBottom) setUnseen(0);
100|  };
101|
102|  // Only follow new messages if the user was already at the bottom.
103|  // If they scrolled up to read, stay put and show a "new messages" pill instead.
104|  useLayoutEffect(function () {
105|    var added = messages.length - prevLenRef.current;
106|    prevLenRef.current = messages.length;
107|    if (!messages.length) return;
108|    if (firstLoadRef.current) {
109|      firstLoadRef.current = false;
110|      scrollToBottom(false);
111|      return;
112|    }
113|    if (atBottomRef.current) scrollToBottom(true);
114|    else if (added > 0) setUnseen(function (n) { return n + added; });
115|  }, [messages]);
116|
117|  useEffect(function () {
118|    if (cooldown > 0) {
119|      var t = setTimeout(function () { setCooldown(cooldown - 1); }, 1000);
120|      return function () { clearTimeout(t); };
121|    }
122|  }, [cooldown]);
123|
124|  const handleSend = async function () {
125|    if (sending || !input.trim()) return;
126|    if (cooldown > 0) return toast.error('Wait ' + cooldown + 's');
127|    if (ban) return toast.error('You are banned');
128|
129|    setSending(true);
130|    try {
131|      await api.post('/chat/send', { content: input.trim(), reply_to: replyTo ? replyTo.id : null });
132|      setInput('');
133|      setReplyTo(null);
134|      setCooldown(10);
135|      if (inputRef.current) inputRef.current.style.height = 'auto';
136|      atBottomRef.current = true; // your own message always brings you down
137|      await fetchMessages();
138|    } catch (e) {
139|      var detail = e.response && e.response.data && e.response.data.detail;
140|      if (detail && detail.type === 'cooldown') {
141|        setCooldown(detail.wait_seconds);
142|        toast.error('Wait ' + detail.wait_seconds + 's');
143|      } else if (detail && detail.type === 'profanity') {
144|        toast.error(detail.banned_until
145|          ? 'Banned until ' + new Date(detail.banned_until).toLocaleString()
146|          : 'Warning: strike ' + detail.strikes + '/5');
147|        fetchBan();
148|      } else if (detail && detail.type === 'banned') {
149|        toast.error('You are banned');
150|        fetchBan();
151|      } else {
152|        toast.error(typeof detail === 'string' ? detail : 'Send failed');
153|      }
154|    } finally {
155|      setSending(false);
156|    }
157|  };
158|
159|  const handleReport = async function (msg) {
160|    if (!window.confirm('Report this message?')) return;
161|    try {
162|      await api.post('/chat/report', { message_id: msg.id, reason: 'inappropriate' });
163|      toast.success('Reported');
164|    } catch (e) {
165|      toast.error('Already reported');
166|    }
167|  };
168|
169|  const startReply = function (msg) {
170|    setReplyTo(msg);
171|    if (inputRef.current) inputRef.current.focus();
172|  };
173|
174|  const locked = !!ban || cooldown > 0;
175|
176|  return (
177|    <div
178|      data-testid="chat-page"
179|      className="fixed top-0 left-0 right-0 lg:left-64 z-40 mx-auto max-w-md lg:max-w-none flex flex-col bg-[#09090b] text-neutral-100 font-sans antialiased selection:bg-[#D2FF00] selection:text-black"
180|      style={{ bottom: navH }}
181|    >
182|      {/* Header */}
183|      <div
184|        className="shrink-0 border-b border-neutral-900 bg-[#09090b]/90 backdrop-blur-xl px-3 pb-3"
185|        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
186|      >
187|        {/* room for the "riders online" badge that floats at the top on phones */}
188|        <div className="h-6 lg:hidden" />
189|        <div className="flex items-center justify-between gap-3">
190|        <div className="flex items-center gap-2 min-w-0">
191|          <Link to="/" data-testid="chat-back-button" aria-label="Back"
192|            className="w-10 h-10 shrink-0 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors">
193|            <ArrowLeft size={18} />
194|          </Link>
195|          <div className="min-w-0">
196|            <p className="text-lg font-black tracking-tight text-white leading-tight">Global chat</p>
197|            <p className="text-xs text-neutral-500 flex items-center gap-1.5">
198|              <span className="w-1.5 h-1.5 rounded-full bg-[#D2FF00] animate-pulse" /> Live · 10s cooldown
199|            </p>
200|          </div>
201|        </div>
202|        <span data-testid="chat-message-count" className="shrink-0 text-[11px] font-semibold px-2.5 h-7 inline-flex items-center rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400">
203|          {messages.length} msgs
204|        </span>
205|        </div>
206|      </div>
207|
208|      {ban && (
209|        <div data-testid="chat-ban-banner" className="shrink-0 bg-[#FF3366]/10 border-b border-[#FF3366]/30 px-4 py-3 flex items-center gap-3">
210|          <Ban size={18} className="text-[#FF3366] shrink-0" />
211|          <div className="min-w-0">
212|            <p className="text-sm font-semibold text-[#FF3366]">Muted · strike {ban.strike_count}/5</p>
213|            <p className="text-xs text-neutral-500">Ends {new Date(ban.banned_until).toLocaleString()}</p>
214|          </div>
215|        </div>
216|      )}
217|
218|      {/* Messages — the only part that scrolls */}
219|      <div className="relative flex-1 min-h-0">
220|        <div
221|          ref={listRef}
222|          onScroll={handleScroll}
223|          data-testid="chat-message-list"
224|          className="h-full overflow-y-auto overscroll-contain px-4 py-4 space-y-4"
225|        >
226|          {messages.length === 0 && (
227|            <p className="text-center text-neutral-600 text-sm mt-12">No messages yet. Be the first.</p>
228|          )}
229|
230|          {messages.map(function (msg) {
231|            var isMine = !!currentUser && (
232|              msg.username === currentUser.username ||
233|              msg.user_id === currentUser.id ||
234|              msg.user_id === currentUser.username
235|            );
236|            return (
237|              <div key={msg.id} data-testid={`chat-message-${msg.id}`} className={'flex flex-col w-full ' + (isMine ? 'items-end' : 'items-start')}>
238|                <div className="max-w-[80%] min-w-0">
239|                  {!isMine && (
240|                    <div className="flex items-baseline gap-2 mb-1 px-1">
241|                      <Link to={'/skater/' + msg.username} className="text-xs font-semibold text-neutral-300 hover:text-[#D2FF00]">@{msg.username}</Link>
242|                      <span className="text-[10px] text-neutral-600">{formatTime(msg.created_at)}</span>
243|                    </div>
244|                  )}
245|
246|                  {msg.reply_to_username && (
247|                    <div className={'text-xs text-neutral-500 border-l-2 pl-2 mb-1 truncate ' + (isMine ? 'border-[#D2FF00]/40' : 'border-neutral-700')}>
248|                      @{msg.reply_to_username}: {msg.reply_to_content}
249|                    </div>
250|                  )}
251|
252|                  <div className={'px-4 py-2.5 text-[15px] break-words leading-relaxed rounded-2xl ' +
253|                    (isMine ? 'bg-[#D2FF00] text-black font-medium rounded-tr-md' : 'bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-tl-md')}>
254|                    {msg.content}
255|                  </div>
256|
257|                  {isMine ? (
258|                    <div className="text-right px-1 mt-1"><span className="text-[10px] text-neutral-600">{formatTime(msg.created_at)}</span></div>
259|                  ) : (
260|                    <div className="flex gap-1 mt-1">
261|                      <button onClick={function () { startReply(msg); }} data-testid={`chat-reply-${msg.id}`}
262|                        className="h-8 px-2 rounded-full text-[11px] font-semibold text-neutral-500 hover:text-[#D2FF00] flex items-center gap-1 transition-colors">
263|                        <Reply size={12} /> Reply
264|                      </button>
265|                      <button onClick={function () { handleReport(msg); }} data-testid={`chat-report-${msg.id}`}
266|                        className="h-8 px-2 rounded-full text-[11px] font-semibold text-neutral-500 hover:text-[#FF3366] flex items-center gap-1 transition-colors">
267|                        <Flag size={12} /> Report
268|                      </button>
269|                    </div>
270|                  )}
271|                </div>
272|              </div>
273|            );
274|          })}
275|        </div>
276|
277|        {/* Shown when you scrolled up and new messages arrived */}
278|        {unseen > 0 && (
279|          <button
280|            onClick={function () { scrollToBottom(true); }}
281|            data-testid="chat-new-messages-button"
282|            className="absolute bottom-3 left-1/2 -translate-x-1/2 h-9 px-4 rounded-full bg-[#D2FF00] text-black text-xs font-semibold flex items-center gap-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] active:scale-95 transition-transform"
283|          >
284|            <ArrowDown size={14} /> {unseen} new {unseen === 1 ? 'message' : 'messages'}
285|          </button>
286|        )}
287|      </div>
288|
289|      {/* Type box — always visible */}
290|      <div
291|        className="shrink-0 border-t border-neutral-900 bg-[#09090b] px-3 pt-3"
292|        style={{ paddingBottom: navH ? 12 : 'calc(env(safe-area-inset-bottom) + 12px)' }}
293|      >
294|        {replyTo && (
295|          <div data-testid="chat-reply-bar" className="mb-2 rounded-xl bg-neutral-900 border border-neutral-800 pl-3 pr-1 py-1.5 flex items-center gap-2">
296|            <div className="flex-1 min-w-0">
297|              <span className="text-[11px] font-semibold text-[#D2FF00]">Replying to @{replyTo.username}</span>
298|              <p className="text-xs text-neutral-500 truncate">{replyTo.content}</p>
299|            </div>
300|            <button onClick={function () { setReplyTo(null); }} data-testid="chat-reply-cancel" aria-label="Cancel reply"
301|              className="w-9 h-9 shrink-0 rounded-full text-neutral-500 hover:text-white flex items-center justify-center">
302|              <X size={16} />
303|            </button>
304|          </div>
305|        )}
306|
307|        <div className="flex gap-2 items-end">
308|          <textarea
309|            ref={inputRef}
310|            value={input}
311|            onChange={function (e) { setInput(e.target.value); }}
312|            onKeyDown={function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
313|            onInput={function (e) {
314|              e.target.style.height = 'auto';
315|              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
316|            }}
317|            disabled={locked}
318|            placeholder={ban ? 'You are muted' : cooldown > 0 ? 'Wait ' + cooldown + 's...' : 'Drop a message...'}
319|            maxLength={500}
320|            rows={1}
321|            data-testid="chat-input"
322|            className="flex-1 min-h-[44px] max-h-32 bg-neutral-900/80 text-white border border-neutral-800 rounded-3xl px-4 py-2.5 text-base leading-snug focus:outline-none focus:border-[#D2FF00]/50 disabled:opacity-50 transition-colors resize-none overflow-y-auto placeholder:text-neutral-600"
323|          />
324|          <button
325|            onClick={handleSend}
326|            disabled={locked || !input.trim() || sending}
327|            data-testid="chat-send-button"
328|            aria-label="Send"
329|            className="w-11 h-11 shrink-0 rounded-full bg-[#D2FF00] text-black hover:bg-[#c2eb00] disabled:bg-neutral-800 disabled:text-neutral-600 flex items-center justify-center active:scale-95 transition-all"
330|          >
331|            {cooldown > 0 ? <span className="text-xs font-semibold">{cooldown}</span> : <Send size={16} className={sending ? 'animate-pulse' : ''} />}
332|          </button>
333|        </div>
334|      </div>
335|    </div>
336|  );
337|}
338|
339|export default ChatPage;
340|
[End of file]