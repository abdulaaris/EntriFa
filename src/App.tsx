import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Layouts
import { SuperAdminLayout } from './components/layout/SuperAdminLayout';
import { ClientLayout } from './components/layout/ClientLayout';

// Auth
import { LoginPage } from './pages/auth/LoginPage';
import { SuperAdminLoginPage } from './pages/auth/SuperAdminLoginPage';
import { SuperAdminSetupPage } from './pages/auth/SuperAdminSetupPage';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';

// Super Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ClientsList } from './pages/admin/ClientsList';
import { AddClientWizard } from './pages/admin/AddClientWizard';
import { ClientDetails } from './pages/admin/ClientDetails';
import { ModuleMatrix } from './pages/admin/ModuleMatrix';
import { PlansManagement } from './pages/admin/PlansManagement';
import { SubscriptionPayments } from './pages/admin/SubscriptionPayments';
import { ActivityLogs } from './pages/admin/ActivityLogs';
import { SystemSettings } from './pages/admin/SystemSettings';

// Client Workspace Pages
import { ClientDashboard } from './pages/client/ClientDashboard';
import { CustomersList } from './pages/client/CustomersList';
import { CustomerLedgerDetail } from './pages/client/CustomerLedgerDetail';
import { SuppliersList } from './pages/client/SuppliersList';
import { TransactionsList } from './pages/client/TransactionsList';
import { ExpensesPage } from './pages/client/ExpensesPage';
import { IncomePage } from './pages/client/IncomePage';
import { ProductsPage } from './pages/client/ProductsPage';
import { InvoicesPage } from './pages/client/InvoicesPage';
import { InvoiceCreateEdit } from './pages/client/InvoiceCreateEdit';
import { ReportsPage } from './pages/client/ReportsPage';
import { StaffPage } from './pages/client/StaffPage';
import { BusinessSettings } from './pages/client/BusinessSettings';

// Dynamic Module Guard for Client Routes
const ModuleGuard: React.FC<{ moduleId: string; children: React.ReactElement }> = ({ moduleId, children }) => {
  const { hasModule, user } = useAuth();
  if (user?.role === 'SUPER_ADMIN') return children;
  if (!hasModule(moduleId)) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          ⚠️
        </div>
        <h3 className="text-lg font-bold text-gray-900">Module Locked</h3>
        <p className="text-xs text-gray-500">
          The <strong>{moduleId}</strong> module is currently not enabled for your subscription plan. Contact EntriFa Super Admin to upgrade.
        </p>
      </div>
    );
  }
  return children;
};

// Root Redirector based on user role
const RootRedirector: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="p-8 text-center text-xs text-gray-400">Loading EntriFa...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <PwaInstallPrompt />
          <Routes>
            {/* Direct & Tenant Login Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/:tenantId" element={<LoginPage />} />
            <Route path="/c/:tenantSlug" element={<LoginPage />} />

            {/* Super Admin Dedicated Login & Setup */}
            <Route path="/admin/login" element={<SuperAdminLoginPage />} />
            <Route path="/admin/setup" element={<SuperAdminSetupPage />} />

            {/* Super Admin Protected Portal */}
            <Route path="/admin" element={<SuperAdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="clients" element={<ClientsList />} />
              <Route path="clients/new" element={<AddClientWizard />} />
              <Route path="clients/:id" element={<ClientDetails />} />
              <Route path="module-matrix" element={<ModuleMatrix />} />
              <Route path="modules" element={<ModuleMatrix />} />
              <Route path="plans" element={<PlansManagement />} />
              <Route path="payments" element={<SubscriptionPayments />} />
              <Route path="logs" element={<ActivityLogs />} />
              <Route path="settings" element={<SystemSettings />} />
            </Route>

            {/* Client Business Workspace (EntriFa Business) */}
            <Route path="/" element={<ClientLayout />}>
              <Route index element={<RootRedirector />} />
              <Route path="dashboard" element={<ModuleGuard moduleId="dashboard"><ClientDashboard /></ModuleGuard>} />
              <Route path="customers" element={<ModuleGuard moduleId="customers"><CustomersList /></ModuleGuard>} />
              <Route path="customers/:id" element={<ModuleGuard moduleId="customers"><CustomerLedgerDetail /></ModuleGuard>} />
              <Route path="ledger" element={<ModuleGuard moduleId="ledger"><CustomersList /></ModuleGuard>} />
              <Route path="suppliers" element={<ModuleGuard moduleId="suppliers"><SuppliersList /></ModuleGuard>} />
              <Route path="transactions" element={<ModuleGuard moduleId="transactions"><TransactionsList /></ModuleGuard>} />
              <Route path="expenses" element={<ModuleGuard moduleId="expenses"><ExpensesPage /></ModuleGuard>} />
              <Route path="income" element={<ModuleGuard moduleId="income"><IncomePage /></ModuleGuard>} />
              <Route path="products" element={<ModuleGuard moduleId="products"><ProductsPage /></ModuleGuard>} />
              <Route path="inventory" element={<ModuleGuard moduleId="inventory"><ProductsPage /></ModuleGuard>} />
              <Route path="invoices" element={<ModuleGuard moduleId="invoices"><InvoicesPage /></ModuleGuard>} />
              <Route path="invoices/new" element={<ModuleGuard moduleId="invoices"><InvoiceCreateEdit /></ModuleGuard>} />
              <Route path="reports" element={<ModuleGuard moduleId="reports"><ReportsPage /></ModuleGuard>} />
              <Route path="staff" element={<ModuleGuard moduleId="staff"><StaffPage /></ModuleGuard>} />
              <Route path="settings" element={<BusinessSettings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<RootRedirector />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
