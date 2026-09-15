import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Transaction } from '../../types';
import { GiveGetModal } from '../../components/common/GiveGetModal';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Plus,
  Filter,
  Calendar,
} from 'lucide-react';
import { transactionService } from '../../firebase/services';

export const TransactionsList: React.FC = () => {
  const { tenant, canAccess } = useAuth();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'GIVE' | 'GET'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'GIVE' | 'GET'>('GET');

  useEffect(() => {
    if (!tenant?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = transactionService.subscribeTransactions(tenant.id, (list) => {
      setAllTransactions(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [tenant?.id]);

  const transactions = allTransactions.filter(t => {
    if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
  });

  const currency = tenant?.currency || '₹';

  const totalInflow = transactions
    .filter(t => t.type === 'GET')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflow = transactions
    .filter(t => t.type === 'GIVE')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Transactions Log</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Complete running audit of all GIVE credit entries and GET payment collections
          </p>
        </div>

        {canAccess('transactions', 'add') && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setModalType('GET');
                setModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
            >
              <ArrowDownLeft className="w-4 h-4" />
              + GET Payment
            </button>
            <button
              onClick={() => {
                setModalType('GIVE');
                setModalOpen(true);
              }}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4" />
              - GIVE Credit
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase">Total Payments Got (GET)</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{currency}{totalInflow.toLocaleString()}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase">Total Credit Given (GIVE)</span>
          <p className="text-2xl font-black text-rose-600 mt-1">{currency}{totalOutflow.toLocaleString()}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase">Filtered Count</span>
          <p className="text-2xl font-black text-gray-900 mt-1">{transactions.length} Transactions</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          {(['ALL', 'GET', 'GIVE'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setTypeFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                typeFilter === tab
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab === 'ALL' && 'All Types'}
              {tab === 'GET' && 'GET Payments Only'}
              {tab === 'GIVE' && 'GIVE Credit Only'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 font-medium">Date Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Party</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Running Balance</th>
                <th className="py-3 px-4">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">Loading transactions...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">No transactions recorded.</td></tr>
              ) : (
                transactions.map(t => {
                  const isGet = t.type === 'GET';
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 font-mono text-gray-600 whitespace-nowrap">{t.date}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">{t.partyName}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full ${
                            isGet ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {isGet ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {t.type}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold text-sm ${isGet ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isGet ? '+' : '-'}{currency}{t.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-700">{t.paymentMethod}</td>
                      <td className="py-3 px-4 text-gray-600 truncate max-w-xs">{t.description}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                        {currency}{Math.abs(t.runningBalance).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-[11px]">{t.createdBy}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <GiveGetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultType={modalType}
        onSuccess={() => setModalOpen(false)}
      />
    </div>
  );
};
