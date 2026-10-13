import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, ClipboardList, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface VerifierLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { to: '/verifier', label: 'Overview', icon: <LayoutDashboard size={18} />, exact: true },
  { to: '/verifier/queue', label: 'Verification Queue', icon: <ClipboardList size={18} /> },
];

export const VerifierLayout: React.FC<VerifierLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
      <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 shadow-sm flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100">
          <img src="/logo.png" alt="DocIn Digital Health Platform" className="h-10 w-auto object-contain" />
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#0A66C2] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-blue-50 hover:text-[#0A66C2]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Officer info + logout */}
        <div className="border-t border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EBF5FF] text-[#0A66C2] flex items-center justify-center font-bold text-sm flex-shrink-0">
              {user?.fullName?.charAt(0) || 'V'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">{user?.fullName}</p>
              <p className="text-[10px] text-[#0A66C2] font-semibold">Credentialing Officer</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#0A66C2]" />
            <span className="text-sm font-semibold text-gray-800">
              {navItems.find(n => isActive(n.to, n.exact))?.label || 'Credentialing Panel'}
            </span>
          </div>
          <span className="px-2.5 py-1 bg-[#EBF5FF] text-[#0A66C2] rounded-full text-[10px] font-bold border border-blue-200">
            CREDENTIALING OFFICER
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
