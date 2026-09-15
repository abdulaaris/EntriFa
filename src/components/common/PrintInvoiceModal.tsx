import React from 'react';
import { Invoice } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Printer, X, Download, Share2 } from 'lucide-react';
import { Badge } from './Badge';

interface PrintInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
}) => {
  const { tenant } = useAuth();

  if (!isOpen || !invoice) return null;

  const currency = tenant?.currency || '₹';

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `Invoice from ${tenant?.name || 'EntriFa'}\nInvoice #: ${invoice.invoiceNumber}\nTotal: ${currency}${invoice.grandTotal.toLocaleString()}\nStatus: ${invoice.status}\nDue Date: ${invoice.dueDate}\n\nThank you for your business!`;
    const cleanMobile = invoice.customerMobile.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanMobile}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[95vh]">
        {/* Top Action Bar (hidden on print) */}
        <div className="px-6 py-3.5 bg-gray-100 border-b border-gray-200 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-gray-800">Invoice: {invoice.invoiceNumber}</span>
            <Badge status={invoice.status} size="sm" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              WhatsApp
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-brand-600 text-white hover:bg-brand-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Paper */}
        <div id="printable-invoice" className="p-8 sm:p-10 overflow-y-auto bg-white flex-1 text-gray-900 font-sans">
          {/* Business Header */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-6">
            <div>
              <h1 className="text-2xl font-black text-brand-700 tracking-tight">
                {tenant?.name || 'EntriFa Business'}
              </h1>
              <p className="text-xs text-gray-600 mt-1 max-w-xs">{tenant?.address || 'Commercial Center'}</p>
              {tenant?.city && <p className="text-xs text-gray-600">{tenant?.city}, {tenant?.state} {tenant?.country}</p>}
              {tenant?.mobile && <p className="text-xs text-gray-600">Phone: {tenant?.mobile}</p>}
              {tenant?.gstNumber && (
                <p className="text-xs font-mono font-semibold text-gray-800 mt-1">
                  GSTIN: {tenant?.gstNumber}
                </p>
              )}
            </div>

            <div className="text-right">
              <div className="inline-block px-3 py-1 rounded bg-brand-50 text-brand-800 font-extrabold text-sm tracking-wider uppercase mb-2">
                Tax Invoice
              </div>
              <p className="text-sm font-bold text-gray-900"># {invoice.invoiceNumber}</p>
              <p className="text-xs text-gray-500 mt-0.5">Date: {invoice.issueDate}</p>
              <p className="text-xs text-gray-500">Due Date: {invoice.dueDate}</p>
            </div>
          </div>

          {/* Bill To */}
          <div className="my-6 p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Billed To:</span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{invoice.customerName}</p>
              <p className="text-xs text-gray-600 font-mono">{invoice.customerMobile}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Payment Status:</span>
              <div className="mt-1">
                <Badge status={invoice.status} />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left text-xs mb-6 border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-gray-700 uppercase font-bold text-[10px]">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Price ({currency})</th>
                <th className="py-2.5 px-3 text-right">Discount</th>
                <th className="py-2.5 px-3 text-right">Tax</th>
                <th className="py-2.5 px-3 text-right">Total ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="py-2.5 px-3 text-gray-500">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-semibold text-gray-900">{item.description}</td>
                  <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{item.price.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-500">{item.discount > 0 ? `-${item.discount}` : '-'}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-500">{item.tax > 0 ? `${item.tax}%` : '0%'}</td>
                  <td className="py-2.5 px-3 text-right font-bold font-mono text-gray-900">{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary Breakdown */}
          <div className="flex justify-between items-start pt-2">
            <div className="max-w-xs text-xs text-gray-600">
              <p className="font-bold text-gray-800 mb-1">Terms & Conditions:</p>
              <p className="text-[11px] leading-relaxed">{invoice.terms || 'Payment is requested according to agreed terms.'}</p>
              {invoice.notes && (
                <p className="text-[11px] italic mt-2 text-gray-500">Note: {invoice.notes}</p>
              )}
            </div>

            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-mono">{currency}{invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-mono">-{currency}{invoice.totalDiscount.toFixed(2)}</span>
                </div>
              )}
              {invoice.totalTax > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax Amount:</span>
                  <span className="font-mono">+{currency}{invoice.totalTax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t-2 border-gray-900 font-extrabold text-sm text-gray-900">
                <span>Grand Total:</span>
                <span className="font-mono">{currency}{invoice.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 pt-1">
                <span>Paid Amount:</span>
                <span className="font-mono text-emerald-600 font-bold">{currency}{invoice.paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Balance Due:</span>
                <span className="font-mono">{currency}{Math.max(0, invoice.grandTotal - invoice.paidAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer sign off */}
          <div className="mt-12 pt-6 border-t border-gray-100 flex justify-between items-end text-xs text-gray-500">
            <div>
              <p>Generated via <strong>EntriFa</strong> - Simple Business. Smart Accounts.</p>
            </div>
            <div className="text-center">
              <div className="h-10 border-b border-gray-300 w-40 mb-1" />
              <p className="text-[11px] font-semibold text-gray-700">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
