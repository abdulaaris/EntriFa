import React, { useState, useEffect } from 'react';
import { Customer, TransactionType, PaymentMethod } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { X, ArrowDownLeft, ArrowUpRight, Calendar, CreditCard, FileText } from 'lucide-react';
import { customerService, transactionService } from '../../firebase/services';

interface GiveGetModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
  selectedCustomer?: Customer | null;
  onSuccess?: () => void;
}

export const GiveGetModal: React.FC<GiveGetModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'GET',
  selectedCustomer = null,
  onSuccess,
}) => {
  const { user, tenant } = useAuth();
  const { showToast } = useNotifications();

  const [type, setType] = useState<TransactionType>(defaultType);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<string>(selectedCustomer?.id || '');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setType(defaultType);
  }, [defaultType]);

  useEffect(() => {
    if (selectedCustomer) {
      setCustomerId(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (isOpen && tenant?.id && !selectedCustomer) {
      // Load customers list for dropdown
      const unsubscribe = customerService.subscribeCustomers(tenant.id, (data) => {
        setCustomers(data);
        if (!customerId && data.length > 0) {
          setCustomerId(data[0].id);
        }
      });
      return () => unsubscribe();
    }
  }, [isOpen, tenant?.id]);

  if (!isOpen) return null;

  const currentCust = selectedCustomer || customers.find(c => c.id === customerId);
  const numAmount = parseFloat(amount) || 0;
  const currBal = currentCust?.currentBalance || 0;
  const newBalance = type === 'GIVE' ? currBal + numAmount : currBal - numAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) {
      showToast('No active tenant workspace found.', 'error');
      return;
    }
    if (!customerId) {
      showToast('Please select a customer.', 'error');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      showToast('Please enter a valid amount.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await transactionService.recordTransaction(
        tenant.id,
        {
          customerId,
          type,
          amount: numAmount,
          date,
          paymentMethod,
          description: description.trim() || (type === 'GET' ? 'Payment Received' : 'Credit Given'),
          notes: notes.trim(),
        },
        user?.name || 'Admin'
      );

      showToast(
        `${type === 'GET' ? 'Payment of' : 'Credit of'} ${tenant?.currency || '₹'}${numAmount.toLocaleString()} recorded successfully!`,
        'success'
      );

      // Reset and close
      setAmount('');
      setDescription('');
      setNotes('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error recording transaction', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isGet = type === 'GET';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header Tabs: Two Large Primary Actions */}
        <div className="grid grid-cols-2 p-1.5 bg-gray-100 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setType('GET')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
              isGet
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowDownLeft className="w-5 h-5" />
            GET PAYMENT (Received)
          </button>

          <button
            type="button"
            onClick={() => setType('GIVE')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
              !isGet
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowUpRight className="w-5 h-5" />
            GIVE CREDIT (Given)
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Customer Selector / Display */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Customer
            </label>
            {selectedCustomer ? (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{selectedCustomer.name}</p>
                  <p className="text-xs text-gray-500">{selectedCustomer.mobile}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">Current Balance:</span>
                  <p className={`font-bold text-sm ${currBal > 0 ? 'text-rose-600' : currBal < 0 ? 'text-emerald-600' : 'text-gray-700'}`}>
                    {tenant?.currency || '₹'}{Math.abs(currBal).toLocaleString()} {currBal > 0 ? '(Due)' : currBal < 0 ? '(Advance)' : ''}
                  </p>
                </div>
              </div>
            ) : (
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">-- Select Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.mobile}) - Bal: {tenant?.currency || '₹'}{c.currentBalance}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Amount ({tenant?.currency || '₹'})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">
                {tenant?.currency || '₹'}
              </span>
              <input
                type="number"
                step="any"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className={`w-full pl-9 pr-4 py-3 border-2 rounded-xl text-2xl font-black text-gray-900 focus:outline-none transition-colors ${
                  isGet
                    ? 'border-emerald-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-rose-200 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20'
                }`}
              />
            </div>
          </div>

          {/* Live Running Balance Indicator */}
          {numAmount > 0 && currentCust && (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs flex items-center justify-between">
              <span className="text-gray-600 font-medium">Running Balance After Transaction:</span>
              <span className={`font-black text-sm ${newBalance > 0 ? 'text-rose-600' : newBalance < 0 ? 'text-emerald-600' : 'text-gray-800'}`}>
                {tenant?.currency || '₹'}{Math.abs(newBalance).toLocaleString()} {newBalance > 0 ? '(Customer Owes)' : newBalance < 0 ? '(Customer Advance)' : '(Settled 0)'}
              </span>
            </div>
          )}

          {/* Date & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Payment Type
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="OTHER">Other / Credit Entry</option>
                </select>
              </div>
            </div>
          </div>

          {/* Description & Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Description / Item details
            </label>
            <input
              type="text"
              placeholder={isGet ? "e.g., GooglePay received, Bill payment" : "e.g., Rice 2 Bags, Oil box, Grocery supply"}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="Internal remarks..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50 ${
                isGet
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              }`}
            >
              {isSubmitting ? 'Saving...' : isGet ? `Record GET (${tenant?.currency || '₹'}${numAmount || '0'})` : `Save GIVE (${tenant?.currency || '₹'}${numAmount || '0'})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
