import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../common/ConfirmModal';
import { Menu, Search, Bell, User, LogOut, ChevronDown, Loader2, Sun, Moon, Monitor } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

const USFlag = () => (
  <svg width="22" height="16" viewBox="0 0 7.41 4" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 2, display: 'block' }}>
    <rect width="7.41" height="4" fill="#B22234"/>
    <rect y="0.308" width="7.41" height="0.308" fill="white"/>
    <rect y="0.923" width="7.41" height="0.308" fill="white"/>
    <rect y="1.538" width="7.41" height="0.308" fill="white"/>
    <rect y="2.154" width="7.41" height="0.308" fill="white"/>
    <rect y="2.769" width="7.41" height="0.308" fill="white"/>
    <rect y="3.384" width="7.41" height="0.308" fill="white"/>
    <rect width="2.97" height="2.154" fill="#3C3B6E"/>
  </svg>
);

const FRFlag = () => (
  <svg width="22" height="16" viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 2, display: 'block' }}>
    <rect width="1" height="2" fill="#002395"/>
    <rect x="1" width="1" height="2" fill="#EDEDED"/>
    <rect x="2" width="1" height="2" fill="#ED2939"/>
  </svg>
);

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

const LANGUAGES = [
  { code: 'en' as const, label: 'English', flag: <USFlag /> },
  { code: 'fr' as const, label: 'Français', flag: <FRFlag /> },
];

const Topbar: React.FC<TopbarProps> = ({ setSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { mode, resolvedTheme, setMode } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const selectedLang = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
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
  const langRef = useRef<HTMLDivElement>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);

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
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
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

  const ThemeIcon = mode === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-4 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="md:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="hidden sm:block min-w-0">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
              {t('topbar.welcome')}{userName ? `, ${userName}` : ''}!
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {companyName ? `${t('topbar.managing')} ${companyName}` : t('topbar.default_subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <form onSubmit={handleSearch} className="hidden sm:block w-56 md:w-64 lg:w-72">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              {isSearchDebouncing && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 w-4 h-4 animate-spin" />
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('topbar.search_placeholder')}
                className="w-full pl-10 pr-10 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </form>

          <button
            onClick={() => setMode(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={`Theme: ${mode}`}
            aria-label={`Theme mode is ${mode}. Click to switch`}
          >
            <ThemeIcon size={20} />
          </button>

          <div className="relative" ref={langRef}>
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="p-2 text-lg hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors leading-none"
              title={`Language: ${selectedLang.label}`}
              aria-label={`Language: ${selectedLang.label}`}
            >
              {selectedLang.flag}
            </button>
            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1">
                {LANGUAGES.map((langOption) => (
                  <button
                    key={langOption.code}
                    onClick={() => {
                      setLang(langOption.code);
                      setShowLangMenu(false);
                    }}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors ${
                      selectedLang.code === langOption.code
                        ? 'bg-primary-50 dark:bg-gray-800 text-primary-600 dark:text-primary-400 font-medium'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="text-base leading-none">{langOption.flag}</span>
                    <span>{langOption.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="fixed left-2 right-2 top-16 w-auto sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('topbar.notifications')}</h3>
                  {notifications.length > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                      {notifications.length} {t('topbar.unread')}
                    </span>
                  )}
                </div>

                {notificationsLoading ? (
                  <div className="p-4 sm:p-6 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('topbar.loading_notifications')}</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 sm:p-6 text-center">
                    <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('topbar.no_notifications')}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('topbar.caught_up')}</p>
                  </div>
                ) : (
                  <div className="max-h-[42vh] sm:max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                    {notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className="px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{notification.title}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 break-words line-clamp-2">{notification.message}</p>
                            <p className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 mt-1">
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
              className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">{userInitials}</span>
              </div>
              <ChevronDown size={14} className="text-gray-500 dark:text-gray-300 hidden sm:block" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{userName || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{companyName || ''}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/settings');
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                  >
                    <User size={16} />
                    <span>{t('topbar.profile')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <LogOut size={16} />
                    <span>{t('topbar.signout')}</span>
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
