import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Customer, Transaction } from '../../types';
import { GiveGetModal } from '../../components/common/GiveGetModal';
import { WhatsAppModal } from '../../components/common/WhatsAppModal';
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  MessageSquare,
  Printer,
  Calendar,
  Phone,
  MapPin,
  Clock,
  Download,
  Share2,
} from 'lucide-react';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

export const CustomerLedgerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { tenant } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [giveGetOpen, setGiveGetOpen] = useState(false);
  const [giveGetType, setGiveGetType] = useState<'GIVE' | 'GET'>('GET');
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waMode, setWaMode] = useState<'REMINDER' | 'STATEMENT' | 'RECEIPT'>('REMINDER');
  const [selectedTxn, setSelectedTxn] = useState<Transaction | undefined>(undefined);

  useEffect(() => {
    if (!tenant?.id || !id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubCust = onSnapshot(doc(db, 'tenants', tenant.id, 'customers', id), (snap) => {
      if (snap.exists()) {
        setCustomer({ id: snap.id, ...snap.data() } as Customer);
      } else {
        setCustomer(null);
      }
      setLoading(false);
    });

    const q = query(
      collection(db, 'tenants', tenant.id, 'transactions'),
      where('customerId', '==', id)
    );
    const unsubTxns = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransactions(list);
    });

    return () => {
      unsubCust();
      unsubTxns();
    };
  }, [tenant?.id, id]);

  const openTxn = (type: 'GIVE' | 'GET') => {
    setGiveGetType(type);
    setGiveGetOpen(true);
  };

  const handlePrintStatement = () => {
    window.print();
  };

  const openWhatsApp = (mode: 'REMINDER' | 'STATEMENT' | 'RECEIPT', txn?: Transaction) => {
    setWaMode(mode);
    setSelectedTxn(txn);
    setWaModalOpen(true);
  };

  if (loading) {
    return <div className="p-8 text-center text-sm font-semibold text-gray-500">Loading customer ledger...</div>;
  }

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 text-sm">Customer account not found.</p>
        <button onClick={() => navigate('/customers')} className="mt-4 text-brand-600 font-bold text-xs">
          &larr; Back to Customers
        </button>
      </div>
    );
  }

  const currency = tenant?.currency || '₹';
  const isDue = customer.currentBalance > 0;
  const isAdvance = customer.currentBalance < 0;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{customer.name}</h1>
            <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
              <span>{customer.mobile}</span>
              {customer.address && <span>• {customer.address}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openWhatsApp('STATEMENT')}
            className="px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            WhatsApp Statement
          </button>
          <button
            onClick={handlePrintStatement}
            className="px-3.5 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Statement
          </button>
        </div>
      </div>

      {/* Hero Balance Card with GIVE / GET Large Actions */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Current Outstanding Balance
          </span>
          <div className="flex items-baseline gap-2">
            <h2
              className={`text-4xl sm:text-5xl font-black tracking-tight ${
                isDue ? 'text-rose-600' : isAdvance ? 'text-emerald-600' : 'text-gray-900'
              }`}
            >
              {currency}{Math.abs(customer.currentBalance).toLocaleString()}
            </h2>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                isDue
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : isAdvance
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {isDue ? 'You will Get (Due)' : isAdvance ? 'Advance Payment' : 'Settled (₹0)'}
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500 mt-4">
            <div>
              <span>Opening Balance: </span>
              <strong className="text-gray-900">{currency}{customer.openingBalance.toLocaleString()}</strong>
            </div>
            <div>
              <span>Total Credit Given: </span>
              <strong className="text-rose-600">{currency}{customer.totalCredit.toLocaleString()}</strong>
            </div>
            <div>
              <span>Total Received: </span>
              <strong className="text-emerald-600">{currency}{customer.totalPayments.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* Primary GIVE / GET Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto no-print">
          <button
            onClick={() => openTxn('GET')}
            className="flex-1 md:flex-none px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
            GET PAYMENT
          </button>

          <button
            onClick={() => openTxn('GIVE')}
            className="flex-1 md:flex-none px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            GIVE CREDIT
          </button>
        </div>
      </div>

      {/* Digital Khata Ledger Timeline Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-gray-900">Digital Khata Ledger Timeline</h3>
          <span className="text-xs text-gray-400 font-mono">{transactions.length} Transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Transaction Details</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">You Gave (GIVE Credit)</th>
                <th className="py-3 px-4 text-right">You Got (GET Payment)</th>
                <th className="py-3 px-4 text-right">Running Balance</th>
                <th className="py-3 px-4 text-right no-print">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No transactions recorded yet for this customer. Click GIVE or GET above to add the first entry.
                  </td>
                </tr>
              ) : (
                transactions.map(t => {
                  const isGet = t.type === 'GET';
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-gray-600 whitespace-nowrap">
                        {t.date}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">{t.description}</p>
                        {t.notes && <p className="text-[10px] text-gray-400 mt-0.5">{t.notes}</p>}
                        <span className="text-[10px] text-gray-400">By {t.createdBy}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-700">
                        {t.paymentMethod}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                        {!isGet ? `${currency}${t.amount.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                        {isGet ? `${currency}${t.amount.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-gray-900">
                        {currency}{Math.abs(t.runningBalance).toLocaleString()}
                        <span className="block text-[9px] font-semibold text-gray-400">
                          {t.runningBalance > 0 ? 'Due' : t.runningBalance < 0 ? 'Advance' : '0'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right no-print">
                        <button
                          onClick={() => openWhatsApp('RECEIPT', t)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="WhatsApp Receipt"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Give / Get Modal */}
      <GiveGetModal
        isOpen={giveGetOpen}
        onClose={() => setGiveGetOpen(false)}
        defaultType={giveGetType}
        selectedCustomer={customer}
        onSuccess={() => setGiveGetOpen(false)}
      />

      {/* WhatsApp Modal */}
      {customer && (
        <WhatsAppModal
          isOpen={waModalOpen}
          onClose={() => setWaModalOpen(false)}
          customer={customer}
          transaction={selectedTxn}
          mode={waMode}
        />
      )}
    </div>
  );
};
