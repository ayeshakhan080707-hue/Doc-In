import React, { useState, useEffect } from 'react';
import {
  Settings, Users, ShieldCheck, Award, FileText, Briefcase,
  Search, TrendingUp, AlertTriangle, FileCheck2, Bell, Sliders,
  BarChart3, ClipboardList, Loader2, CreditCard, DollarSign,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { apiClient } from '../../api/client';

type AdminTab = 'analytics' | 'users' | 'subscriptions' | 'moderation' | 'audit' | 'settings';

export const SuperAdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [metrics, setMetrics] = useState<any>(null);
  const [specialtyDistribution, setSpecialtyDistribution] = useState<any[]>([]);
  const [dailyRegistrations, setDailyRegistrations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [reportedPosts, setReportedPosts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [anaRes, userRes] = await Promise.all([
        apiClient.get('/admin/analytics'),
        apiClient.get('/admin/users'),
      ]);
      setMetrics(anaRes.data.data.metrics);
      setSpecialtyDistribution(anaRes.data.data.specialtyDistribution || []);
      setDailyRegistrations(anaRes.data.data.dailyRegistrations || []);
      setUsers(userRes.data.data || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const fetchReportedPosts = async () => {
    try {
      const res = await apiClient.get('/admin/reported-posts');
      setReportedPosts(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await apiClient.get('/admin/audit-logs');
      setAuditLogs(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/admin/settings');
      setSystemSettings(res.data.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    if (activeTab === 'moderation') fetchReportedPosts();
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'settings') fetchSettings();
  }, [activeTab]);

  const handleToggleVerified = async (u: any) => {
    try {
      await apiClient.put(`/admin/users/${u._id}`, { isClinicalVerified: !u.isClinicalVerified });
      fetchAdminData();
    } catch (err) { console.error(err); }
  };

  const handleToggleGold = async (u: any) => {
    const nextTier = u.subscriptionTier === 'PREMIUM_GOLD' ? 'FREE' : 'PREMIUM_GOLD';
    try {
      await apiClient.put(`/admin/users/${u._id}`, { subscriptionTier: nextTier });
      fetchAdminData();
    } catch (err) { console.error(err); }
  };

  const handleToggleStatus = async (u: any) => {
    const newStatus = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (newStatus === 'SUSPENDED' && !window.confirm(`Suspend ${u.fullName}?`)) return;
    try {
      await apiClient.put(`/admin/users/${u._id}`, { status: newStatus });
      fetchAdminData();
    } catch (err) { console.error(err); }
  };

  const handleForceLogout = async (userId: string) => {
    try {
      await apiClient.post(`/admin/users/${userId}/force-logout`);
      alert('User sessions revoked.');
    } catch (err) { console.error(err); }
  };

  const handleResolveReport = async (reportId: string, action: string) => {
    try {
      await apiClient.post(`/admin/reported-posts/${reportId}/resolve`, { action });
      fetchReportedPosts();
    } catch (err) { console.error(err); }
  };

  const handleSaveSettings = async () => {
    if (!systemSettings) return;
    setSavingSettings(true);
    try {
      await apiClient.put('/admin/settings', systemSettings);
      alert('Settings saved.');
    } catch (err) { console.error(err); }
    finally { setSavingSettings(false); }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesQuery = !searchQuery || u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesQuery;
  });

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'analytics', label: 'Analytics', icon: <BarChart3 size={15} /> },
    { key: 'users', label: 'Users', icon: <Users size={15} /> },
    { key: 'subscriptions', label: 'Subscriptions', icon: <CreditCard size={15} /> },
    { key: 'moderation', label: 'Moderation', icon: <AlertTriangle size={15} /> },
    { key: 'audit', label: 'Audit Logs', icon: <ClipboardList size={15} /> },
    { key: 'settings', label: 'Settings', icon: <Sliders size={15} /> },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 space-y-5">
      {/* Banner */}
      <div className="card-linkedin p-5 bg-gradient-to-r from-gray-900 to-[#0A66C2] text-white">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-white/10"><Settings size={28} /></div>
          <div>
            <h1 className="text-xl font-bold">SuperAdmin Control Panel</h1>
            <p className="text-xs text-blue-100 mt-0.5">Full platform governance — analytics, users, moderation, audit, settings</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${activeTab === tab.key ? 'border-[#0A66C2] text-[#0A66C2]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {isLoading && activeTab === 'analytics' && (
        <div className="card-linkedin p-12 text-center"><Loader2 size={24} className="animate-spin text-[#0A66C2] mx-auto" /></div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && !isLoading && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: metrics?.totalUsers, sub: `${metrics?.observerCount || 0} observers`, icon: <Users size={16} /> },
              { label: 'Verified Doctors', value: metrics?.verifiedDoctors, sub: `${metrics?.verificationRate}% rate`, icon: <ShieldCheck size={16} className="text-green-600" /> },
              { label: 'Feed Posts', value: metrics?.totalPosts, sub: 'Platform discussions', icon: <FileText size={16} /> },
              { label: 'Gold Members', value: metrics?.goldMembershipsCount, sub: 'Premium subscribers', icon: <Award size={16} className="text-amber-500" /> },
            ].map((kpi, i) => (
              <div key={i} className="card-linkedin p-4">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-xs font-semibold">{kpi.label}</span>
                  {kpi.icon}
                </div>
                <p className="text-2xl font-bold text-gray-900">{kpi.value ?? '—'}</p>
                <p className="text-[11px] text-gray-500 mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Daily Registrations Chart */}
          {dailyRegistrations.length > 0 && (
            <div className="card-linkedin p-5">
              <h2 className="font-bold text-sm text-gray-900 mb-4">User Registrations — Last 30 Days</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyRegistrations.map(d => ({ date: d._id?.substring(5), count: d.count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#0A66C2" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Specialty Distribution */}
          {specialtyDistribution.length > 0 && (
            <div className="card-linkedin p-5">
              <h2 className="font-bold text-sm text-gray-900 mb-4">Doctor Specialty Distribution</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={specialtyDistribution.map(s => ({ name: s.specialty || 'General', count: s.count }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0A66C2" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="card-linkedin overflow-hidden space-y-0">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/50">
            <h2 className="font-bold text-sm text-gray-900">User Management & Governance</h2>
            <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded bg-white outline-none text-xs" />
              </div>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-2.5 py-1.5 border border-gray-300 rounded bg-white outline-none font-medium text-gray-700 text-xs">
                <option value="ALL">All Roles</option>
                <option value="OBSERVER">Observers</option>
                <option value="DOCTOR">Doctors</option>
                <option value="CREDENTIALING_OFFICER">Verifiers</option>
                <option value="HOSPITAL_ADMIN">Hospitals</option>
                <option value="RECRUITER">Recruiters</option>
                <option value="SUPER_ADMIN">Admins</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.fullName)}`} alt={u.fullName} className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <p className="font-semibold text-gray-900">{u.fullName}</p>
                          <p className="text-[11px] text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-gray-100 font-mono text-[11px]">{u.role}</span></td>
                    <td className="px-4 py-3">
                      {u.isClinicalVerified ? <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 font-semibold flex items-center gap-1 w-fit"><ShieldCheck size={11} /> Yes</span> : <span className="text-gray-400">No</span>}
                    </td>
                    <td className="px-4 py-3">
                      {u.subscriptionTier === 'PREMIUM_GOLD' ? <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold flex items-center gap-1 w-fit"><Award size={11} /> Gold</span> : <span className="text-gray-500">Free</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded font-medium text-[11px] ${u.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{u.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button onClick={() => handleToggleVerified(u)} className="px-2 py-0.5 text-[11px] rounded font-semibold border border-gray-300 hover:bg-gray-100">
                        {u.isClinicalVerified ? 'Revoke' : 'Verify'}
                      </button>
                      <button onClick={() => handleToggleGold(u)} className="px-2 py-0.5 text-[11px] rounded font-semibold border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100">
                        {u.subscriptionTier === 'PREMIUM_GOLD' ? 'Free' : 'Gold'}
                      </button>
                      <button onClick={() => handleToggleStatus(u)} className={`px-2 py-0.5 text-[11px] rounded font-semibold border ${u.status === 'ACTIVE' ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100' : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'}`}>
                        {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </button>
                      <button onClick={() => handleForceLogout(u._id)} className="px-2 py-0.5 text-[11px] rounded font-semibold border border-gray-300 text-gray-600 hover:bg-gray-100">
                        Logout
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBSCRIPTIONS TAB */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-linkedin p-4">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-xs font-semibold">Gold Members</span>
                <Award size={16} className="text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-amber-600">{metrics?.goldMembershipsCount ?? '—'}</p>
              <p className="text-[11px] text-gray-500 mt-1">Active Premium Gold</p>
            </div>
            <div className="card-linkedin p-4">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-xs font-semibold">Free Tier</span>
                <Users size={16} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{(metrics?.totalUsers || 0) - (metrics?.goldMembershipsCount || 0)}</p>
              <p className="text-[11px] text-gray-500 mt-1">Free accounts</p>
            </div>
            <div className="card-linkedin p-4">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-xs font-semibold">Conversion Rate</span>
                <TrendingUp size={16} className="text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {metrics?.totalUsers > 0 ? Math.round((metrics.goldMembershipsCount / metrics.totalUsers) * 100) : 0}%
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Free → Gold</p>
            </div>
          </div>

          {/* Gold Members List */}
          <div className="card-linkedin overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <Award size={15} className="text-amber-500" /> Gold Members
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-gray-500 font-semibold text-[11px] uppercase">
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers
                    .filter(u => u.subscriptionTier === 'PREMIUM_GOLD')
                    .map((u: any) => (
                    <tr key={u._id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <img src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.fullName)}&backgroundColor=0A66C2&fontColor=ffffff`} alt={u.fullName} className="w-8 h-8 rounded-full object-cover" />
                          <div>
                            <p className="font-semibold text-gray-900">{u.fullName}</p>
                            <p className="text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.role?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                          <Award size={11} /> Gold
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleGold(u)}
                          className="px-2.5 py-0.5 text-[11px] rounded border border-red-200 text-red-600 hover:bg-red-50 font-semibold"
                        >
                          Revoke Gold
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.filter(u => u.subscriptionTier === 'PREMIUM_GOLD').length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-xs">No Gold members yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grant Gold */}
          <div className="card-linkedin p-4">
            <h2 className="font-bold text-sm text-gray-900 mb-3">Grant Gold to Free Members</h2>
            <p className="text-xs text-gray-500 mb-3">Select any free user from the Users tab and click "Gold" to manually grant Gold membership.</p>
            <button
              onClick={() => setActiveTab('users')}
              className="btn-pill-outline text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <Users size={13} /> Go to Users Management
            </button>
          </div>
        </div>
      )}

      {/* MODERATION TAB */}
      {activeTab === 'moderation' && (
        <div className="space-y-3">
          <div className="card-linkedin p-4">
            <h2 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2"><AlertTriangle size={15} className="text-orange-500" /> Reported Posts ({reportedPosts.length})</h2>
            {reportedPosts.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">No reported posts. Platform content is clean! ✓</p>
            ) : (
              <div className="space-y-3">
                {reportedPosts.map((r: any) => (
                  <div key={r._id} className="p-3 border border-orange-100 rounded-lg bg-orange-50/30 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800">Reason: <span className="text-orange-700">{r.reason?.replace('_', ' ')}</span></p>
                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{(r.postId as any)?.content}</p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          By: {(r.postId as any)?.authorId?.fullName} • Reported: {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => handleResolveReport(r._id, 'IGNORE')} className="text-[11px] px-2.5 py-1 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100">Ignore</button>
                        <button onClick={() => handleResolveReport(r._id, 'DELETE_POST')} className="text-[11px] px-2.5 py-1 border border-red-300 rounded-full text-red-600 bg-red-50 hover:bg-red-100">Delete Post</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AUDIT LOGS TAB */}
      {activeTab === 'audit' && (
        <div className="card-linkedin overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-bold text-sm text-gray-900 flex items-center gap-2">
            <ClipboardList size={15} className="text-[#0A66C2]" /> Audit Log ({auditLogs.length})
          </div>
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">No audit log entries yet.</div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {auditLogs.map((log: any) => (
                <div key={log._id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{log.action?.replace(/_/g, ' ')}</span>
                      <span className="text-gray-400">on</span>
                      <span className="text-gray-600">{log.targetType}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      By: {log.actorId?.fullName || log.actorEmail} • {log.ipAddress}
                    </p>
                  </div>
                  <p className="text-[11px] text-gray-400 flex-shrink-0">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SYSTEM SETTINGS TAB */}
      {activeTab === 'settings' && systemSettings && (
        <div className="card-linkedin p-5 space-y-5">
          <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
            <Sliders size={15} className="text-[#0A66C2]" /> System Settings
          </h2>

          {/* Maintenance Mode */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-xs font-semibold text-gray-800">Maintenance Mode</p>
              <p className="text-[11px] text-gray-500">Temporarily show maintenance banner to all users</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={systemSettings.maintenanceMode} onChange={e => setSystemSettings({ ...systemSettings, maintenanceMode: e.target.checked })} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
            </label>
          </div>

          {systemSettings.maintenanceMode && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Maintenance Message</label>
              <textarea rows={2} value={systemSettings.maintenanceMessage} onChange={e => setSystemSettings({ ...systemSettings, maintenanceMessage: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-xs outline-none focus:border-[#0A66C2] resize-none" />
            </div>
          )}

          {/* Announcement Banner */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-xs font-semibold text-gray-800">Announcement Banner</p>
              <p className="text-[11px] text-gray-500">Show a platform-wide announcement</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={systemSettings.announcementBannerActive} onChange={e => setSystemSettings({ ...systemSettings, announcementBannerActive: e.target.checked })} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0A66C2]"></div>
            </label>
          </div>

          {systemSettings.announcementBannerActive && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Announcement Text</label>
              <input type="text" value={systemSettings.announcementBanner || ''} onChange={e => setSystemSettings({ ...systemSettings, announcementBanner: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-xs outline-none focus:border-[#0A66C2]" maxLength={200} />
            </div>
          )}

          {/* Feature Flags */}
          <div>
            <p className="text-xs font-semibold text-gray-800 mb-3">Feature Flags</p>
            <div className="space-y-2">
              {Object.entries(systemSettings.featureFlags || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-700 font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={value as boolean} onChange={e => setSystemSettings({ ...systemSettings, featureFlags: { ...systemSettings.featureFlags, [key]: e.target.checked } })} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0A66C2]"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end">
            <button onClick={handleSaveSettings} disabled={savingSettings} className="btn-pill-primary text-xs px-5 py-2 flex items-center gap-1.5">
              {savingSettings ? <Loader2 size={13} className="animate-spin" /> : <Sliders size={13} />} Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
