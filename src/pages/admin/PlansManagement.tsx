import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { PlanItem } from '../../types';
import { Layers, Plus, Check, Users, ShieldCheck, ArrowRight } from 'lucide-react';
import { systemService } from '../../firebase/services';

export const PlansManagement: React.FC = () => {
  const { showToast } = useNotifications();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    systemService.getPlans()
      .then(d => {
        setPlans(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">SaaS Subscription Plans</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Define pricing tiers, resource quotas, and default module bundles for clients
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading plans...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map(plan => {
            const isPro = plan.code === 'PRO';
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-3xl border p-6 flex flex-col justify-between transition-all relative ${
                  isPro
                    ? 'border-brand-500 shadow-lg shadow-brand-500/10 ring-2 ring-brand-500/20'
                    : 'border-gray-200 shadow-sm hover:shadow-md'
                }`}
              >
                {isPro && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full tracking-wider shadow-sm">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-lg text-gray-900">{plan.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      {plan.code}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 min-h-[36px]">{plan.description}</p>

                  <div className="mt-4 pb-4 border-b border-gray-100">
                    <span className="text-3xl font-black text-gray-950">₹{plan.price}</span>
                    <span className="text-xs text-gray-400 ml-1">/ month</span>
                  </div>

                  {/* Quotas */}
                  <div className="py-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-gray-700">
                      <span className="font-medium">Max Customers:</span>
                      <strong className="font-bold text-gray-950">{plan.maxCustomers.toLocaleString()}</strong>
                    </div>
                    <div className="flex items-center justify-between text-gray-700">
                      <span className="font-medium">Max Staff Accounts:</span>
                      <strong className="font-bold text-gray-950">{plan.maxStaff}</strong>
                    </div>
                    <div className="flex items-center justify-between text-gray-700">
                      <span className="font-medium">Max Monthly Txns:</span>
                      <strong className="font-bold text-gray-950">{plan.maxTransactions.toLocaleString()}</strong>
                    </div>
                    <div className="flex items-center justify-between text-gray-700">
                      <span className="font-medium">Default Modules:</span>
                      <strong className="font-bold text-brand-600">{plan.defaultModules.length} Modules</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="text-[11px] text-gray-400 mb-3 flex flex-wrap gap-1">
                    {plan.defaultModules.slice(0, 4).map(m => (
                      <span key={m} className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                        {m}
                      </span>
                    ))}
                    {plan.defaultModules.length > 4 && (
                      <span className="text-gray-400">+{plan.defaultModules.length - 4} more</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast(`Plan ${plan.name} configuration is active.`, 'info')}
                    className="w-full py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Configure Tier
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
