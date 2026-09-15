import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Income, PaymentMethod } from '../../types';
import { TrendingUp, Plus, Trash2 } from 'lucide-react';
import { accountingService } from '../../firebase/services';

const INCOME_CATEGORIES = ['Sales', 'Service', 'Commission', 'Interest', 'Consulting', 'Other'];

export const IncomePage: React.FC = () => {
  const { tenant, user, canAccess } = useAuth();
  const { showToast } = useNotifications();

  const [incomeList, setIncomeList] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState('Sales');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!tenant?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = accountingService.subscribeIncome(tenant.id, (list) => {
      setIncomeList(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [tenant?.id]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = todayStr.slice(0, 7);

  const todayIncome = incomeList
    .filter(i => i.date?.slice(0, 10) === todayStr)
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const monthlyIncome = incomeList
    .filter(i => i.date?.slice(0, 7) === monthStr)
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !tenant?.id) return;
    setIsSubmitting(true);
    try {
      await accountingService.createIncome(
        tenant.id,
        {
          category,
          amount: parseFloat(amount),
          date,
          paymentMethod,
          description,
        },
        user?.name || 'Staff'
      );

      showToast('Income recorded successfully.', 'success');
      setModalOpen(false);
      setAmount('');
      setDescription('');
    } catch (err) {
      showToast('Error recording income', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenant?.id) return;
    if (!confirm('Delete this income record?')) return;
    try {
      await accountingService.deleteIncome(tenant.id, id);
      showToast('Income record removed.', 'success');
    } catch (err) {
      showToast('Failed to delete income', 'error');
    }
  };

  const currency = tenant?.currency || '₹';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Direct Income Streams</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Record retail counter sales, service revenue, and miscellaneous earnings
          </p>
        </div>

        {canAccess('income', 'add') && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            + Record Income
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase">Today's Direct Income</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{currency}{todayIncome.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase">This Month's Direct Income</span>
          <p className="text-2xl font-black text-gray-900 mt-1">{currency}{monthlyIncome.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading income records...</td></tr>
              ) : incomeList.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">No income entries recorded.</td></tr>
              ) : (
                incomeList.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-mono text-gray-600 whitespace-nowrap">{i.date}</td>
                    <td className="py-3 px-4 font-bold text-gray-900">{i.category}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 text-sm">
                      {currency}{i.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-700">{i.paymentMethod}</td>
                    <td className="py-3 px-4 text-gray-600">{i.description}</td>
                    <td className="py-3 px-4 text-gray-400">{i.createdBy}</td>
                    <td className="py-3 px-4 text-right">
                      {canAccess('income', 'delete') && (
                        <button
                          onClick={() => handleDelete(i.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Income Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-gray-900">Record Direct Income</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold"
                  >
                    {INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Amount ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Counter sales cash"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-xs font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  {isSubmitting ? 'Saving...' : 'Record Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
