import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Users, Briefcase, MessageSquare, Bell, Search,
  Building2, UserCheck, Settings, LogOut, ChevronDown,
  X, LogIn, Calendar, Star, Award, Loader2, ShieldCheck, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { NotificationItem } from '../../types';

// ── Badge dot helper ─────────────────────────────────────────────────────────
const Badge: React.FC<{ count: number }> = ({ count }) => {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none pointer-events-none">
      {count > 9 ? '9+' : count}
    </span>
  );
};

export const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Nav badge counts
  const [msgBadge, setMsgBadge] = useState(0);
  const [networkBadge, setNetworkBadge] = useState(0);
  const [jobsBadge, setJobsBadge] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    doctors?: any[];
    groups?: any[];
    jobs?: any[];
    posts?: any[];
  }>({});
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname.startsWith(path);

  // Clear badges when user visits the relevant page
  useEffect(() => {
    if (location.pathname.startsWith('/messaging')) setMsgBadge(0);
    if (location.pathname.startsWith('/network')) setNetworkBadge(0);
    if (location.pathname.startsWith('/jobs')) setJobsBadge(0);
  }, [location.pathname]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search debounced
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults({});
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient.get('/search', { params: { q: query } });
        setSearchResults(res.data.data || {});
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/chat/notifications');
      const data: NotificationItem[] = res.data.data || [];
      setNotifications(data);
      setUnreadCount(res.data.unreadCount ?? data.filter((n) => !n.isRead).length);
    } catch {
      // silent
    }
  };

  const fetchBadgeCounts = async () => {
    try {
      const res = await apiClient.get('/chat/badge-counts');
      const { unreadMessages, pendingConnections, newJobs } = res.data.data || {};
      setMsgBadge(unreadMessages ?? 0);
      setNetworkBadge(pendingConnections ?? 0);
      setJobsBadge(newJobs ?? 0);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    // Don't fetch notifications for verifier — they have their own layout
    if (user && user.role !== 'CREDENTIALING_OFFICER') {
      fetchNotifications();
      fetchBadgeCounts();
      const interval = setInterval(() => {
        fetchNotifications();
        fetchBadgeCounts();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const handleOpenNotifications = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0) {
      try {
        await apiClient.post('/chat/notifications/read');
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      } catch { /* silent */ }
    }
  };

  // Verifier uses dedicated layout
  if (user?.role === 'CREDENTIALING_OFFICER') return null;

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchDropdown(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleSelectResult = (url: string) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    navigate(url);
  };

  const doctorsList = searchResults.doctors || [];
  const groupsList = searchResults.groups || [];
  const jobsList = searchResults.jobs || [];
  const totalResultsCount = doctorsList.length + groupsList.length + jobsList.length;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[rgba(0,0,0,0.08)] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Brand + Round Live Search */}
        <div className="flex items-center gap-3 flex-1 max-w-xs md:max-w-md">
          <Link to="/feed" className="flex items-center flex-shrink-0 group" aria-label="DocIn Home">
            <img
              src="/logo.png"
              alt="DocIn Digital Health Platform"
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* Search container with live dropdown */}
          <div className="relative w-full hidden md:block" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Search size={15} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim()) setShowSearchDropdown(true);
                }}
                placeholder="Search doctors, specialties, jobs, groups..."
                className="w-full pl-9 pr-9 py-2 bg-[#EDF3F8] hover:bg-[#E2EBF3] focus:bg-white text-sm text-[rgba(0,0,0,0.9)] placeholder-[rgba(0,0,0,0.5)] rounded-full transition-all outline-none border border-transparent focus:border-[#0A66C2] focus:ring-2 focus:ring-blue-100 shadow-sm"
                aria-label="Search DocIn"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearchDropdown(false);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </form>

            {/* Live Search Results Dropdown */}
            {showSearchDropdown && (
              <div className="absolute top-full left-0 mt-1.5 w-80 sm:w-96 bg-white rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.15)] border border-gray-200 z-50 overflow-hidden divide-y divide-gray-100 animate-in fade-in slide-in-from-top-1 duration-150">
                {/* Search Header Status */}
                <div className="px-4 py-2.5 bg-gray-50 flex items-center justify-between text-xs text-gray-500 font-medium">
                  <span>Searching for &quot;{searchQuery}&quot;</span>
                  {isSearching && <Loader2 size={13} className="animate-spin text-[#0A66C2]" />}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {/* DOCTORS */}
                  {doctorsList.length > 0 && (
                    <div className="py-2">
                      <div className="px-3.5 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Doctors & Specialists
                      </div>
                      {doctorsList.slice(0, 4).map((doc: any) => {
                        const targetId = typeof doc.userId === 'object' ? (doc.userId?._id || doc.userId?.id) : doc.userId;
                        const avatar = doc.userId?.avatarUrl || doc.avatarUrl;
                        return (
                          <div
                            key={doc._id}
                            onClick={() => handleSelectResult(`/profile/${targetId}`)}
                            className="px-3.5 py-2 hover:bg-blue-50/60 cursor-pointer flex items-center gap-3 transition-colors"
                          >
                            {avatar ? (
                              <img src={avatar} alt={doc.fullName} className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0A66C2] flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {(doc.fullName || 'Dr').substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-gray-900 truncate flex items-center gap-1">
                                {doc.fullName}
                                {doc.userId?.isClinicalVerified && (
                                  <ShieldCheck size={12} className="text-[#0A66C2] flex-shrink-0" />
                                )}
                              </p>
                              <p className="text-[11px] text-gray-500 truncate">
                                {doc.specialization || doc.headline || 'Medical Specialist'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* GROUPS */}
                  {groupsList.length > 0 && (
                    <div className="py-2">
                      <div className="px-3.5 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Medical Groups
                      </div>
                      {groupsList.slice(0, 3).map((group: any) => (
                        <div
                          key={group._id}
                          onClick={() => handleSelectResult(`/groups/${group._id}`)}
                          className="px-3.5 py-2 hover:bg-blue-50/60 cursor-pointer flex items-center gap-3 transition-colors"
                        >
                          {group.avatarUrl ? (
                            <img src={group.avatarUrl} alt={group.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-gray-200" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {group.name.substring(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 truncate">{group.name}</p>
                            <p className="text-[11px] text-gray-500 truncate">{group.specialty}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* JOBS */}
                  {jobsList.length > 0 && (
                    <div className="py-2">
                      <div className="px-3.5 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Job Postings
                      </div>
                      {jobsList.slice(0, 3).map((job: any) => (
                        <div
                          key={job._id}
                          onClick={() => handleSelectResult('/jobs')}
                          className="px-3.5 py-2 hover:bg-blue-50/60 cursor-pointer flex items-center gap-3 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            <Briefcase size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 truncate">{job.title}</p>
                            <p className="text-[11px] text-gray-500 truncate">
                              {job.institutionName} • {job.location}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {!isSearching && totalResultsCount === 0 && (
                    <div className="py-7 text-center px-4">
                      <Search size={22} className="text-gray-300 mx-auto mb-1.5" />
                      <p className="text-xs font-medium text-gray-700">No matches found for &quot;{searchQuery}&quot;</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Try searching for doctor names, cardiology, surgery, or hospital jobs</p>
                    </div>
                  )}
                </div>

                {/* Bottom link to view full search results page */}
                <div
                  onClick={() => {
                    setShowSearchDropdown(false);
                    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2.5 bg-gray-50 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs font-semibold text-[#0A66C2] transition-colors"
                >
                  <span>See all results for &quot;{searchQuery}&quot;</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nav Tabs — with increased, elegant spacing */}
        <nav className="flex items-center gap-3 sm:gap-5 md:gap-6" aria-label="Main navigation">
          <NavTab to="/feed" icon={<Home size={20} />} label="Home" isActive={isActive('/feed')} />
          <NavTab to="/jobs" icon={<Briefcase size={20} />} label="Jobs" isActive={isActive('/jobs')} badge={jobsBadge} />

          {isAuthenticated && (
            <>
              <NavTab to="/network" icon={<Users size={20} />} label="Network" isActive={isActive('/network')} badge={networkBadge} />
              <NavTab to="/messaging" icon={<MessageSquare size={20} />} label="Messaging" isActive={isActive('/messaging')} badge={msgBadge} />
              {/* Role specific panels */}
              {user?.role === 'HOSPITAL_ADMIN' && (
                <NavTab to="/hospital" icon={<Building2 size={20} />} label="Hospital" isActive={isActive('/hospital')} />
              )}
              {user?.role === 'RECRUITER' && (
                <NavTab to="/recruiter" icon={<UserCheck size={20} />} label="Talent" isActive={isActive('/recruiter')} accentColor="text-[#B06000]" />
              )}
              {user?.role === 'SUPER_ADMIN' && (
                <NavTab to="/admin" icon={<Settings size={20} />} label="Admin" isActive={isActive('/admin')} />
              )}

              {/* Notifications Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={handleOpenNotifications}
                  className={`flex flex-col items-center justify-center px-1.5 py-1 border-b-2 text-xs font-medium relative transition-colors ${
                    showNotifications
                      ? 'border-[rgba(0,0,0,0.9)] text-[rgba(0,0,0,0.9)]'
                      : 'border-transparent text-[rgba(0,0,0,0.6)] hover:text-[rgba(0,0,0,0.9)]'
                  }`}
                  aria-label="Notifications"
                >
                  <span className="relative">
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </span>
                  <span className="hidden sm:inline mt-0.5">Alerts</span>
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-[rgba(0,0,0,0.08)] z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-sm text-[rgba(0,0,0,0.9)]">Notifications</h3>
                      <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center">
                          <Bell size={32} className="text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">No notifications yet</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {notifications.map((notif) => (
                            <div
                              key={notif._id}
                              onClick={() => {
                                setShowNotifications(false);
                                if ((notif as any).link) navigate((notif as any).link);
                              }}
                              className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-[#EBF5FF]/40' : ''}`}
                            >
                              <div className="flex items-start gap-2">
                                {!notif.isRead && <span className="w-2 h-2 rounded-full bg-[#0A66C2] flex-shrink-0 mt-1.5" />}
                                <div className={!notif.isRead ? '' : 'pl-4'}>
                                  <p className="text-xs font-semibold text-[rgba(0,0,0,0.9)]">{notif.title}</p>
                                  <p className="text-xs text-[rgba(0,0,0,0.6)] mt-0.5 leading-relaxed">{notif.message}</p>
                                  <p className="text-[10px] text-[rgba(0,0,0,0.4)] mt-1">
                                    {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Clinical Assistant */}
              <NavTab
                to="/ai-assistant"
                icon={<img src="/ai-mascot.svg" alt="AI" className="w-6 h-6 object-contain" />}
                label="AI"
                isActive={isActive('/ai-assistant')}
              />

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex flex-col items-center justify-center px-1.5 py-1 text-xs text-[rgba(0,0,0,0.6)] hover:text-[rgba(0,0,0,0.9)]"
                  aria-label="Profile menu"
                >
                  <img
                    src={user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.fullName || 'User')}`}
                    alt={user?.fullName || 'Profile'}
                    className="w-6 h-6 rounded-full object-cover border border-gray-200"
                  />
                  <span className="hidden sm:flex mt-0.5 items-center gap-0.5">
                    Me <ChevronDown size={11} />
                  </span>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-[rgba(0,0,0,0.08)] py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                      <img
                        src={user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.fullName || 'User')}`}
                        alt="Profile"
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                      />
                      <div className="overflow-hidden">
                        <p className="font-semibold text-sm text-[rgba(0,0,0,0.9)] truncate">{user?.fullName}</p>
                        <p className="text-xs text-[rgba(0,0,0,0.6)] truncate">{user?.email}</p>
                        <p className="text-[11px] text-[rgba(0,0,0,0.4)]">{user?.role?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>

                    {user?.role === 'DOCTOR' && (
                      <div className="p-2 border-b border-gray-100">
                        <Link
                          to="/profile"
                          onClick={() => setShowProfileMenu(false)}
                          className="block w-full text-center py-1.5 text-xs font-semibold text-[#0A66C2] border border-[#0A66C2] rounded-full hover:bg-[#EBF5FF] transition-colors"
                        >
                          View Professional Profile
                        </Link>
                      </div>
                    )}

                    <div className="py-1">
                      {/* Feature links */}
                      <Link to="/groups" onClick={() => setShowProfileMenu(false)} className="w-full text-left px-4 py-2 text-sm text-[rgba(0,0,0,0.8)] hover:bg-[#F3F2EF] flex items-center gap-2.5 transition-colors">
                        <Users size={14} className="text-[rgba(0,0,0,0.5)]" /> Medical Groups
                      </Link>
                      <Link to="/events" onClick={() => setShowProfileMenu(false)} className="w-full text-left px-4 py-2 text-sm text-[rgba(0,0,0,0.8)] hover:bg-[#F3F2EF] flex items-center gap-2.5 transition-colors">
                        <Calendar size={14} className="text-[rgba(0,0,0,0.5)]" /> Events
                      </Link>
                      {user?.role === 'DOCTOR' && (
                        <Link to="/cme" onClick={() => setShowProfileMenu(false)} className="w-full text-left px-4 py-2 text-sm text-[rgba(0,0,0,0.8)] hover:bg-[#F3F2EF] flex items-center gap-2.5 transition-colors">
                          <Award size={14} className="text-[rgba(0,0,0,0.5)]" /> CME Credits
                        </Link>
                      )}
                      <Link to="/subscription" onClick={() => setShowProfileMenu(false)} className="w-full text-left px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 transition-colors">
                        <Star size={14} className="text-amber-500" />
                        {user?.subscriptionTier === 'PREMIUM_GOLD' ? 'Manage Gold' : 'Upgrade to Gold'}
                      </Link>

                      <div className="border-t border-gray-100 my-1" />

                      <Link to="/settings" onClick={() => setShowProfileMenu(false)} className="w-full text-left px-4 py-2.5 text-sm text-[rgba(0,0,0,0.8)] hover:bg-[#F3F2EF] flex items-center gap-2.5 transition-colors">
                        <Settings size={15} className="text-[rgba(0,0,0,0.5)]" /> Settings
                      </Link>
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-[rgba(0,0,0,0.8)] hover:bg-[#F3F2EF] flex items-center gap-2.5 transition-colors">
                        <LogOut size={15} className="text-[rgba(0,0,0,0.5)]" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Login / Join buttons for logged-out users */}
          {!isAuthenticated && (
            <div className="flex items-center gap-3 ml-2">
              <Link
                to="/login"
                className="text-xs font-semibold text-[#0A66C2] px-4 py-1.5 border border-[#0A66C2] rounded-full hover:bg-[#EBF5FF] transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-xs font-semibold text-white bg-[#0A66C2] hover:bg-[#0956a8] px-4 py-1.5 rounded-full transition-colors flex items-center gap-1 shadow-sm"
              >
                <LogIn size={13} /> Join DocIn
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

// NavTab helper
interface NavTabProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  accentColor?: string;
  badge?: number;
}

const NavTab: React.FC<NavTabProps> = ({ to, icon, label, isActive, accentColor, badge }) => (
  <Link
    to={to}
    className={`flex flex-col items-center justify-center px-1.5 py-1 border-b-2 text-xs font-medium transition-colors ${
      isActive
        ? 'border-[rgba(0,0,0,0.9)] text-[rgba(0,0,0,0.9)]'
        : `border-transparent ${accentColor || 'text-[rgba(0,0,0,0.6)] hover:text-[rgba(0,0,0,0.9)]'}`
    }`}
  >
    <span className="relative">
      {icon}
      <Badge count={badge ?? 0} />
    </span>
    <span className="hidden sm:inline mt-0.5">{label}</span>
  </Link>
);
