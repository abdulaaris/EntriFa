import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ShieldCheck,
  Grid,
  Layers,
  CreditCard,
  DollarSign,
  History,
  Settings,
  BookOpen,
  ArrowLeftRight,
  Truck,
  TrendingDown,
  TrendingUp,
  Package,
  Boxes,
  Receipt,
  FileBarChart,
  UserCheck,
  Building,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, tenant, hasModule } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Super Admin Navigation Items
  const superAdminNav = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Clients', path: '/admin/clients', icon: Building },
    { label: 'Add Client', path: '/admin/clients/new', icon: UserPlus },
    { label: 'Module Matrix', path: '/admin/module-matrix', icon: Grid },
    { label: 'SaaS Plans', path: '/admin/plans', icon: Layers },
    { label: 'Modules Master', path: '/admin/modules', icon: ShieldCheck },
    { label: 'Subscription Payments', path: '/admin/payments', icon: DollarSign },
    { label: 'Activity Logs', path: '/admin/logs', icon: History },
    { label: 'System Settings', path: '/admin/settings', icon: Settings },
  ];

  // Client Navigation Items (Checked strictly against enabledModules)
  const clientNavCandidate = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', path: '/customers', icon: Users },
    { id: 'suppliers', label: 'Suppliers', path: '/suppliers', icon: Truck },
    { id: 'transactions', label: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
    { id: 'ledger', label: 'Khata Ledger', path: '/ledger', icon: BookOpen },
    { id: 'expenses', label: 'Expenses', path: '/expenses', icon: TrendingDown },
    { id: 'income', label: 'Income', path: '/income', icon: TrendingUp },
    { id: 'products', label: 'Products', path: '/products', icon: Package },
    { id: 'inventory', label: 'Inventory', path: '/inventory', icon: Boxes },
    { id: 'invoices', label: 'Invoices', path: '/invoices', icon: Receipt },
    { id: 'reports', label: 'Reports', path: '/reports', icon: FileBarChart },
    { id: 'staff', label: 'Staff & Roles', path: '/staff', icon: UserCheck },
    { id: 'settings', label: 'Business Settings', path: '/settings', icon: Settings },
  ];

  // Strictly filter client items: ONLY include if enabled in tenant
  const clientNav = clientNavCandidate.filter(item => {
    if (item.id === 'settings') return true; // Settings always accessible by admin
    return hasModule(item.id);
  });

  const navItems = isSuperAdmin ? superAdminNav : clientNav;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-extrabold text-base shadow-sm">
              E
            </div>
            <div>
              <span className="font-bold text-gray-900 tracking-tight text-base">EntriFa</span>
              <span className="text-[10px] text-gray-400 font-medium ml-1.5 uppercase">
                {isSuperAdmin ? 'Admin' : 'Business'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            {isSuperAdmin ? 'Platform Management' : 'Business Workspace'}
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin' || item.path === '/dashboard'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-bold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-brand-600' : 'text-gray-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Tenant Footer Info */}
        {!isSuperAdmin && tenant && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/70">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-800 truncate max-w-[140px]">{tenant.name}</p>
                <p className="text-[10px] text-gray-500">{tenant.planName || 'Pro Plan'}</p>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                Active
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
