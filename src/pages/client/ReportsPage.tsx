import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { FileBarChart, Printer, Download, Calendar, Filter, FileSpreadsheet } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';

export const ReportsPage: React.FC = () => {
  const { tenant } = useAuth();
  const { showToast } = useNotifications();

  const [reportType, setReportType] = useState<
    'DAYBOOK' | 'PNL' | 'RECEIVABLE' | 'PAYABLE' | 'CUSTOMER_LEDGER'
  >('DAYBOOK');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      if (reportType === 'DAYBOOK') {
        const [txSnap, expSnap, incSnap] = await Promise.all([
          getDocs(query(collection(db, 'tenants', tenant.id, 'transactions'), where('date', '==', date))),
          getDocs(query(collection(db, 'tenants', tenant.id, 'expenses'), where('date', '==', date))),
          getDocs(query(collection(db, 'tenants', tenant.id, 'income'), where('date', '==', date))),
        ]);

        const entries: any[] = [];
        let totalInflow = 0;
        let totalOutflow = 0;

        txSnap.docs.forEach(d => {
          const t = d.data();
          const isIn = t.type === 'GET';
          if (isIn) totalInflow += t.amount || 0;
          else totalOutflow += t.amount || 0;
          entries.push({
            id: d.id,
            type: 'TRANSACTION',
            subType: t.type,
            partyName: t.partyName || (t.customerId ? 'Customer' : 'Supplier'),
            paymentMethod: t.paymentMethod || 'CASH',
            description: t.description || (isIn ? 'Payment Received' : 'Credit Given'),
            amount: t.amount || 0,
          });
        });

        incSnap.docs.forEach(d => {
          const inc = d.data();
          totalInflow += inc.amount || 0;
          entries.push({
            id: d.id,
            type: 'INCOME',
            subType: 'DIRECT',
            partyName: inc.category || 'Direct Income',
            paymentMethod: inc.paymentMethod || 'CASH',
            description: inc.description || 'Income entry',
            amount: inc.amount || 0,
          });
        });

        expSnap.docs.forEach(d => {
          const exp = d.data();
          totalOutflow += exp.amount || 0;
          entries.push({
            id: d.id,
            type: 'EXPENSE',
            subType: 'OPERATING',
            partyName: exp.category || 'Business Expense',
            paymentMethod: exp.paymentMethod || 'BANK',
            description: exp.description || exp.notes || 'Expense entry',
            amount: exp.amount || 0,
          });
        });

        setData({
          entries,
          totalInflow,
          totalOutflow,
          netCashFlow: totalInflow - totalOutflow,
        });
      } else if (reportType === 'PNL') {
        const [incSnap, expSnap] = await Promise.all([
          getDocs(collection(db, 'tenants', tenant.id, 'income')),
          getDocs(collection(db, 'tenants', tenant.id, 'expenses')),
        ]);

        let totalIncome = 0;
        const incomeByCategory: Record<string, number> = {};
        incSnap.docs.forEach(d => {
          const i = d.data();
          totalIncome += i.amount || 0;
          incomeByCategory[i.category] = (incomeByCategory[i.category] || 0) + (i.amount || 0);
        });

        let totalExpense = 0;
        const expenseByCategory: Record<string, number> = {};
        expSnap.docs.forEach(d => {
          const e = d.data();
          totalExpense += e.amount || 0;
          expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + (e.amount || 0);
        });

        setData({
          totalIncome,
          totalExpense,
          netProfit: totalIncome - totalExpense,
          incomeByCategory,
          expenseByCategory,
        });
      } else if (reportType === 'RECEIVABLE') {
        const custSnap = await getDocs(collection(db, 'tenants', tenant.id, 'customers'));
        const customers = custSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(c => (c.currentBalance || 0) > 0);
        const totalReceivable = customers.reduce((s, c) => s + (c.currentBalance || 0), 0);

        setData({
          customers,
          totalReceivable,
        });
      } else if (reportType === 'PAYABLE') {
        const suppSnap = await getDocs(collection(db, 'tenants', tenant.id, 'suppliers'));
        const suppliers = suppSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(s => (s.currentBalance || 0) > 0);
        const totalPayable = suppliers.reduce((s, s2) => s + (s2.currentBalance || 0), 0);

        setData({
          suppliers,
          totalPayable,
        });
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, date, tenant?.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data) return;
    let csvContent = "data:text/csv;charset=utf-8,";

    if (reportType === 'DAYBOOK') {
      csvContent += "Type,Category,Party,Amount,PaymentMethod,Description\n";
      (data.entries || []).forEach((e: any) => {
        csvContent += `"${e.type}","${e.subType}","${e.partyName}","${e.amount}","${e.paymentMethod}","${e.description}"\n`;
      });
    } else if (reportType === 'RECEIVABLE') {
      csvContent += "Customer,Mobile,Balance,TotalCredit,TotalPayments\n";
      (data.customers || []).forEach((c: any) => {
        csvContent += `"${c.name}","${c.mobile}","${c.currentBalance}","${c.totalCredit}","${c.totalPayments}"\n`;
      });
    } else if (reportType === 'PAYABLE') {
      csvContent += "Supplier,Mobile,Balance,TotalCredit,TotalPayments\n";
      (data.suppliers || []).forEach((s: any) => {
        csvContent += `"${s.name}","${s.mobile}","${s.currentBalance}","${s.totalCredit}","${s.totalPayments}"\n`;
      });
    } else {
      csvContent += "Metric,Value\n";
      csvContent += `Total Income,${data.totalIncome}\n`;
      csvContent += `Total Expense,${data.totalExpense}\n`;
      csvContent += `Net Profit,${data.netProfit}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EntriFa_${reportType}_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Report exported to CSV successfully.`, 'success');
  };

  const currency = tenant?.currency || '₹';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Business Reports & Statements</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit-ready Day Book, Profit & Loss, Receivables & Payables registers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand-500/20 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Tabs / Filter selection */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between no-print">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'DAYBOOK', label: 'Day Book (Daily Flow)' },
            { id: 'PNL', label: 'Profit & Loss Statement' },
            { id: 'RECEIVABLE', label: 'Receivable Register' },
            { id: 'PAYABLE', label: 'Payable Register' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                reportType === tab.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {reportType === 'DAYBOOK' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">Select Date:</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
            />
          </div>
        )}
      </div>

      {/* Report Paper Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
        {/* Printable Business Header */}
        <div className="border-b border-gray-200 pb-4 mb-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black text-gray-900">{tenant?.name || 'EntriFa Business'}</h2>
            <p className="text-xs text-gray-500">{tenant?.address || 'Commercial Centre'}</p>
            {tenant?.gstNumber && <p className="text-xs font-mono text-gray-600">GSTIN: {tenant.gstNumber}</p>}
          </div>

          <div className="text-right">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-gray-100 text-gray-800">
              {reportType.replace('_', ' ')}
            </span>
            <p className="text-xs text-gray-400 mt-1 font-mono">Date: {date}</p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-gray-400">Loading report data...</div>
        ) : !data ? (
          <div className="p-12 text-center text-xs text-gray-400">No report data found.</div>
        ) : (
          <>
            {/* DAY BOOK VIEW */}
            {reportType === 'DAYBOOK' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase">Total Inflow (Cash In)</span>
                    <p className="text-xl font-black text-emerald-700 mt-1">{currency}{data.totalInflow?.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
                    <span className="text-[10px] font-bold text-rose-800 uppercase">Total Outflow (Cash Out)</span>
                    <p className="text-xl font-black text-rose-700 mt-1">{currency}{data.totalOutflow?.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Net Daily Cashflow</span>
                    <p className={`text-xl font-black mt-1 ${data.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {currency}{data.netCashFlow?.toLocaleString()}
                    </p>
                  </div>
                </div>

                <table className="w-full text-left text-xs border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Party / Stream</th>
                      <th className="py-2.5 px-3">Payment Method</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Inflow ({currency})</th>
                      <th className="py-2.5 px-3 text-right">Outflow ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(data.entries || []).map((e: any) => {
                      const isInflow = (e.type === 'TRANSACTION' && e.subType === 'GET') || e.type === 'INCOME';
                      return (
                        <tr key={e.id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 font-bold text-[10px]">
                            <span className={`px-2 py-0.5 rounded ${isInflow ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {e.type} ({e.subType})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-900">{e.partyName}</td>
                          <td className="py-2.5 px-3 font-semibold text-gray-600">{e.paymentMethod}</td>
                          <td className="py-2.5 px-3 text-gray-500">{e.description}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                            {isInflow ? `${currency}${e.amount.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                            {!isInflow ? `${currency}${e.amount.toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* PROFIT & LOSS VIEW */}
            {reportType === 'PNL' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-xs font-bold text-emerald-800 uppercase">Gross Revenue / Income</span>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{currency}{data.totalIncome?.toLocaleString()}</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200">
                    <span className="text-xs font-bold text-rose-800 uppercase">Operating Expenses</span>
                    <p className="text-2xl font-black text-rose-700 mt-1">{currency}{data.totalExpense?.toLocaleString()}</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-gray-50 border border-gray-300">
                    <span className="text-xs font-bold text-gray-600 uppercase">Net Profit / (Loss)</span>
                    <p className={`text-2xl font-black mt-1 ${data.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {currency}{data.netProfit?.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                  <div>
                    <h4 className="font-bold text-xs uppercase text-gray-700 mb-2">Expense Breakdown</h4>
                    <div className="space-y-2 text-xs">
                      {Object.entries(data.expenseByCategory || {}).map(([cat, amt]) => (
                        <div key={cat} className="flex justify-between p-2 rounded-lg bg-gray-50">
                          <span className="text-gray-700 font-medium">{cat}</span>
                          <span className="font-mono font-bold text-rose-600">{currency}{(amt as number).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs uppercase text-gray-700 mb-2">Income Breakdown</h4>
                    <div className="space-y-2 text-xs">
                      {Object.entries(data.incomeByCategory || {}).map(([cat, amt]) => (
                        <div key={cat} className="flex justify-between p-2 rounded-lg bg-gray-50">
                          <span className="text-gray-700 font-medium">{cat}</span>
                          <span className="font-mono font-bold text-emerald-600">{currency}{(amt as number).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RECEIVABLE REGISTER VIEW */}
            {reportType === 'RECEIVABLE' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-between">
                  <span className="font-bold text-xs text-rose-900">Total Outstanding Receivable Balance:</span>
                  <span className="text-xl font-black text-rose-600 font-mono">{currency}{data.totalReceivable?.toLocaleString()}</span>
                </div>

                <table className="w-full text-left text-xs border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Mobile</th>
                      <th className="py-2.5 px-3 text-right">Total Credit Given</th>
                      <th className="py-2.5 px-3 text-right">Total Payments Made</th>
                      <th className="py-2.5 px-3 text-right">Balance Due ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(data.customers || []).map((c: any) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-bold text-gray-900">{c.name}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-600">{c.mobile}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-gray-700">{currency}{c.totalCredit.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{currency}{c.totalPayments.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-rose-600">{currency}{c.currentBalance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAYABLE REGISTER VIEW */}
            {reportType === 'PAYABLE' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-800">Total Outstanding Supplier Payables:</span>
                  <span className="text-xl font-black text-gray-900 font-mono">{currency}{data.totalPayable?.toLocaleString()}</span>
                </div>

                <table className="w-full text-left text-xs border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Supplier</th>
                      <th className="py-2.5 px-3">Mobile</th>
                      <th className="py-2.5 px-3 text-right">Purchases on Credit</th>
                      <th className="py-2.5 px-3 text-right">Payments Settled</th>
                      <th className="py-2.5 px-3 text-right">Payable Balance ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(data.suppliers || []).map((s: any) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-bold text-gray-900">{s.name}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-600">{s.mobile}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-gray-700">{currency}{s.totalCredit.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{currency}{s.totalPayments.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-rose-600">{currency}{s.currentBalance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
