import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Bell,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Building2,
  ArrowLeft,
  Check,
  Menu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, tenant, logout, exitImpersonation } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      {/* Impersonation Banner */}
      {user?.isImpersonating && (
        <div className="bg-amber-500 text-amber-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <span className="animate-pulse flex h-2 w-2 rounded-full bg-amber-900" />
            <span>
              Impersonation Mode: Currently accessing <strong>{tenant?.name}</strong> as Business Administrator.
            </span>
          </div>
          <button
            onClick={exitImpersonation}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-900 text-amber-100 hover:bg-black transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Exit & Return to Super Admin
          </button>
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left branding & menu button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-brand-500/20">
              E
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-gray-900 tracking-tight">EntriFa</span>
                {user?.role === 'SUPER_ADMIN' ? (
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide">
                    SUPER ADMIN
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide">
                    BUSINESS
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 font-medium hidden sm:block">
                Simple Business. Smart Accounts.
              </p>
            </div>
          </div>

          {/* Tenant Name Badge if Client */}
          {tenant && user?.role !== 'SUPER_ADMIN' && (
            <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-gray-200">
              <Building2 className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-semibold text-gray-800">{tenant.name}</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                {tenant.currency}
              </span>
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 py-3 z-50">
                <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-brand-100 text-brand-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-brand-600 hover:text-brand-800 font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id);
                          if (n.link) navigate(n.link);
                          setShowNotifs(false);
                        }}
                        className={`p-3.5 hover:bg-gray-50 cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                          !n.read ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900">{n.title}</span>
                            {!n.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {!n.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(n.id);
                            }}
                            className="text-gray-400 hover:text-brand-600"
                            title="Mark read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-sm">
                {user?.name.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-gray-800 leading-none">{user?.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{user?.role}</p>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-900">{user?.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                  <span className="mt-1 inline-block text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    {user?.role}
                  </span>
                </div>

                {user?.role !== 'SUPER_ADMIN' && (
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    Business Settings
                  </button>
                )}

                {user?.isImpersonating && (
                  <button
                    onClick={() => {
                      exitImpersonation();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2 font-medium"
                  >
                    <ArrowLeft className="w-4 h-4 text-amber-600" />
                    Exit Impersonation
                  </button>
                )}

                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
