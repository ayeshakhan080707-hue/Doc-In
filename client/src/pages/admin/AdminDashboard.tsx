import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, FileText, Briefcase, TrendingUp, Award, AlertTriangle, Loader2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient } from '../../api/client';

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [specialtyDistribution, setSpecialtyDistribution] = useState<any[]>([]);
  const [dailyRegistrations, setDailyRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/admin/analytics');
        setMetrics(res.data.data.metrics);
        setSpecialtyDistribution(res.data.data.specialtyDistribution || []);
        setDailyRegistrations(res.data.data.dailyRegistrations || []);
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-[#0A66C2]" />
    </div>
  );

  const kpiCards = [
    { label: 'Total Users', value: metrics?.totalUsers, sub: `${metrics?.observerCount || 0} observers`, icon: <Users size={20} />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
    { label: 'Verified Doctors', value: metrics?.verifiedDoctors, sub: `${metrics?.verificationRate}% verification rate`, icon: <ShieldCheck size={20} />, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
    { label: 'Total Posts', value: metrics?.totalPosts, sub: 'Feed discussions', icon: <FileText size={20} />, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
    { label: 'Active Jobs', value: metrics?.totalJobs, sub: 'Hospital requisitions', icon: <Briefcase size={20} />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
    { label: 'Gold Members', value: metrics?.goldMembershipsCount, sub: 'Premium subscribers', icon: <Award size={20} />, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-100' },
    { label: 'Pending Verifications', value: metrics?.pendingVerifications, sub: 'Awaiting review', icon: <AlertTriangle size={20} />, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Platform Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Real-time overview of DocIn Healthcare Platform</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpiCards.map((kpi, i) => (
          <div key={i} className={`rounded-xl border p-4 ${kpi.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500">{kpi.label}</span>
              <span className={kpi.color}>{kpi.icon}</span>
            </div>
            <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value ?? '—'}</p>
            <p className="text-[11px] text-gray-500 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dailyRegistrations.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp size={15} className="text-[#0A66C2]" /> User Registrations — Last 30 Days
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={dailyRegistrations.map(d => ({ date: d._id?.substring(5), count: d.count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="count" stroke="#0A66C2" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {specialtyDistribution.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={15} className="text-[#0D9488]" /> Doctor Specialty Distribution
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={specialtyDistribution.map(s => ({ name: s.specialty || 'General', count: s.count }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#9ca3af' }} width={100} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="count" fill="#0D9488" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
