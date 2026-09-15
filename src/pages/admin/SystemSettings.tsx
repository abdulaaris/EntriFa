import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Settings, Save, ShieldAlert } from 'lucide-react';
import { systemService } from '../../firebase/services';

export const SystemSettings: React.FC = () => {
  const { showToast } = useNotifications();
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    systemService.getSystemSettings()
      .then(d => {
        setSettings(d);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await systemService.updateSystemSettings(settings);
      showToast('System settings saved successfully!', 'success');
    } catch (err) {
      showToast('Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading system settings...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">System Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Global SaaS configuration, branding defaults, and maintenance mode controls
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Settings className="w-5 h-5 text-brand-600" />
          <h3 className="font-bold text-sm text-gray-900">Platform Identity & Configuration</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Application Name
            </label>
            <input
              type="text"
              value={settings.appName || ''}
              onChange={e => setSettings({ ...settings, appName: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Tagline
            </label>
            <input
              type="text"
              value={settings.tagline || ''}
              onChange={e => setSettings({ ...settings, tagline: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Default Currency Symbol
            </label>
            <input
              type="text"
              value={settings.defaultCurrency || '₹'}
              onChange={e => setSettings({ ...settings, defaultCurrency: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Support Email
            </label>
            <input
              type="email"
              value={settings.contactEmail || ''}
              onChange={e => setSettings({ ...settings, contactEmail: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Maintenance Mode Toggle */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="font-bold text-xs text-gray-900">Maintenance Mode</p>
            <p className="text-[11px] text-gray-500">Temporarily restrict client workspace operations for upgrades</p>
          </div>
          <button
            type="button"
            onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.maintenanceMode ? 'bg-amber-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                settings.maintenanceMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-transform active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
