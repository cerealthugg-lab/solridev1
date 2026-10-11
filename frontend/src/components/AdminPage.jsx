import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from './ui/sonner';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Shield, MapPin, Video, MessageCircle, Users, AlertTriangle, Trash2, EyeOff, Ban, Gift, BarChart3, RefreshCw } from 'lucide-react';

var BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
var api = axios.create({ baseURL: BACKEND_URL + '/api' });
api.interceptors.request.use(function(config) {
  var token = localStorage.getItem('token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

function AdminPage(props) {
  var currentUser = props.currentUser;
  var tabState = useState('stats');
  var tab = tabState[0];
  var setTab = tabState[1];
  var loadingState = useState(false);
  var loading = loadingState[0];
  var setLoading = loadingState[1];

  // Data states
  var statsState = useState(null);
  var stats = statsState[0];
  var setStats = statsState[1];
  var usersState = useState([]);
  var users = usersState[0];
  var setUsers = usersState[1];
  var spotsState = useState([]);
  var spots = spotsState[0];
  var setSpots = spotsState[1];
  var tricksState = useState([]);
  var tricks = tricksState[0];
  var setTricks = tricksState[1];
  var messagesState = useState([]);
  var messages = messagesState[0];
  var setMessages = messagesState[1];
  var reportsState = useState([]);
  var reports = reportsState[0];
  var setReports = reportsState[1];
  var grantState = useState({});
  var grantAmounts = grantState[0];
  var setGrantAmounts = grantState[1];

  // Fetch functions
  var fetchStats = async function() {
    try { var r = await api.get('/admin/stats'); setStats(r.data); } catch(e) {}
  };
  var fetchUsers = async function() {
    try { var r = await api.get('/admin/users'); setUsers(r.data || []); } catch(e) {}
  };
  var fetchSpots = async function() {
    try { var r = await api.get('/spots'); setSpots(r.data || []); } catch(e) {}
  };
  var fetchTricks = async function() {
    try { var r = await api.get('/tricks/feed?limit=100'); setTricks(r.data || []); } catch(e) {}
  };
  var fetchMessages = async function() {
    try { var r = await api.get('/chat/messages'); setMessages(r.data || []); } catch(e) {}
  };
  var fetchReports = async function() {
    try { var r = await api.get('/admin/reports'); setReports(r.data || []); } catch(e) {}
  };

  var refreshAll = function() {
    setLoading(true);
    Promise.all([fetchStats(), fetchUsers(), fetchSpots(), fetchTricks(), fetchMessages(), fetchReports()])
      .finally(function() { setLoading(false); });
  };

  useEffect(refreshAll, []);

  // Actions
  var deleteSpot = async function(id, name) {
    if (!window.confirm('Delete spot "' + name + '"?')) return;
    try {
      await api.delete('/admin/spots/' + id);
      toast.success('Spot deleted');
      fetchSpots(); fetchStats();
    } catch(e) { toast.error('Failed to delete spot'); }
  };

  var deleteTrick = async function(id) {
    if (!window.confirm('Delete this trick?')) return;
    try {
      await api.delete('/tricks/' + id);
      toast.success('Trick deleted');
      fetchTricks(); fetchStats();
    } catch(e) { toast.error('Failed - you can only delete tricks as their owner or need admin delete endpoint'); }
  };

  var hideMessage = async function(id) {
    try {
      await api.delete('/admin/messages/' + id);
      toast.success('Message hidden');
      fetchMessages(); fetchStats();
    } catch(e) { toast.error('Failed'); }
  };

  var banChat = async function(username, hours) {
    if (!window.confirm('Ban ' + username + ' from chat for ' + hours + ' hours?')) return;
    try {
      await api.post('/admin/users/' + username + '/ban-chat', { hours: hours, reason: 'admin action' });
      toast.success(username + ' banned for ' + hours + 'h');
      fetchUsers();
    } catch(e) { toast.error('Failed to ban'); }
  };

  var unbanChat = async function(username) {
    try {
      await api.post('/admin/users/' + username + '/unban-chat');
      toast.success(username + ' unbanned');
      fetchUsers();
    } catch(e) { toast.error('Failed'); }
  };

  var grantDFQ = async function(username) {
    var amount = parseFloat(grantAmounts[username] || 0);
    if (!amount || amount <= 0) return toast.error('Enter an amount');
    try {
      await api.post('/admin/users/' + username + '/grant-dfq', { amount: amount, reason: 'admin grant' });
      toast.success('+' + amount + ' DFQ to ' + username);
      setGrantAmounts(Object.assign({}, grantAmounts, { [username]: '' }));
      fetchUsers(); fetchStats();
    } catch(e) { toast.error('Failed'); }
  };

  // Access check
 if (!currentUser || currentUser.username !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield size={48} className="text-[#FF3366] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white uppercase">Access Denied</h2>
          <p className="text-zinc-500 text-sm mt-2">Admin only</p>
        </div>
      </div>
    );
  }

  var tabs = [
    { key: 'stats', label: 'Overview', icon: BarChart3 },
    { key: 'users', label: 'Users (' + users.length + ')', icon: Users },
    { key: 'spots', label: 'Spots (' + spots.length + ')', icon: MapPin },
    { key: 'tricks', label: 'Tricks (' + tricks.length + ')', icon: Video },
    { key: 'chat', label: 'Chat (' + messages.length + ')', icon: MessageCircle },
    { key: 'reports', label: 'Reports (' + reports.length + ')', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-[#FF3366]" />
          <h1 className="text-xl font-bold uppercase">Admin</h1>
        </div>
        <button onClick={refreshAll} className="text-zinc-500 hover:text-[#D2FF00] p-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(function(t) {
          var Icon = t.icon;
          return (
            <button key={t.key} onClick={function() { setTab(t.key); }}
              className={"flex items-center gap-1 px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest border whitespace-nowrap " +
                (tab === t.key ? 'bg-[#FF3366] text-white border-[#FF3366]' : 'text-zinc-500 border-zinc-800')}>
              <Icon size={12} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* === STATS === */}
      {tab === 'stats' && stats && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Users', value: stats.users, color: '#D2FF00' },
            { label: 'Spots', value: stats.spots, color: '#00D2FF' },
            { label: 'Rides', value: stats.rides, color: '#FF9900' },
            { label: 'Messages', value: stats.messages, color: '#AA66FF' },
            { label: 'Reports', value: stats.reports, color: '#FF3366' },
            { label: 'Total DFQ', value: stats.total_dfq, color: '#D2FF00' },
          ].map(function(s) {
            return (
              <div key={s.label} className="bg-zinc-900 border border-zinc-800 p-4 text-center">
                <div className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">{s.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* === USERS === */}
      {tab === 'users' && (
        <div className="space-y-2">
          {users.map(function(u) {
            return (
              <Card key={u.username} className="bg-zinc-900 border-zinc-800 rounded-none">
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{u.username}</span>
                        {u.is_admin && <span className="text-[8px] bg-[#FF3366] text-white px-1 py-0.5 uppercase">Admin</span>}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {(u.wallet_balance || 0).toFixed(2)} DFQ | Joined {new Date(u.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap items-center">
                    <button onClick={function() { banChat(u.username, 1); }}
                      className="text-[9px] text-zinc-500 hover:text-[#FF3366] border border-zinc-800 px-2 py-1">Ban 1h</button>
                    <button onClick={function() { banChat(u.username, 24); }}
                      className="text-[9px] text-zinc-500 hover:text-[#FF3366] border border-zinc-800 px-2 py-1">Ban 24h</button>
                    <button onClick={function() { banChat(u.username, 720); }}
                      className="text-[9px] text-zinc-500 hover:text-[#FF3366] border border-zinc-800 px-2 py-1">Ban 30d</button>
                    <button onClick={function() { unbanChat(u.username); }}
                      className="text-[9px] text-zinc-500 hover:text-[#D2FF00] border border-zinc-800 px-2 py-1">Unban</button>
                    <span className="text-zinc-700 mx-1">|</span>
                    <input
                      type="number"
                      placeholder="DFQ"
                      value={grantAmounts[u.username] || ''}
                      onChange={function(e) { var g = Object.assign({}, grantAmounts); g[u.username] = e.target.value; setGrantAmounts(g); }}
                      className="w-16 h-6 text-[10px] bg-black border border-zinc-800 text-white px-1"
                    />
                    <button onClick={function() { grantDFQ(u.username); }}
                      className="text-[9px] text-[#D2FF00] hover:text-white border border-zinc-800 px-2 py-1">
                      <Gift size={10} className="inline mr-1" />Grant
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* === SPOTS === */}
      {tab === 'spots' && (
        <div className="space-y-2">
          {spots.length === 0 && <div className="text-center text-zinc-600 py-6">No spots</div>}
          {spots.map(function(spot) {
            return (
              <div key={spot.id} className="bg-zinc-900 border border-zinc-800 p-3 flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white truncate">{spot.name}</span>
                    <span className="text-[9px] text-zinc-600">{spot.spot_type}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500">by {spot.user_id} | {new Date(spot.created_at).toLocaleDateString()}</div>
                  {spot.description && <p className="text-[10px] text-zinc-400 mt-1 truncate">{spot.description}</p>}
                  {spot.photos && spot.photos.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {spot.photos.slice(0, 3).map(function(p, i) {
                        return <img key={i} src={p} alt="" className="w-10 h-10 object-cover border border-zinc-700" />;
                      })}
                    </div>
                  )}
                </div>
                <button onClick={function() { deleteSpot(spot.id, spot.name); }}
                  className="text-zinc-600 hover:text-[#FF3366] p-1 flex-shrink-0 ml-2">
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* === TRICKS === */}
      {tab === 'tricks' && (
        <div className="space-y-2">
          {tricks.length === 0 && <div className="text-center text-zinc-600 py-6">No tricks</div>}
          {tricks.map(function(trick) {
            return (
              <div key={trick.id} className="bg-zinc-900 border border-zinc-800 p-3 flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{trick.trick_name || 'Untitled'}</span>
                    <span className="text-[9px] text-zinc-600">by {trick.user_id}</span>
                  </div>
                  {trick.spot_name && <div className="text-[10px] text-zinc-500">Spot: {trick.spot_name}</div>}
                  <div className="text-[10px] text-zinc-500">{new Date(trick.created_at).toLocaleDateString()} | {trick.tips_received || 0} DFQ tips</div>
                  {trick.video_url && (
                    <video src={trick.video_url} className="w-full h-24 object-cover mt-1 rounded" controls />
                  )}
                </div>
                <button onClick={function() { deleteTrick(trick.id); }}
                  className="text-zinc-600 hover:text-[#FF3366] p-1 flex-shrink-0 ml-2">
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* === CHAT === */}
      {tab === 'chat' && (
        <div className="space-y-1">
          {messages.length === 0 && <div className="text-center text-zinc-600 py-6">No messages</div>}
          {messages.map(function(msg) {
            return (
              <div key={msg.id} className={"flex justify-between items-center p-2 border-b border-zinc-800/50 " + (msg.flagged ? 'bg-[#FF3366]/10' : '')}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{msg.username}</span>
                    {msg.flagged && <AlertTriangle size={10} className="text-[#FF3366]" />}
                    <span className="text-[9px] text-zinc-600">{new Date(msg.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">{msg.content}</p>
                </div>
                <button onClick={function() { hideMessage(msg.id); }}
                  className="text-zinc-600 hover:text-[#FF3366] p-1 flex-shrink-0">
                  <EyeOff size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* === REPORTS === */}
      {tab === 'reports' && (
        <div className="space-y-2">
          {reports.length === 0 && <div className="text-center text-zinc-600 py-6">No reports</div>}
          {reports.map(function(r) {
            var msg = r.message;
            return (
              <div key={r.id} className="bg-[#FF3366]/5 border border-[#FF3366]/20 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={12} className="text-[#FF3366]" />
                  <span className="text-[10px] text-zinc-400">Reported by {r.reporter_id} | {r.reason}</span>
                  <span className="text-[9px] text-zinc-600">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {msg && (
                  <div className="bg-zinc-900 p-2 mt-1">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-white">{msg.username}</span>
                        <p className="text-[10px] text-zinc-400">{msg.content}</p>
                      </div>
                      <button onClick={function() { hideMessage(msg.id); }}
                        className="text-zinc-600 hover:text-[#FF3366] p-1">
                        <EyeOff size={14} />
                      </button>
                    </div>
                    {msg.hidden && <span className="text-[8px] text-[#FF3366] uppercase">Already hidden</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminPage;