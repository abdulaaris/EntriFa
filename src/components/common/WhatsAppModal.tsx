import React, { useState } from 'react';
import { Customer, Transaction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Send, Copy, Check } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  transaction?: Transaction;
  mode?: 'REMINDER' | 'RECEIPT' | 'STATEMENT';
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  customer,
  transaction,
  mode = 'REMINDER',
}) => {
  const { tenant } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currency = tenant?.currency || '₹';
  const businessName = tenant?.name || 'EntriFa Business';

  let defaultText = '';

  if (mode === 'REMINDER') {
    defaultText = `Hello ${customer.name},\n\nYour current balance with ${businessName} is ${currency}${Math.abs(customer.currentBalance).toLocaleString()}${customer.currentBalance > 0 ? ' (Due payment)' : ' (Advance balance)'}.\n\nPlease clear the pending balance at your earliest convenience.\n\nThank you,\n${businessName}\nPowered by EntriFa`;
  } else if (mode === 'RECEIPT' && transaction) {
    defaultText = `Payment Receipt from ${businessName}\n\nCustomer: ${customer.name}\nTransaction: ${transaction.type} ${currency}${transaction.amount.toLocaleString()}\nMethod: ${transaction.paymentMethod}\nDate: ${transaction.date}\nRunning Balance: ${currency}${Math.abs(transaction.runningBalance).toLocaleString()}\n\nThank you for doing business with us!\nPowered by EntriFa`;
  } else {
    defaultText = `Ledger Statement from ${businessName}\n\nCustomer: ${customer.name}\nTotal Credit Given: ${currency}${customer.totalCredit.toLocaleString()}\nTotal Payment Received: ${currency}${customer.totalPayments.toLocaleString()}\nCurrent Outstanding Balance: ${currency}${Math.abs(customer.currentBalance).toLocaleString()}\n\nThank you,\n${businessName}\nPowered by EntriFa`;
  }

  const [message, setMessage] = useState(defaultText);

  // Strip non-digits from customer mobile
  const cleanMobile = customer.mobile.replace(/\D/g, '');
  const encodedText = encodeURIComponent(message);
  const waUrl = `https://wa.me/${cleanMobile}?text=${encodedText}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500 rounded-xl">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Share via WhatsApp</h3>
              <p className="text-xs text-emerald-100">Send instant reminder or receipt to customer</p>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-100 hover:text-white text-xl font-bold">
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-gray-100">
            <span>Recipient: <strong className="text-gray-800">{customer.name}</strong></span>
            <span>Mobile: <strong className="text-gray-800">{customer.mobile}</strong></span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Message Preview (Editable)
            </label>
            <textarea
              rows={7}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 py-2.5 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to clipboard' : 'Copy Text'}
            </button>

            <button
              type="button"
              onClick={handleSend}
              className="flex-1 py-2.5 px-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              Open in WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
