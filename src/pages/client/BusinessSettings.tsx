import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Building2, Save, Calendar, CheckCircle } from 'lucide-react';
import { tenantService } from '../../firebase/services';

export const BusinessSettings: React.FC = () => {
  const { tenant, refreshTenant } = useAuth();
  const { showToast } = useNotifications();

  const [name, setName] = useState(tenant?.name || '');
  const [ownerName, setOwnerName] = useState(tenant?.ownerName || '');
  const [mobile, setMobile] = useState(tenant?.mobile || '');
  const [email, setEmail] = useState(tenant?.email || '');
  const [address, setAddress] = useState(tenant?.address || '');
  const [city, setCity] = useState(tenant?.city || '');
  const [state, setState] = useState(tenant?.state || '');
  const [country, setCountry] = useState(tenant?.country || 'India');
  const [gstNumber, setGstNumber] = useState(tenant?.gstNumber || '');
  const [currency, setCurrency] = useState(tenant?.currency || '₹');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || '');
      setOwnerName(tenant.ownerName || '');
      setMobile(tenant.mobile || '');
      setEmail(tenant.email || '');
      setAddress(tenant.address || '');
      setCity(tenant.city || '');
      setState(tenant.state || '');
      setCountry(tenant.country || 'India');
      setGstNumber(tenant.gstNumber || '');
      setCurrency(tenant.currency || '₹');
    }
  }, [tenant]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;
    setSaving(true);
    try {
      await tenantService.updateTenant(tenant.id, {
        name,
        ownerName,
        mobile,
        email,
        address,
        city,
        state,
        country,
        gstNumber,
        currency,
      });

      showToast('Business profile updated successfully.', 'success');
      await refreshTenant();
    } catch (err) {
      showToast('Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Business Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Manage your business legal profile, tax registration, and billing configuration
        </p>
      </div>

      {/* Subscription Status Card */}
      {tenant && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Subscription</span>
            <h3 className="text-lg font-black text-brand-700 mt-0.5">{tenant.planName || tenant.planId || 'Business Plan'}</h3>
            <p className="text-xs text-gray-500">
              Valid until: <strong className="font-mono text-gray-800">{tenant.subscriptionEndDate || 'Perpetual'}</strong>
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-xs">
            {tenant.status || 'ACTIVE'}
          </span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Building2 className="w-5 h-5 text-brand-600" />
          <h3 className="font-bold text-sm text-gray-900">Legal Enterprise Profile</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Business Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Business Owner *</label>
            <input
              type="text"
              required
              value={ownerName}
              onChange={e => setOwnerName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Contact Phone *</label>
            <input
              type="tel"
              required
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono font-semibold focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Business Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">GSTIN Number</label>
            <input
              type="text"
              value={gstNumber}
              onChange={e => setGstNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Currency Symbol</label>
            <input
              type="text"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-transform active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Business Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
