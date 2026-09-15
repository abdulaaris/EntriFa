import React, { useEffect, useState } from 'react';
import { StatCard } from '../../components/common/StatCard';
import {
  Building2,
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  Activity,
  ShieldCheck,
  ArrowUpRight,
  Clock,
  Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tenantService, systemService } from '../../firebase/services';
import { Tenant, ActivityLogItem } from '../../types';

export const AdminDashboard: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const [tenantList, recentLogs] = await Promise.all([
          tenantService.getAllTenants().catch(() => []),
          systemService.getActivityLogs().catch(() => []),
        ]);
        setTenants(tenantList);
        setLogs(recentLogs.slice(0, 10));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-sm font-semibold text-gray-500">Loading Super Admin analytics...</div>;
  }

  const totalClients = tenants.length;
  const activeClients = tenants.filter(t => t.status === 'ACTIVE').length;
  const trialClients = tenants.filter(t => t.status === 'TRIAL').length;
  const inactiveClients = tenants.filter(t => t.status === 'INACTIVE' || t.status === 'SUSPENDED').length;
  
  // Approximate revenue based on active plans
  const planPrices: Record<string, number> = {
    plan_free: 0,
    plan_basic: 499,
    plan_pro: 999,
    plan_premium: 1999,
  };
  const monthlyRevenue = tenants
    .filter(t => t.status === 'ACTIVE')
    .reduce((sum, t) => sum + (planPrices[t.planId] || 0), 0);
  const totalRevenue = monthlyRevenue * 3; // estimated annualized/quarterly

  // Module adoption map
  const moduleCounts: Record<string, number> = {};
  tenants.forEach(t => {
    (t.enabledModules || []).forEach(m => {
      moduleCounts[m] = (moduleCounts[m] || 0) + 1;
    });
  });
  const moduleList = Object.entries(moduleCounts).map(([id, count]) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    count,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">EntriFa Super Admin</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Centralized multi-tenant SaaS control center & business ecosystem
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/clients/new')}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all active:scale-95"
          >
            <Building2 className="w-4 h-4" />
            + Provision New Client
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Clients"
          value={totalClients}
          subtitle={`${activeClients} active, ${trialClients} trial`}
          icon={Building2}
          variant="blue"
        />
        <StatCard
          title="Active Subscriptions"
          value={activeClients}
          subtitle={`${inactiveClients} inactive / suspended`}
          icon={CreditCard}
          variant="green"
        />
        <StatCard
          title="Estimated Monthly MRR"
          value={`₹${monthlyRevenue.toLocaleString()}`}
          subtitle={`Annual run rate: ₹${(monthlyRevenue * 12).toLocaleString()}`}
          icon={DollarSign}
          variant="green"
        />
        <StatCard
          title="Client Businesses"
          value={totalClients}
          subtitle="Provisioned Tenants"
          icon={Layers}
          variant="amber"
        />
      </div>

      {/* Analytics Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Growth Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-gray-900">Tenant Workspaces Overview</h3>
              <p className="text-xs text-gray-500">Live breakdown of registered client businesses</p>
            </div>
          </div>

          {tenants.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 border border-dashed border-gray-200 rounded-xl">
              <Building2 className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-xs font-bold text-gray-700">No client businesses provisioned yet</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Click "+ Provision New Client" above to onboard your first business.</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xs text-emerald-700 font-bold">Active</p>
                  <p className="text-xl font-black text-emerald-900">{activeClients}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-xs text-amber-700 font-bold">Trial</p>
                  <p className="text-xl font-black text-amber-900">{trialClients}</p>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <p className="text-xs text-rose-700 font-bold">Inactive</p>
                  <p className="text-xl font-black text-rose-900">{inactiveClients}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Module Adoption Matrix Usage */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-gray-900">Module Adoption</h3>
              <p className="text-xs text-gray-500">Active tenant activation by module</p>
            </div>
            <button
              onClick={() => navigate('/admin/module-matrix')}
              className="text-xs text-brand-600 hover:text-brand-800 font-bold"
            >
              Matrix &rarr;
            </button>
          </div>

          {moduleList.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">
              No module activation data yet.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {moduleList.map((mod: any) => (
                <div key={mod.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">{mod.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-brand-600 h-full rounded-full"
                        style={{ width: `${Math.min(100, (mod.count / (totalClients || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="font-bold text-gray-900 w-5 text-right">{mod.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Client Activity Feed */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-600" />
            <h3 className="font-bold text-sm text-gray-900">Recent Platform Activity</h3>
          </div>
          <button
            onClick={() => navigate('/admin/logs')}
            className="text-xs text-brand-600 hover:text-brand-800 font-bold"
          >
            View All Audit Logs &rarr;
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            No platform activity recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log: any) => (
              <div key={log.id} className="p-4 flex items-center justify-between text-xs hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center font-bold">
                    {(log.userName || 'U').charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">
                      {log.userName || 'System'} <span className="font-normal text-gray-500">({log.role || 'Admin'})</span>
                    </p>
                    <p className="text-gray-600 mt-0.5">
                      Action: <strong className="font-semibold text-gray-800">{log.action}</strong> in <span className="text-brand-600">{log.module}</span>
                      {log.tenantName && ` • Client: ${log.tenantName}`}
                    </p>
                  </div>
                </div>
                <div className="text-right text-gray-400">
                  <p className="font-mono">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</p>
                  <p className="text-[10px]">{log.timestamp ? new Date(log.timestamp).toLocaleDateString() : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
