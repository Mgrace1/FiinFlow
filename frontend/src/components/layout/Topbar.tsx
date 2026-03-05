import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../common/ConfirmModal';
import { Menu, Search, Bell, User, LogOut, ChevronDown, Loader2 } from 'lucide-react';
import { apiClient } from '../../api/client';

interface AppNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedInvoiceId?: { _id: string; invoiceNumber?: string; totalAmount?: number } | string;
}

interface TopbarProps {
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

const Topbar: React.FC<TopbarProps> = ({ setSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchDebouncing, setIsSearchDebouncing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const response = await apiClient.get('/notifications', {
        params: { unreadOnly: 'true' },
      });

      if (response.data.success) {
        const unread = Array.isArray(response.data.data)
          ? (response.data.data as AppNotification[])
          : [];
        setNotifications(unread.filter((n) => !n.isRead));
      }
    } catch {
      // silently ignore - notifications are non-critical
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const timer = window.setInterval(fetchNotifications, 60 * 1000);
    return () => window.clearInterval(timer);
  }, [fetchNotifications]);

  useEffect(() => {
    if (showNotifications) fetchNotifications();
  }, [showNotifications, fetchNotifications]);

  useEffect(() => {
    const handleFocus = () => fetchNotifications();
    const handleRefreshEvent = () => fetchNotifications();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('finflow:notifications:refresh', handleRefreshEvent as EventListener);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('finflow:notifications:refresh', handleRefreshEvent as EventListener);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    const storedUser = localStorage.getItem('finflow_user');
    const storedCompany = localStorage.getItem('finflow_company');

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserName(user.name);
      } catch (error) {
        console.error('Failed to parse user data from localStorage', error);
      }
    }

    if (storedCompany) {
      try {
        const company = JSON.parse(storedCompany);
        setCompanyName(company.name);
      } catch (error) {
        console.error('Failed to parse company data from localStorage', error);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowLogoutConfirm(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      setIsSearchDebouncing(false);
    }
  };

  useEffect(() => {
    if (location.pathname === '/search') {
      const q = new URLSearchParams(location.search).get('q') || '';
      setSearchQuery(q);
    } else {
      setSearchQuery('');
      setIsSearchDebouncing(false);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setIsSearchDebouncing(false);
      return;
    }

    const encoded = encodeURIComponent(trimmed);
    const targetPath = '/search';
    const targetSearch = `?q=${encoded}`;

    if (location.pathname === targetPath && location.search === targetSearch) {
      setIsSearchDebouncing(false);
      return;
    }

    setIsSearchDebouncing(true);
    const timer = window.setTimeout(() => {
      if (location.pathname !== targetPath || location.search !== targetSearch) {
        navigate(`${targetPath}${targetSearch}`);
      }
      setIsSearchDebouncing(false);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchQuery, navigate, location.pathname, location.search]);

  const handleNotificationClick = async (notification: AppNotification) => {
    try {
      await apiClient.patch(`/notifications/${notification._id}/read`);
    } catch {
      // keep navigation even if mark-as-read fails
    } finally {
      setNotifications((prev) => prev.filter((n) => n._id !== notification._id));
    }

    setShowNotifications(false);

    const relatedInvoiceId =
      typeof notification.relatedInvoiceId === 'string'
        ? notification.relatedInvoiceId
        : notification.relatedInvoiceId?._id;

    if (relatedInvoiceId) {
      navigate(`/invoices/${relatedInvoiceId}`);
      return;
    }

    if (notification.type.includes('invoice')) {
      navigate('/invoices');
      return;
    }

    if (notification.type.includes('expense')) {
      navigate('/expenses');
      return;
    }

    if (notification.type === 'budget_exceeded') {
      navigate('/reports');
      return;
    }

    navigate('/dashboard');
  };

  const userInitials = userName
    ? userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden text-gray-600 hover:text-gray-900"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="hidden sm:block">
            <h2 className="text-lg font-semibold text-gray-800">
              Welcome back{userName ? `, ${userName}` : ''}!
            </h2>
            <p className="text-xs text-gray-500">
              {companyName ? `Managing ${companyName}` : 'Manage your finances efficiently'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="hidden sm:block w-56 md:w-64 lg:w-72">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              {isSearchDebouncing && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 w-4 h-4 animate-spin" />
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages, features, or records..."
                className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white placeholder-gray-400"
              />
            </div>
          </form>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-3 sm:p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                  {notifications.length > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                      {notifications.length} unread
                    </span>
                  )}
                </div>

                {notificationsLoading ? (
                  <div className="p-4 sm:p-6 text-center">
                    <p className="text-sm text-gray-500">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 sm:p-6 text-center">
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No unread notifications</p>
                    <p className="text-xs text-gray-400 mt-1">You're all caught up</p>
                  </div>
                ) : (
                  <div className="max-h-[48vh] sm:max-h-80 overflow-y-auto divide-y divide-gray-100">
                    {notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className="px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5 break-words line-clamp-2">{notification.message}</p>
                            <p className="text-[10px] sm:text-[11px] text-gray-400 mt-1">
                              {new Date(notification.createdAt).toLocaleString('en-GB')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">{userInitials}</span>
              </div>
              <ChevronDown size={14} className="text-gray-500 hidden sm:block" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-100">
                  <p className="font-medium text-gray-900 text-sm">{userName || 'User'}</p>
                  <p className="text-xs text-gray-500">{companyName || ''}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/settings');
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <User size={16} />
                    <span>Profile & Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out? You'll need to sign in again to access your account."
        confirmText="Sign Out"
        cancelText="Cancel"
        variant="primary"
        confirmClassName="hover:!bg-red-600 hover:!border-red-600"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};

export default Topbar;
