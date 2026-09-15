import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { systemService } from '../../firebase/services';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Lock, Mail, User, Phone, CheckCircle, AlertTriangle } from 'lucide-react';

export const SuperAdminSetupPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [alreadyExists, setAlreadyExists] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    systemService.checkSuperAdminExists().then(exists => {
      setAlreadyExists(exists);
    });
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await systemService.createFirstSuperAdmin({
        name,
        email,
        mobile,
        password,
      });

      // Automatically sign in the new Super Admin
      const success = await login(email, password);
      if (success) {
        navigate('/admin');
      } else {
        navigate('/admin/login');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Setup failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (alreadyExists === null) {
    return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center text-sm">Checking system status...</div>;
  }

  if (alreadyExists) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-amber-900/50 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Setup Locked</h2>
          <p className="text-xs text-slate-400">
            A Super Admin account is already configured for this EntriFa platform. For security reasons, initial setup cannot be executed again.
          </p>
          <button
            onClick={() => navigate('/admin/login')}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs shadow-md"
          >
            Go to Super Admin Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-3xl shadow-xl shadow-blue-500/30 mb-3">
          E
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Root Super Admin Setup</h1>
        <p className="mt-1 text-xs text-slate-400 font-semibold uppercase tracking-wider">
          One-Time Platform Owner Account Initialization
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/90 py-8 px-6 shadow-2xl rounded-3xl border border-slate-700 sm:px-10">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-950 border border-rose-600 rounded-xl text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Your Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Platform Owner"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-600 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Owner Email *
              </label>
              <input
                type="email"
                required
                placeholder="admin@yourdomain.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-600 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                placeholder="+91 98765 00000"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-600 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Secure Password *
              </label>
              <input
                type="password"
                required
                placeholder="Min 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-600 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-600 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 transition-transform active:scale-[0.98] disabled:opacity-50 mt-4"
            >
              {isSubmitting ? 'Initializing Platform...' : 'Create Super Admin & Initialize'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
