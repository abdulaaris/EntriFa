import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Customer, Product, InvoiceItem } from '../../types';
import { ArrowLeft, Plus, Trash2, Save, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { customerService, inventoryService, invoiceService } from '../../firebase/services';

export const InvoiceCreateEdit: React.FC = () => {
  const { tenant, user } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
  );
  const [paidAmount, setPaidAmount] = useState('0');
  const [notes, setNotes] = useState('Thank you for choosing EntriFa Business!');
  const [terms, setTerms] = useState('Payment due within 15 days of invoice date.');
  const [updateCustomerBalance, setUpdateCustomerBalance] = useState(true);

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, price: 0, discount: 0, tax: 5, total: 0 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!tenant?.id) return;

    const unsubCust = customerService.subscribeCustomers(tenant.id, (d) => {
      setCustomers(d);
      if (d.length > 0 && !customerId) setCustomerId(d[0].id);
    });

    const unsubProd = inventoryService.subscribeProducts(tenant.id, (p) => {
      setProducts(p);
    });

    return () => {
      unsubCust();
      unsubProd();
    };
  }, [tenant?.id]);

  // Update item field and recalculate line total
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      // If user selected a product from dropdown
      if (field === 'productId') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          item.description = prod.name;
          item.price = prod.sellingPrice;
        }
      }

      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const discount = Number(item.discount) || 0;
      const tax = Number(item.tax) || 0;

      const base = qty * price;
      const taxable = Math.max(0, base - discount);
      const taxAmt = (taxable * tax) / 100;
      item.total = taxable + taxAmt;

      updated[index] = item;
      return updated;
    });
  };

  const addItemRow = () => {
    setItems(prev => [
      ...prev,
      { description: '', quantity: 1, price: 0, discount: 0, tax: 5, total: 0 },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const totalDiscount = items.reduce((sum, item) => sum + Number(item.discount || 0), 0);
  const totalTax = items.reduce((sum, item) => {
    const taxable = Math.max(0, item.quantity * item.price - Number(item.discount || 0));
    return sum + (taxable * Number(item.tax || 0)) / 100;
  }, 0);
  const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;
    if (!customerId) {
      showToast('Please select a customer.', 'error');
      return;
    }
    if (items.length === 0 || grandTotal <= 0) {
      showToast('Please add at least one valid invoice item.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const cust = customers.find(c => c.id === customerId);
      const inv = await invoiceService.createInvoice(
        tenant.id,
        {
          customerId,
          customerName: cust?.name || 'Customer',
          customerMobile: cust?.mobile || '',
          items,
          subtotal,
          totalDiscount,
          totalTax,
          grandTotal,
          paidAmount: parseFloat(paidAmount) || 0,
          issueDate,
          dueDate,
          notes,
          terms,
          updateCustomerBalance,
        },
        user?.name || 'Staff'
      );

      showToast(`Invoice ${inv.invoiceNumber} created successfully!`, 'success');
      navigate('/invoices');
    } catch (err: any) {
      showToast(err.message || 'Error creating invoice', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currency = tenant?.currency || '₹';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/invoices')}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Create New Invoice</h1>
          <p className="text-xs text-gray-500">
            Generate customized commercial bill with items, discounts, and auto-ledger posting
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Invoice Meta */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Customer *</label>
            <select
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-brand-500"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.mobile})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Issue Date</label>
            <input
              type="date"
              value={issueDate}
              onChange={e => setIssueDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium"
            />
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="font-bold text-sm text-gray-900">Line Items & Products</h3>
            <button
              type="button"
              onClick={addItemRow}
              className="px-3 py-1.5 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Line Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-gray-50/70 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
              >
                {/* Product catalog select (optional) */}
                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">
                    Item / Product Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Item description"
                    value={item.description}
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold"
                  />
                  {products.length > 0 && (
                    <select
                      onChange={e => updateItem(idx, 'productId', e.target.value)}
                      className="mt-1 w-full text-[10px] text-gray-500 bg-transparent border-0 underline cursor-pointer"
                    >
                      <option value="">Or select from product catalog...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Price: {currency}{p.sellingPrice})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-center"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Unit Price ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={item.price}
                    onChange={e => updateItem(idx, 'price', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-right"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Discount</label>
                  <input
                    type="number"
                    step="any"
                    value={item.discount}
                    onChange={e => updateItem(idx, 'discount', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-right"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Tax %</label>
                  <input
                    type="number"
                    value={item.tax}
                    onChange={e => updateItem(idx, 'tax', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-right"
                  />
                </div>

                <div className="sm:col-span-1 text-right font-mono font-bold text-gray-900 text-xs">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Total</label>
                  {currency}{item.total.toFixed(2)}
                </div>

                <div className="sm:col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Breakdown & Totals Box */}
          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-mono">{currency}{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Total Discount:</span>
                <span className="font-mono">-{currency}{totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total Tax (GST):</span>
                <span className="font-mono">+{currency}{totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-gray-900 font-black text-sm text-gray-900">
                <span>Grand Total:</span>
                <span className="font-mono">{currency}{grandTotal.toFixed(2)}</span>
              </div>

              <div className="pt-2">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Immediate Payment Received ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={paidAmount}
                  onChange={e => setPaidAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-mono font-bold text-emerald-600 text-right"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center">
            <input
              id="update_ledger"
              type="checkbox"
              checked={updateCustomerBalance}
              onChange={e => setUpdateCustomerBalance(e.target.checked)}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 rounded"
            />
            <label htmlFor="update_ledger" className="ml-2.5 text-xs font-bold text-gray-800">
              Automatically update customer ledger & digital Khata balance with this invoice amount
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="px-5 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-transform active:scale-95 disabled:opacity-50"
          >
            <Receipt className="w-4 h-4" />
            {isSubmitting ? 'Generating Invoice...' : 'Generate Tax Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
};
