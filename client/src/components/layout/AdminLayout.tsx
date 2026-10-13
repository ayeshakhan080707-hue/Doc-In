import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShieldCheck, AlertTriangle,
  ClipboardList, Sliders, LogOut, ChevronLeft, ChevronRight,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} />, exact: true },
  { to: '/admin/users', label: 'User Management', icon: <Users size={18} /> },
  { to: '/admin/credentials', label: 'Credentials', icon: <ShieldCheck size={18} /> },
  { to: '/admin/moderation', label: 'Moderation', icon: <AlertTriangle size={18} /> },
  { to: '/admin/audit', label: 'Audit Logs', icon: <ClipboardList size={18} /> },
  { to: '/admin/settings', label: 'System Settings', icon: <Sliders size={18} /> },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (to: string, exact = false) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-200 flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
        {/* Logo */}
        <div className={`flex items-center gap-2.5 px-4 h-16 border-b border-gray-100 ${collapsed ? 'justify-center' : ''}`}>
          {collapsed ? (
            <img src="/logo.png" alt="DocIn" className="h-8 w-8 object-contain" />
          ) : (
            <img src="/logo.png" alt="DocIn Digital Health Platform" className="h-10 w-auto object-contain" />
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#0A66C2] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Admin user info + logout */}
        <div className="border-t border-gray-100 p-3 space-y-2">
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <img
                src={user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.fullName || 'SA')}&backgroundColor=0A66C2&fontColor=ffffff`}
                alt={user?.fullName}
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{user?.fullName}</p>
                <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} className="flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <div className="flex justify-center pb-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-6 h-6 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <BarChart3 size={16} className="text-[#0A66C2]" />
            <span className="text-sm font-semibold text-gray-800">
              {navItems.find(n => isActive(n.to, n.exact))?.label || 'Admin Console'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-full font-bold border border-red-200">
              SUPER ADMIN
            </span>
            <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
