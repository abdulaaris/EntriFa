import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Shield, Check, ArrowLeft, Layers, CheckSquare, Copy, ExternalLink, Sparkles } from 'lucide-react';
import { tenantService } from '../../firebase/services';

const ALL_MODULES = [
  { id: 'dashboard', name: 'Dashboard', desc: 'Overview, analytics & KPIs' },
  { id: 'customers', name: 'Customers', desc: 'Customer khata & balances' },
  { id: 'suppliers', name: 'Suppliers', desc: 'Supplier accounts & payables' },
  { id: 'ledger', name: 'Ledger', desc: 'Digital Khata timeline' },
  { id: 'transactions', name: 'Transactions', desc: 'GIVE & GET fast records' },
  { id: 'payments', name: 'Payments', desc: 'Settlements & payment modes' },
  { id: 'expenses', name: 'Expenses', desc: 'Operational business expenses' },
  { id: 'income', name: 'Income', desc: 'Direct & retail counter income' },
  { id: 'products', name: 'Products', desc: 'Catalog with prices & units' },
  { id: 'inventory', name: 'Inventory', desc: 'Stock in/out & low stock alerts' },
  { id: 'invoices', name: 'Invoices', desc: 'Tax invoice builder & PDF' },
  { id: 'reports', name: 'Reports', desc: 'Day Book, P&L, Statements' },
  { id: 'staff', name: 'Staff', desc: 'Staff accounts & RBAC matrix' },
  { id: 'notifications', name: 'Notifications', desc: 'Due alerts & stock triggers' },
];

export const AddClientWizard: React.FC = () => {
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [gstNumber, setGstNumber] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [planId, setPlanId] = useState('plan_pro');
  const [status, setStatus] = useState('ACTIVE');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
  );

  // Selected Modules (default all enabled)
  const [selectedModules, setSelectedModules] = useState<string[]>(
    ALL_MODULES.map(m => m.id)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<{
    tenantId: string;
    slug: string;
    businessName: string;
    adminEmail: string;
    adminPassword?: string;
    directLoginUrl: string;
    slugLoginUrl: string;
  } | null>(null);

  const toggleModule = (id: string) => {
    if (id === 'dashboard') return; // Dashboard is core
    setSelectedModules(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedModules(ALL_MODULES.map(m => m.id));
    } else {
      setSelectedModules(['dashboard']);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showToast('Admin password must be at least 6 characters', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await tenantService.createTenant({
        businessName,
        ownerName,
        mobile,
        email,
        address,
        city,
        state,
        country,
        gstNumber,
        adminPassword: password,
        planId,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        enabledModules: selectedModules,
      });

      setCreatedTenant({
        tenantId: res.tenantId,
        slug: res.slug,
        businessName,
        adminEmail: email.trim(),
        adminPassword: password,
        directLoginUrl: `${window.location.origin}/login/${res.tenantId}`,
        slugLoginUrl: `${window.location.origin}/c/${res.slug}`,
      });

      showToast(`Client "${businessName}" successfully provisioned!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error creating client', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/clients')}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Provision Client Business</h1>
          <p className="text-xs text-gray-500">
            Automated multi-tenant workspace & administrator initialization
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Business Profile */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Building2 className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-sm text-gray-900">1. Business Profile Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Business Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Electronics Ltd"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Owner Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rajesh Verma"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Business Email *
              </label>
              <input
                type="email"
                required
                placeholder="admin@apexelectronics.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Street Address
              </label>
              <input
                type="text"
                placeholder="Shop 12, High Street Plaza"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                City
              </label>
              <input
                type="text"
                placeholder="Mumbai"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                GST / Tax Registration Number
              </label>
              <input
                type="text"
                placeholder="27ABCDE1234F1Z5"
                value={gstNumber}
                onChange={e => setGstNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Client Admin Credentials */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Shield className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-sm text-gray-900">2. Client Admin Credentials</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Admin Username (Optional, defaults to Email)
              </label>
              <input
                type="text"
                placeholder="Leave blank to use email"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Initial Password *
              </label>
              <input
                type="password"
                required
                placeholder="Min 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Subscription & Plan */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Layers className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-sm text-gray-900">3. SaaS Subscription Plan & Validity</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Plan Tier *
              </label>
              <select
                value={planId}
                onChange={e => setPlanId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="plan_free">Free Starter (₹0/mo)</option>
                <option value="plan_basic">Basic Business (₹499/mo)</option>
                <option value="plan_pro">Pro Trader (₹999/mo)</option>
                <option value="plan_premium">Enterprise Premium (₹1999/mo)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                End Date (Expiry)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Step 4: Dynamic Module Selection Matrix */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-brand-600" />
              <div>
                <h3 className="font-bold text-sm text-gray-900">4. Dynamic Module Selection</h3>
                <p className="text-[11px] text-gray-500">
                  Unchecked modules will be completely blocked in client workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleSelectAll(true)}
                className="text-brand-600 hover:text-brand-800"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => handleSelectAll(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {ALL_MODULES.map(mod => {
              const isChecked = selectedModules.includes(mod.id);
              const isDashboard = mod.id === 'dashboard';

              return (
                <div
                  key={mod.id}
                  onClick={() => !isDashboard && toggleModule(mod.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                    isChecked
                      ? 'border-brand-500 bg-brand-50/40 text-brand-950'
                      : 'border-gray-200 bg-gray-50/50 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border text-white transition-colors ${
                      isChecked
                        ? 'bg-brand-600 border-brand-600'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <p className="font-bold text-xs leading-none text-gray-900">
                      {mod.name} {isDashboard && <span className="text-[9px] text-brand-600 font-bold">(Core)</span>}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">{mod.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/clients')}
            className="px-5 py-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/25 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? 'Provisioning Workspace...' : 'Create Client & Provision Workspace'}
          </button>
        </div>
      </form>

      {/* Success Modal */}
      {createdTenant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Client Workspace Provisioned!</h2>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                <strong>{createdTenant.businessName}</strong> is now live on EntriFa. Share the login link below with the business owner.
              </p>
            </div>

            <div className="space-y-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
              {/* Clean Slug URL */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Branded Login Link (Recommended)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdTenant.slugLoginUrl}
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-800 select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(createdTenant.slugLoginUrl, 'Branded Login Link')}
                    className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                </div>
              </div>

              {/* Direct Tenant ID URL */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Direct Tenant ID URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdTenant.directLoginUrl}
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-700 select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(createdTenant.directLoginUrl, 'Direct Tenant URL')}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                </div>
              </div>

              {/* Admin Credentials */}
              <div className="pt-2 border-t border-gray-200/80 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Admin Email</span>
                  <span className="font-semibold text-gray-900 break-all">{createdTenant.adminEmail}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Password</span>
                  <span className="font-mono font-semibold text-gray-900">{createdTenant.adminPassword}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => {
                  const details = `EntriFa Workspace Access\nBusiness: ${createdTenant.businessName}\nLogin URL: ${createdTenant.slugLoginUrl}\nEmail: ${createdTenant.adminEmail}\nPassword: ${createdTenant.adminPassword}`;
                  copyToClipboard(details, 'All workspace access details');
                }}
                className="w-full sm:w-auto flex-1 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                Copy All Details
              </button>

              <a
                href={createdTenant.slugLoginUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto py-2.5 px-4 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                Test Link
              </a>

              <button
                onClick={() => navigate('/admin/clients')}
                className="w-full sm:w-auto flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20"
              >
                Done & View Clients
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
