import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Expense, PaymentMethod } from '../../types';
import { TrendingDown, Plus, Trash2, Calendar, CreditCard, Tag } from 'lucide-react';
import { accountingService } from '../../firebase/services';

const EXPENSE_CATEGORIES = [
  'Rent', 'Salary', 'Electricity', 'Transport', 'Purchase', 'Marketing', 'Maintenance', 'Other'
];

export const ExpensesPage: React.FC = () => {
  const { tenant, user, canAccess } = useAuth();
  const { showToast } = useNotifications();

  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState('Rent');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!tenant?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = accountingService.subscribeExpenses(tenant.id, (list) => {
      setAllExpenses(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [tenant?.id]);

  const expenses = allExpenses.filter(e => categoryFilter === 'ALL' || e.category === categoryFilter);

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = todayStr.slice(0, 7);

  const todayExpense = allExpenses
    .filter(e => e.date?.slice(0, 10) === todayStr)
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const monthlyExpense = allExpenses
    .filter(e => e.date?.slice(0, 7) === monthStr)
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const breakdown: Record<string, number> = {};
  allExpenses.forEach(e => {
    breakdown[e.category] = (breakdown[e.category] || 0) + (e.amount || 0);
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !tenant?.id) return;
    setIsSubmitting(true);
    try {
      await accountingService.createExpense(
        tenant.id,
        {
          category,
          amount: parseFloat(amount),
          date,
          paymentMethod,
          description,
          notes,
        },
        user?.name || 'Staff'
      );

      showToast('Expense recorded successfully.', 'success');
      setModalOpen(false);
      setAmount('');
      setDescription('');
      setNotes('');
    } catch (err) {
      showToast('Failed to record expense', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenant?.id) return;
    if (!confirm('Delete this expense?')) return;
    try {
      await accountingService.deleteExpense(tenant.id, id);
      showToast('Expense removed.', 'success');
    } catch (err) {
      showToast('Failed to delete expense', 'error');
    }
  };

  const currency = tenant?.currency || '₹';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Business Expenses</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Track daily operating expenses, salaries, bills, rent, and logistics
          </p>
        </div>

        {canAccess('expenses', 'add') && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            + Record Expense
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase">Today's Expense</span>
          <p className="text-2xl font-black text-rose-600 mt-1">{currency}{todayExpense.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase">This Month's Expense</span>
          <p className="text-2xl font-black text-gray-900 mt-1">{currency}{monthlyExpense.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase">Total Entries</span>
          <p className="text-2xl font-black text-gray-900 mt-1">{expenses.length}</p>
        </div>
      </div>

      {/* Category Breakdown Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="text-xs font-bold text-gray-700 uppercase mb-3">Category Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
          {EXPENSE_CATEGORIES.map(cat => (
            <div
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? 'ALL' : cat)}
              className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                categoryFilter === cat
                  ? 'border-rose-500 bg-rose-50/50 shadow-sm'
                  : 'border-gray-100 bg-gray-50/60 hover:bg-gray-100'
              }`}
            >
              <span className="text-[10px] font-bold text-gray-500 block truncate">{cat}</span>
              <p className="text-xs font-black text-gray-900 mt-0.5">
                {currency}{(breakdown[cat] || 0).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
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
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading expenses...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">No expenses found for this category.</td></tr>
              ) : (
                expenses.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-mono text-gray-600 whitespace-nowrap">{e.date}</td>
                    <td className="py-3 px-4 font-bold text-gray-900">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-[11px]">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 text-sm">
                      {currency}{e.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-700">{e.paymentMethod}</td>
                    <td className="py-3 px-4 text-gray-600 truncate max-w-xs">{e.description}</td>
                    <td className="py-3 px-4 text-gray-400">{e.createdBy}</td>
                    <td className="py-3 px-4 text-right">
                      {canAccess('expenses', 'delete') && (
                        <button
                          onClick={() => handleDelete(e.id)}
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

      {/* Record Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-gray-900">Record Business Expense</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold"
                  >
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
                    <option value="BANK">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="CARD">Card</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Shop electricity bill BESCOM"
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
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20"
                >
                  {isSubmitting ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
