import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Badge } from '../../components/common/Badge';
import {
  Search,
  Plus,
  MoreVertical,
  Building,
  LogIn,
  CheckCircle,
  XCircle,
  AlertOctagon,
  Trash2,
  Grid,
  Edit,
  ExternalLink,
  Copy,
  Link2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tenantService } from '../../firebase/services';
import { Tenant } from '../../types';

export const ClientsList: React.FC = () => {
  const { impersonateClient } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [clients, setClients] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const all = await tenantService.getAllTenants();
      let filtered = all;
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(t =>
          (t.name && t.name.toLowerCase().includes(s)) ||
          (t.ownerName && t.ownerName.toLowerCase().includes(s)) ||
          (t.mobile && t.mobile.includes(s)) ||
          (t.email && t.email.toLowerCase().includes(s))
        );
      }
      if (planFilter !== 'ALL') {
        filtered = filtered.filter(t => t.planId === planFilter);
      }
      if (statusFilter !== 'ALL') {
        filtered = filtered.filter(t => t.status === statusFilter);
      }
      setClients(filtered);
    } catch (err: any) {
      console.error(err);
      showToast('Failed to load clients', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, planFilter, statusFilter]);

  const handleStatusChange = async (tenantId: string, status: any) => {
    try {
      await tenantService.updateTenantStatus(tenantId, status);
      showToast(`Client status updated to ${status}`, 'success');
      fetchClients();
    } catch (err: any) {
      showToast('Failed to update status', 'error');
    }
    setActiveMenuId(null);
  };

  const handleDelete = async (tenantId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await tenantService.deleteTenant(tenantId);
      showToast(`Client ${name} deleted successfully.`, 'success');
      fetchClients();
    } catch (err) {
      showToast('Failed to delete client.', 'error');
    }
    setActiveMenuId(null);
  };

  const copyLoginLink = (tenant: Tenant) => {
    const url = tenant.slug
      ? `${window.location.origin}/c/${tenant.slug}`
      : `${window.location.origin}/login/${tenant.id}`;
    navigator.clipboard.writeText(url);
    showToast(`Login link copied for ${tenant.name}!`, 'success');
  };

  const handleImpersonate = async (tenantId: string) => {
    const ok = await impersonateClient(tenantId);
    if (ok) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Client Businesses</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage client subscriptions, active modules, and tenant workspaces
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/clients/new')}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search business, owner, mobile..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="ALL">All Plans</option>
            <option value="plan_free">Free Starter</option>
            <option value="plan_basic">Basic Business</option>
            <option value="plan_pro">Pro Trader</option>
            <option value="plan_premium">Enterprise Premium</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="TRIAL">Trial</option>
          </select>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Business</th>
                <th className="py-3 px-4">Owner & Contact</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Modules</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Subscription End</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">Loading clients...</td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">No clients match your filter criteria.</td>
                </tr>
              ) : (
                clients.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                          <p className="text-[11px] text-gray-400">{c.city ? `${c.city}, ${c.state || ''}` : 'India'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-gray-800">{c.ownerName}</p>
                      <p className="text-[11px] text-gray-500">{c.mobile}</p>
                      <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{c.email}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-gray-700">{c.planName}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full text-[11px]">
                        <Grid className="w-3 h-3" />
                        {c.enabledModules?.length || 0} Enabled
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={c.status} />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-600">
                      {c.subscriptionEndDate || 'Perpetual'}
                    </td>
                    <td className="py-3.5 px-4 text-right relative">
                      <div className="inline-flex items-center gap-1">
                        {/* Copy Login Link */}
                        <button
                          onClick={() => copyLoginLink(c)}
                          className="px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          title="Copy client login link"
                        >
                          <Link2 className="w-3.5 h-3.5 text-gray-500" />
                          Link
                        </button>

                        {/* Quick Login As Client Impersonation button */}
                        <button
                          onClick={() => handleImpersonate(c.id)}
                          className="px-2.5 py-1 bg-blue-50 text-brand-700 hover:bg-brand-600 hover:text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                          title="Login as this client"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          Login
                        </button>

                        <button
                          onClick={() => setActiveMenuId(activeMenuId === c.id ? null : c.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Dropdown Menu */}
                      {activeMenuId === c.id && (
                        <div className="absolute right-4 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-30 text-left">
                          <button
                            onClick={() => {
                              copyLoginLink(c);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
                          >
                            <Copy className="w-3.5 h-3.5 text-brand-500" />
                            Copy Client Link
                          </button>
                          <button
                            onClick={() => {
                              navigate(`/admin/clients/${c.id}`);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                            View Details
                          </button>
                          <button
                            onClick={() => {
                              navigate('/admin/module-matrix');
                              setActiveMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Grid className="w-3.5 h-3.5 text-gray-400" />
                            Manage Modules
                          </button>
                          <div className="border-t border-gray-100 my-1" />

                          {c.status !== 'ACTIVE' && (
                            <button
                              onClick={() => handleStatusChange(c.id, 'ACTIVE')}
                              className="w-full px-4 py-2 text-xs text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 font-medium"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              Activate Client
                            </button>
                          )}

                          {c.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleStatusChange(c.id, 'INACTIVE')}
                              className="w-full px-4 py-2 text-xs text-amber-600 hover:bg-amber-50 flex items-center gap-2 font-medium"
                            >
                              <XCircle className="w-3.5 h-3.5 text-amber-500" />
                              Deactivate Client
                            </button>
                          )}

                          {c.status !== 'SUSPENDED' && (
                            <button
                              onClick={() => handleStatusChange(c.id, 'SUSPENDED')}
                              className="w-full px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                            >
                              <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
                              Suspend Client
                            </button>
                          )}

                          <div className="border-t border-gray-100 my-1" />
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            className="w-full px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            Delete Client
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
