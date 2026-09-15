import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../common/Navbar';
import { Sidebar } from '../common/Sidebar';
import { MobileNav } from '../common/MobileNav';
import { GiveGetModal } from '../common/GiveGetModal';
import { AlertTriangle } from 'lucide-react';

export const ClientLayout: React.FC = () => {
  const { user, tenant, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickTxnOpen, setQuickTxnOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-sm font-semibold">
        Loading EntriFa workspace...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'SUPER_ADMIN' && !user.isImpersonating) {
    return <Navigate to="/admin" replace />;
  }

  // Check subscription expiry warning
  let isExpiringSoon = false;
  let daysLeft = 0;
  if (tenant?.subscriptionEndDate) {
    const end = new Date(tenant.subscriptionEndDate).getTime();
    const diff = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff <= 15 && diff >= 0) {
      isExpiringSoon = true;
      daysLeft = diff;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col pb-16 lg:pb-0">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Subscription Expiring Soon Warning Banner */}
        {isExpiringSoon && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>
                Your subscription expires in <strong>{daysLeft} days</strong>. Please renew soon to prevent service interruption.
              </span>
            </div>
            <span className="text-[10px] bg-amber-200 px-2 py-0.5 rounded font-bold uppercase">
              Renewal Pending
            </span>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        onOpenQuickTxn={() => setQuickTxnOpen(true)}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      {/* Fast Global Transaction Modal */}
      <GiveGetModal
        isOpen={quickTxnOpen}
        onClose={() => setQuickTxnOpen(false)}
        defaultType="GET"
        onSuccess={() => {
          // Trigger local page refresh if needed
          window.location.reload();
        }}
      />
    </div>
  );
};
