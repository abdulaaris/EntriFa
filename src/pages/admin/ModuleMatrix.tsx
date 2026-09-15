import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Check, X, ShieldAlert, Layers } from 'lucide-react';
import { tenantService } from '../../firebase/services';
import { Link } from 'react-router-dom';

const ALL_MODULES = [
  { id: 'dashboard', name: 'Dashboard', description: 'Real-time financial KPI cards & cashflow summary' },
  { id: 'customers', name: 'Customers & Khata', description: 'Customer profiles, contact logs, credit limits' },
  { id: 'suppliers', name: 'Suppliers', description: 'Supplier ledgers, purchase accounts & payables' },
  { id: 'ledger', name: 'Digital Ledger', description: 'Digital credit/debit transaction timeline' },
  { id: 'transactions', name: 'Transactions', description: 'Fast Give/Get entries & payment recordings' },
  { id: 'expenses', name: 'Expenses', description: 'Business operational expenses & attachments' },
  { id: 'income', name: 'Income', description: 'Direct counter revenue & extra income tracking' },
  { id: 'products', name: 'Products & Inventory', description: 'Stock tracking, low stock alerts & pricing' },
  { id: 'invoices', name: 'Invoices', description: 'Professional PDF tax invoice generator' },
  { id: 'reports', name: 'Reports & Statements', description: 'Day Book, Profit & Loss, Ledger statements' },
  { id: 'staff', name: 'Staff Management', description: 'Role-based multi-user staff permissions' },
  { id: 'notifications', name: 'Automated Reminders', description: 'Payment due notifications & stock alerts' },
];

export const ModuleMatrix: React.FC = () => {
  const { showToast } = useNotifications();
  const [matrix, setMatrix] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchMatrix = async () => {
    try {
      const tenants = await tenantService.getAllTenants();
      setMatrix(
        tenants.map(t => ({
          tenantId: t.id,
          name: t.name,
          planId: t.planId || 'plan_basic',
          enabledModules: t.enabledModules || ['dashboard'],
        }))
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to load client modules', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const handleToggle = async (tenantId: string, moduleId: string, currentlyEnabled: boolean) => {
    if (moduleId === 'dashboard') {
      showToast('Dashboard is core and cannot be disabled.', 'info');
      return;
    }

    const key = `${tenantId}_${moduleId}`;
    setToggling(key);

    try {
      const target = matrix.find(t => t.tenantId === tenantId);
      const currentMods: string[] = target?.enabledModules || [];
      const updated = !currentlyEnabled
        ? [...currentMods, moduleId]
        : currentMods.filter(m => m !== moduleId);

      await tenantService.updateTenantModules(tenantId, updated);

      showToast(
        `Module ${moduleId} ${!currentlyEnabled ? 'ENABLED' : 'DISABLED'}!`,
        'success'
      );

      setMatrix(prev =>
        prev.map(row => (row.tenantId === tenantId ? { ...row, enabledModules: updated } : row))
      );
    } catch (err) {
      showToast('Failed to update module state.', 'error');
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm font-semibold text-gray-500">Loading module matrix...</div>;
  }

  const modules = ALL_MODULES;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Client Module Matrix</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Granular real-time feature gating per business tenant. Toggling here instantly activates or blocks routes and APIs.
        </p>
      </div>

      {/* Notice Banner */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center gap-3 text-xs text-blue-950">
        <ShieldAlert className="w-5 h-5 text-brand-600 shrink-0" />
        <p>
          <strong>Security Notice:</strong> Disabling any module immediately removes it from the client's sidebar, removes its dashboard widgets, blocks client-side route access, and strictly rejects backend API requests with <strong>403 Forbidden</strong>.
        </p>
      </div>

      {/* Interactive Matrix Grid */}
      {matrix.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 text-sm">No Client Businesses Provisioned</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Provision your first business client in the Add Client Wizard to configure feature gating.
          </p>
          <Link
            to="/admin/clients/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-sm"
          >
            Provision Client Now
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 font-bold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 w-48 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    Module / Feature
                  </th>
                {matrix.map(client => (
                  <th key={client.tenantId} className="py-3 px-4 text-center min-w-[130px]">
                    <div className="font-bold text-gray-900 text-xs truncate max-w-[120px] mx-auto">
                      {client.name}
                    </div>
                    <span className="text-[10px] text-gray-400 block font-normal">
                      {client.planId.replace('plan_', '').toUpperCase()}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {modules.map(mod => (
                <tr key={mod.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3 px-4 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="font-bold text-gray-900 text-xs">{mod.name}</div>
                    <div className="text-[10px] text-gray-400 font-normal truncate max-w-[180px]">
                      {mod.description}
                    </div>
                  </td>

                  {matrix.map(client => {
                    const isEnabled = client.enabledModules?.includes(mod.id);
                    const isCore = mod.id === 'dashboard';
                    const isPending = toggling === `${client.tenantId}_${mod.id}`;

                    return (
                      <td key={client.tenantId} className="py-3 px-4 text-center">
                        <button
                          type="button"
                          disabled={isCore || isPending}
                          onClick={() => handleToggle(client.tenantId, mod.id, isEnabled)}
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all ${
                            isEnabled
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-sm'
                              : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                          } ${isCore ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-90'}`}
                          title={isEnabled ? `Enabled. Click to Disable for ${client.name}` : `Disabled. Click to Enable for ${client.name}`}
                        >
                          {isEnabled ? (
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <X className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};
