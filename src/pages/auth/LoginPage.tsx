import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { tenantService } from '../../firebase/services';
import { Tenant } from '../../types';
import { PwaInstallPrompt } from '../../components/common/PwaInstallPrompt';
import { Lock, Mail, ArrowRight, Building2, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { tenantId, tenantSlug } = useParams<{ tenantId?: string; tenantSlug?: string }>();
  const { login, resetPassword, user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tenant branding state if opened via unique client login link
  const [targetTenant, setTargetTenant] = useState<Tenant | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (user && !isLoading) {
      if (user.role === 'SUPER_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, isLoading]);

  // Fetch tenant branding if tenantId or slug is in URL
  useEffect(() => {
    const fetchTenantInfo = async () => {
      if (tenantId) {
        setLoadingTenant(true);
        const t = await tenantService.getTenant(tenantId);
        setTargetTenant(t);
        setLoadingTenant(false);
      } else if (tenantSlug) {
        setLoadingTenant(true);
        const t = await tenantService.getTenantBySlug(tenantSlug);
        setTargetTenant(t);
        setLoadingTenant(false);
      }
    };
    fetchTenantInfo();
  }, [tenantId, tenantSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const requiredTenantId = targetTenant?.id || tenantId;
      const success = await login(email, password, requiredTenantId);
      if (success) {
        // Redirect handled by useEffect
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert('Please enter your email address in the field first.');
      return;
    }
    try {
      await resetPassword(email);
      setForgotSent(true);
      setTimeout(() => setForgotSent(false), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to send password reset email.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-blue-50/40 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 text-white font-black text-3xl shadow-xl shadow-brand-500/30 mb-3">
          E
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">EntriFa</h1>
        <p className="mt-1 text-sm font-semibold text-gray-500">Simple Business. Smart Accounts.</p>

        {/* Dynamic Tenant Branding Badge if loaded via unique link */}
        {targetTenant ? (
          <div className="mt-4 p-3 bg-white border border-brand-200 rounded-2xl shadow-sm flex items-center justify-center gap-3">
            {targetTenant.logo ? (
              <img src={targetTenant.logo} alt={targetTenant.name} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            <div className="text-left">
              <h3 className="font-bold text-sm text-gray-900 leading-tight">{targetTenant.name}</h3>
              <p className="text-[10px] text-gray-400">Dedicated Business Workspace</p>
            </div>
          </div>
        ) : (
          <span className="mt-2 inline-block text-[11px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
            Multi-Tenant Business Workspace
          </span>
        )}
      </div>

      {/* Main Login Form Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-gray-200/50 rounded-3xl border border-gray-200 sm:px-10">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {forgotSent && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
              Password reset link sent to your email. Please check your inbox.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@business.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-brand-600 hover:text-brand-800 font-semibold"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In to Workspace'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Super Admin Link Footer (for platform owner) */}
          <div className="mt-8 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Are you the SaaS platform owner?{' '}
              <a href="/admin/login" className="text-brand-600 hover:text-brand-800 font-bold">
                Super Admin Portal &rarr;
              </a>
            </p>
          </div>
        </div>

        {/* Security & Tenant Isolation Footer */}
        <p className="mt-4 text-center text-[11px] text-gray-500">
          EntriFa Cloud • End-to-End Firebase Multi-Tenant Isolation
        </p>
      </div>

      {/* Non-intrusive Small PWA Install Prompt */}
      <PwaInstallPrompt appTitle={targetTenant?.name || 'EntriFa'} />
    </div>
  );
};
