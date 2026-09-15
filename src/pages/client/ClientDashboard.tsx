import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { GiveGetModal } from '../../components/common/GiveGetModal';
import { WhatsAppModal } from '../../components/common/WhatsAppModal';
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Building2,
  Clock,
  MessageSquare,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  customerService,
  transactionService,
  supplierService,
  accountingService,
} from '../../firebase/services';
import { Customer, Transaction, Supplier, Expense } from '../../types';

export const ClientDashboard: React.FC = () => {
  const { tenant, hasModule } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Transaction & WhatsApp Modals state
  const [giveGetOpen, setGiveGetOpen] = useState(false);
  const [giveGetType, setGiveGetType] = useState<'GIVE' | 'GET'>('GET');
  const [selectedCustForTxn, setSelectedCustForTxn] = useState<any>(null);

  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waCustomer, setWaCustomer] = useState<any>(null);

  useEffect(() => {
    if (!tenant?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubCust = customerService.subscribeCustomers(tenant.id, (list) => {
      setCustomers(list);
      setLoading(false);
    });

    const unsubTxn = transactionService.subscribeTransactions(tenant.id, (list) => {
      setTransactions(list);
    });

    const unsubSupp = supplierService.subscribeSuppliers(tenant.id, (list) => {
      setSuppliers(list);
    });

    const unsubExp = accountingService.subscribeExpenses(tenant.id, (list) => {
      setExpenses(list);
    });

    return () => {
      unsubCust();
      unsubTxn();
      unsubSupp();
      unsubExp();
    };
  }, [tenant?.id]);

  const openTxn = (type: 'GIVE' | 'GET', cust?: any) => {
    setGiveGetType(type);
    setSelectedCustForTxn(cust || null);
    setGiveGetOpen(true);
  };

  const openWhatsApp = (cust: any) => {
    setWaCustomer({
      name: cust.name,
      mobile: cust.mobile,
      currentBalance: cust.amountDue || cust.currentBalance,
      totalCredit: 0,
      totalPayments: 0,
    });
    setWaModalOpen(true);
  };

  if (loading) {
    return <div className="p-8 text-center text-sm font-semibold text-gray-500">Loading business accounts...</div>;
  }

  const currency = tenant?.currency || '₹';
  const today = new Date().toISOString().slice(0, 10);

  const totalReceivable = customers
    .filter(c => (c.currentBalance || 0) > 0)
    .reduce((sum, c) => sum + (c.currentBalance || 0), 0);

  const totalPayable = suppliers
    .filter(s => (s.currentBalance || 0) > 0)
    .reduce((sum, s) => sum + (s.currentBalance || 0), 0);

  const todayCollection = transactions
    .filter(t => t.type === 'GET' && t.date?.slice(0, 10) === today)
    .reduce((sum, t) => sum + t.amount, 0);

  const todayExpense = expenses
    .filter(e => e.date?.slice(0, 10) === today)
    .reduce((sum, e) => sum + e.amount, 0);

  const recentTxns = transactions.slice(0, 8);

  const paymentReminders = customers
    .filter(c => (c.currentBalance || 0) > 0)
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      name: c.name,
      mobile: c.mobile,
      amountDue: c.currentBalance,
    }));

  return (
    <div className="space-y-8">
      {/* Top Header with Quick Action GIVE / GET buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">{tenant?.name || 'EntriFa Business'}</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Digital Ledger & Business Khata • {tenant?.ownerName}
          </p>
        </div>

        {/* Primary GIVE / GET Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => openTxn('GET')}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <ArrowDownLeft className="w-4 h-4" />
            + GET PAYMENT
          </button>

          <button
            onClick={() => openTxn('GIVE')}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <ArrowUpRight className="w-4 h-4" />
            - GIVE CREDIT
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Receivable */}
        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Receivable</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-rose-600">
              {currency}{totalReceivable.toLocaleString()}
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Customers owe you</p>
          </div>
        </div>

        {/* Total Payable */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Payable</span>
            <div className="p-2 rounded-xl bg-gray-100 text-gray-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-gray-900">
              {currency}{totalPayable.toLocaleString()}
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">You owe suppliers</p>
          </div>
        </div>

        {/* Today's Collection */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today's Collection</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-600">
              {currency}{todayCollection.toLocaleString()}
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Cash & UPI received today</p>
          </div>
        </div>

        {/* Today's Expense */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today's Expense</span>
            <div className="p-2 rounded-xl bg-gray-100 text-gray-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-gray-800">
              {currency}{todayExpense.toLocaleString()}
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Shop & operational costs today</p>
          </div>
        </div>
      </div>

      {/* Main Sections: Recent Transactions & Payment Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions Timeline (2 Cols) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              <h3 className="font-bold text-sm text-gray-900">Recent Transactions</h3>
            </div>
            {hasModule('transactions') && (
              <button
                onClick={() => navigate('/transactions')}
                className="text-xs text-brand-600 hover:text-brand-800 font-bold"
              >
                View All &rarr;
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-100">
            {recentTxns.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">No transactions recorded yet.</div>
            ) : (
              recentTxns.map((t: any) => {
                const isGet = t.type === 'GET';
                return (
                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                          isGet ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {isGet ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-xs">{t.partyName}</p>
                        <p className="text-[11px] text-gray-500">
                          {t.description} • <span className="font-semibold text-gray-700">{t.paymentMethod}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`font-mono font-bold text-sm ${isGet ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isGet ? '+' : '-'}{currency}{t.amount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                        Bal: {currency}{Math.abs(t.runningBalance).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Outstanding Payment Reminders */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">Payment Reminders</h3>
              <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">
                {paymentReminders.length} Due
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {paymentReminders.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">All customer dues settled!</div>
              ) : (
                paymentReminders.map((cust: any) => (
                  <div key={cust.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">{cust.name}</p>
                      <p className="text-[11px] text-rose-600 font-bold font-mono">
                        Due: {currency}{cust.amountDue.toLocaleString()}
                      </p>
                    </div>

                    <button
                      onClick={() => openWhatsApp(cust)}
                      className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors"
                      title="Send WhatsApp Reminder"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Remind
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50/50 text-center">
            {hasModule('customers') && (
              <button
                onClick={() => navigate('/customers')}
                className="text-xs font-bold text-brand-600 hover:text-brand-800"
              >
                Go to Customers Directory &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Give / Get Modal */}
      <GiveGetModal
        isOpen={giveGetOpen}
        onClose={() => setGiveGetOpen(false)}
        defaultType={giveGetType}
        selectedCustomer={selectedCustForTxn}
        onSuccess={() => setGiveGetOpen(false)}
      />

      {/* WhatsApp Modal */}
      {waCustomer && (
        <WhatsAppModal
          isOpen={waModalOpen}
          onClose={() => setWaModalOpen(false)}
          customer={waCustomer}
          mode="REMINDER"
        />
      )}
    </div>
  );
};
