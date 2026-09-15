import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Badge } from '../../components/common/Badge';
import {
  Building2,
  ArrowLeft,
  LogIn,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Grid,
  Users,
  CheckCircle,
  AlertTriangle,
  Copy,
  Link2,
} from 'lucide-react';
import { tenantService, systemService } from '../../firebase/services';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export const ClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { impersonateClient } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const tenant = await tenantService.getTenant(id!);
        if (!tenant) {
          setData(null);
          setLoading(false);
          return;
        }

        const [custSnap, txnSnap, staffSnap, plans] = await Promise.all([
          getDocs(collection(db, 'tenants', id!, 'customers')).catch(() => ({ size: 0 })),
          getDocs(collection(db, 'tenants', id!, 'transactions')).catch(() => ({ size: 0 })),
          getDocs(collection(db, 'tenants', id!, 'staff')).catch(() => ({ size: 0 })),
          systemService.getPlans().catch(() => []),
        ]);

        const plan = plans.find((p: any) => p.id === tenant.planId) || {
          name: tenant.planId,
          price: 999,
          maxCustomers: 500,
          maxTransactions: 2000,
          maxStaff: 5,
        };

        setData({
          tenant,
          plan,
          metrics: {
            customerCount: custSnap.size || 0,
            transactionCount: txnSnap.size || 0,
            staffCount: staffSnap.size || 0,
          },
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-sm font-semibold text-gray-500">Loading client workspace details...</div>;
  }

  if (!data?.tenant) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 text-sm">Client not found.</p>
        <button onClick={() => navigate('/admin/clients')} className="mt-4 text-brand-600 font-bold text-xs">
          &larr; Return to Clients List
        </button>
      </div>
    );
  }

  const { tenant, plan, clientAdmin, metrics } = data;

  const handleImpersonate = async () => {
    const ok = await impersonateClient(tenant.id);
    if (ok) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/clients')}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">{tenant.name}</h1>
              <Badge status={tenant.status} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Tenant ID: <span className="font-mono text-gray-700">{tenant.id}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const url = tenant.slug ? `${window.location.origin}/c/${tenant.slug}` : `${window.location.origin}/login/${tenant.id}`;
              navigator.clipboard.writeText(url);
              showToast('Client branded login link copied!', 'success');
            }}
            className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Login Link
          </button>

          <button
            onClick={handleImpersonate}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            Login as Client Admin
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm text-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Customers</span>
          <p className="text-2xl font-black text-gray-900 mt-1">{metrics.customerCount}</p>
          <span className="text-[10px] text-gray-500">Max limit: {plan?.maxCustomers || 500}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm text-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Total Transactions</span>
          <p className="text-2xl font-black text-gray-900 mt-1">{metrics.transactionCount}</p>
          <span className="text-[10px] text-gray-500">Max limit: {plan?.maxTransactions || 2000}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm text-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Staff Accounts</span>
          <p className="text-2xl font-black text-gray-900 mt-1">{metrics.staffCount}</p>
          <span className="text-[10px] text-gray-500">Max limit: {plan?.maxStaff || 5}</span>
        </div>
      </div>

      {/* Business & Plan Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Profile */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-600" />
            Business Information
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Owner Name:</span>
              <span className="font-bold text-gray-900">{tenant.ownerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Phone:</span>
              <span className="font-semibold text-gray-800">{tenant.mobile}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email:</span>
              <span className="font-semibold text-gray-800">{tenant.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Address:</span>
              <span className="font-semibold text-gray-800 text-right max-w-xs">{tenant.address || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">City / State:</span>
              <span className="font-semibold text-gray-800">{tenant.city}, {tenant.state}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">GSTIN / Tax ID:</span>
              <span className="font-mono font-bold text-gray-900">{tenant.gstNumber || 'Unregistered'}</span>
            </div>
          </div>
        </div>

        {/* Subscription details */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-600" />
            Subscription & Plan
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Plan Tier:</span>
              <span className="font-extrabold text-brand-600 text-sm">{plan?.name || tenant.planId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Subscription Price:</span>
              <span className="font-mono font-bold text-gray-900">₹{plan?.price || 0} / month</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Start Date:</span>
              <span className="font-mono text-gray-700">{tenant.subscriptionStartDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Expiry Date:</span>
              <span className="font-mono font-bold text-gray-900">{tenant.subscriptionEndDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Currency Symbol:</span>
              <span className="font-bold text-gray-900">{tenant.currency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enabled Modules List */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
            <Grid className="w-4 h-4 text-brand-600" />
            Active Modules ({tenant.enabledModules?.length || 0})
          </h3>
          <button
            onClick={() => navigate('/admin/module-matrix')}
            className="text-xs text-brand-600 hover:text-brand-800 font-bold"
          >
            Edit in Module Matrix &rarr;
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {tenant.enabledModules?.map((modId: string) => (
            <span
              key={modId}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-800 border border-brand-200 rounded-xl text-xs font-semibold"
            >
              <CheckCircle className="w-3.5 h-3.5 text-brand-600" />
              {modId.charAt(0).toUpperCase() + modId.slice(1)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
