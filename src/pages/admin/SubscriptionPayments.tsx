import React, { useState, useEffect } from 'react';
import { Badge } from '../../components/common/Badge';
import { DollarSign, Clock, CheckCircle, Search, Plus } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export const SubscriptionPayments: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, 'systemPayments'))
      .then(snap => {
        setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setPayments([]);
        setLoading(false);
      });
  }, []);

  const totalRev = payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0);
  const pendingRev = payments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Subscription Revenue & Billing</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Track SaaS client subscription dues, collected payments, and bank settlements
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase">Total Collected</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">₹{totalRev.toLocaleString()}</p>
          <span className="text-[10px] text-gray-500">Paid subscription invoices</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase">Pending Payments</span>
          <p className="text-2xl font-black text-amber-600 mt-1">₹{pendingRev.toLocaleString()}</p>
          <span className="text-[10px] text-gray-500">Awaiting payment clearance</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase">Total Payment Records</span>
          <p className="text-2xl font-black text-gray-900 mt-1">{payments.length}</p>
          <span className="text-[10px] text-gray-500">Historical billing transactions</span>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Client Business</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">Loading payments...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">No payment records found.</td></tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-bold text-gray-900">{p.tenantName}</td>
                    <td className="py-3 px-4 font-semibold text-gray-700">{p.planName}</td>
                    <td className="py-3 px-4 font-mono font-bold text-gray-950">₹{p.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono text-gray-600">{p.paymentDate}</td>
                    <td className="py-3 px-4 font-semibold text-brand-700">{p.paymentMethod}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-500">{p.transactionId}</td>
                    <td className="py-3 px-4"><Badge status={p.status} size="sm" /></td>
                    <td className="py-3 px-4 text-gray-500 truncate max-w-[150px]">{p.notes || '-'}</td>
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
