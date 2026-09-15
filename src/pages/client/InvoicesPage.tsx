import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Invoice } from '../../types';
import { Badge } from '../../components/common/Badge';
import { PrintInvoiceModal } from '../../components/common/PrintInvoiceModal';
import { Receipt, Plus, Search, Printer, Share2, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { invoiceService } from '../../firebase/services';

export const InvoicesPage: React.FC = () => {
  const { tenant, user, canAccess } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Print modal
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (!tenant?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = invoiceService.subscribeInvoices(tenant.id, (list) => {
      setAllInvoices(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [tenant?.id]);

  const invoices = allInvoices.filter(inv => {
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
        (inv.customerMobile && inv.customerMobile.includes(q))
      );
    }
    return true;
  });

  const handlePrint = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPrintModalOpen(true);
  };

  const handleShareWhatsApp = (inv: Invoice) => {
    const text = `Invoice from ${tenant?.name || 'EntriFa'}\nInvoice #: ${inv.invoiceNumber}\nTotal: ${tenant?.currency || '₹'}${inv.grandTotal.toLocaleString()}\nStatus: ${inv.status}\nDue Date: ${inv.dueDate}\n\nThank you for your business!`;
    const cleanMobile = inv.customerMobile.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanMobile}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCollectPayment = async (inv: Invoice) => {
    if (!tenant?.id) return;
    const due = inv.grandTotal - inv.paidAmount;
    const amountStr = prompt(`Enter payment amount to collect for ${inv.invoiceNumber} (Due: ${tenant?.currency || '₹'}${due}):`, due.toString());
    if (!amountStr) return;
    const paymentAmount = parseFloat(amountStr);
    if (!paymentAmount || paymentAmount <= 0) return;

    try {
      await invoiceService.collectInvoicePayment(
        tenant.id,
        inv.id,
        paymentAmount,
        'UPI',
        user?.name || 'Staff'
      );
      showToast('Payment collected and customer ledger updated.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error recording payment', 'error');
    }
  };

  const currency = tenant?.currency || '₹';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Tax Invoices & Billing</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Generate professional GST tax invoices, collect payments, print, and share on WhatsApp
          </p>
        </div>

        {canAccess('invoices', 'add') && (
          <button
            onClick={() => navigate('/invoices/new')}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice number, customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {(['ALL', 'PAID', 'PARTIALLY_PAID', 'UNPAID', 'OVERDUE'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date & Due</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading invoices...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">No invoices recorded.</td></tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50/60">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-700">{inv.invoiceNumber}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-gray-900">{inv.customerName}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{inv.customerMobile}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-600">
                      <div>{inv.issueDate}</div>
                      <span className="text-[10px] text-gray-400">Due: {inv.dueDate}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900 text-sm">
                      {currency}{inv.grandTotal.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                      {currency}{inv.paidAmount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4"><Badge status={inv.status} /></td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {inv.status !== 'PAID' && (
                          <button
                            onClick={() => handleCollectPayment(inv)}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg font-bold text-[11px] transition-colors"
                            title="Collect Payment"
                          >
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => handlePrint(inv)}
                          className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Print / Save PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleShareWhatsApp(inv)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Share via WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PrintInvoiceModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        invoice={selectedInvoice}
      />
    </div>
  );
};
