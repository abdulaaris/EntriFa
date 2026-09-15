import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, PlusCircle, FileBarChart, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MobileNavProps {
  onOpenQuickTxn?: () => void;
  onOpenSidebar?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenQuickTxn, onOpenSidebar }) => {
  const { user } = useAuth();
  if (user?.role === 'SUPER_ADMIN') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 lg:hidden shadow-lg">
      <div className="grid grid-cols-5 h-16 items-center">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center text-[10px] font-semibold ${
              isActive ? 'text-brand-600' : 'text-gray-500 hover:text-gray-900'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/customers"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center text-[10px] font-semibold ${
              isActive ? 'text-brand-600' : 'text-gray-500 hover:text-gray-900'
            }`
          }
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Customers</span>
        </NavLink>

        {/* Center Big Add Transaction Action */}
        <div className="flex justify-center -mt-5">
          <button
            onClick={onOpenQuickTxn}
            className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition-transform active:scale-95"
            title="Fast Transaction"
          >
            <PlusCircle className="w-7 h-7" />
          </button>
        </div>

        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center text-[10px] font-semibold ${
              isActive ? 'text-brand-600' : 'text-gray-500 hover:text-gray-900'
            }`
          }
        >
          <FileBarChart className="w-5 h-5 mb-0.5" />
          <span>Reports</span>
        </NavLink>

        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center text-[10px] font-semibold text-gray-500 hover:text-gray-900"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </div>
    </div>
  );
};
