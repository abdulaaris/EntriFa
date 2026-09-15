import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { systemService } from '../../firebase/services';
import { PwaInstallPrompt } from '../../components/common/PwaInstallPrompt';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, Wrench } from 'lucide-react';

export const SuperAdminLoginPage: React.FC = () => {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [superAdminExists, setSuperAdminExists] = useState<boolean>(true);

  useEffect(() => {
    if (user && !isLoading) {
      if (user.role === 'SUPER_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, isLoading]);

  useEffect(() => {
    systemService.checkSuperAdminExists().then(exists => {
      setSuperAdminExists(exists);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/admin');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-3xl shadow-xl shadow-blue-500/30 mb-3">
          E
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">EntriFa Super Admin</h1>
        <p className="mt-1 text-xs text-slate-400 font-semibold uppercase tracking-wider">
          Platform Owner & SaaS Central Control
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/90 py-8 px-6 shadow-2xl rounded-3xl border border-slate-700 sm:px-10">
          {!superAdminExists && (
            <div className="mb-6 p-4 bg-blue-950/80 border border-blue-600 rounded-2xl text-xs space-y-2">
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                <Wrench className="w-4 h-4" />
                <span>First Time Platform Setup Required</span>
              </div>
              <p className="text-slate-300">
                No Super Admin account has been configured in your Firebase project yet.
              </p>
              <button
                type="button"
                onClick={() => navigate('/admin/setup')}
                className="w-full mt-2 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md transition-colors"
              >
                Launch First-Time Setup Wizard &rarr;
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-950 border border-rose-600 rounded-xl text-xs text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Super Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@entrifa.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-600 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-600 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
            >
              {isSubmitting ? 'Authenticating...' : 'Enter Super Admin Portal'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-700 text-center">
            <a href="/login" className="text-xs text-slate-400 hover:text-white transition-colors">
              &larr; Return to Client Business Login
            </a>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          EntriFa Super Admin • Controlled Access Only
        </p>
      </div>

      <PwaInstallPrompt appTitle="EntriFa Admin" />
    </div>
  );
};
