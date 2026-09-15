import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Customer } from '../../types';
import { GiveGetModal } from '../../components/common/GiveGetModal';
import { WhatsAppModal } from '../../components/common/WhatsAppModal';
import {
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  MessageSquare,
  MoreVertical,
  Trash2,
  Edit,
  User,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../../firebase/services';

export const CustomersList: React.FC = () => {
  const { tenant, canAccess } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'RECEIVABLE' | 'ADVANCE' | 'SETTLED'>('ALL');

  // Modals
  const [giveGetOpen, setGiveGetOpen] = useState(false);
  const [giveGetType, setGiveGetType] = useState<'GIVE' | 'GET'>('GET');
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);

  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waCustomer, setWaCustomer] = useState<Customer | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newOpeningBal, setNewOpeningBal] = useState('0');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!tenant?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = customerService.subscribeCustomers(tenant.id, (list) => {
      setAllCustomers(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [tenant?.id]);

  // Client-side search & filtering
  const customers = allCustomers.filter(c => {
    if (search) {
      const s = search.toLowerCase();
      const matches =
        (c.name && c.name.toLowerCase().includes(s)) ||
        (c.mobile && c.mobile.includes(s)) ||
        (c.email && c.email.toLowerCase().includes(s));
      if (!matches) return false;
    }
    const bal = c.currentBalance || 0;
    if (filter === 'RECEIVABLE') return bal > 0;
    if (filter === 'ADVANCE') return bal < 0;
    if (filter === 'SETTLED') return bal === 0;
    return true;
  });

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newMobile || !tenant?.id) return;

    setIsAdding(true);
    try {
      await customerService.createCustomer(tenant.id, {
        name: newName,
        mobile: newMobile,
        email: newEmail,
        address: newAddress,
        openingBalance: parseFloat(newOpeningBal) || 0,
      });

      showToast(`Customer "${newName}" added successfully.`, 'success');
      setAddModalOpen(false);
      setNewName('');
      setNewMobile('');
      setNewEmail('');
      setNewAddress('');
      setNewOpeningBal('0');
    } catch (err: any) {
      showToast(err.message || 'Failed to add customer', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!tenant?.id) return;
    if (!confirm(`Are you sure you want to delete customer "${name}"?`)) return;

    try {
      await customerService.deleteCustomer(tenant.id, id);
      showToast('Customer deleted successfully.', 'success');
    } catch (err) {
      showToast('Failed to delete customer', 'error');
    }
  };

  const openTxnModal = (type: 'GIVE' | 'GET', cust: Customer) => {
    setGiveGetType(type);
    setSelectedCust(cust);
    setGiveGetOpen(true);
  };

  const openWhatsAppModal = (cust: Customer) => {
    setWaCustomer(cust);
    setWaModalOpen(true);
  };

  const currency = tenant?.currency || '₹';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Customer Accounts & Ledger</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage customer credit, payment records, balances, and digital Khata
          </p>
        </div>

        {canAccess('customers', 'add') && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        )}
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer name, mobile..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {(['ALL', 'RECEIVABLE', 'ADVANCE', 'SETTLED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                filter === tab
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab === 'ALL' && 'All Customers'}
              {tab === 'RECEIVABLE' && 'You will Get (Due)'}
              {tab === 'ADVANCE' && 'Advance Paid'}
              {tab === 'SETTLED' && 'Settled (₹0)'}
            </button>
          ))}
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-right">Current Balance</th>
                <th className="py-3 px-4 text-right">Total Credit (GIVE)</th>
                <th className="py-3 px-4 text-right">Total Paid (GET)</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading customers...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">No customers found.</td></tr>
              ) : (
                customers.map(c => {
                  const isDue = c.currentBalance > 0;
                  const isAdvance = c.currentBalance < 0;

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => navigate(`/customers/${c.id}`)}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-xs">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
                              {c.name}
                            </p>
                            <span className="text-[10px] text-gray-400">View Khata &rarr;</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-gray-600">
                        {c.mobile}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-black font-mono text-sm ${
                            isDue
                              ? 'text-rose-600'
                              : isAdvance
                              ? 'text-emerald-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {currency}{Math.abs(c.currentBalance).toLocaleString()}
                        </span>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase">
                          {isDue ? 'Due (Red)' : isAdvance ? 'Advance (Green)' : 'Settled'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-gray-700">
                        {currency}{c.totalCredit.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-600">
                        {currency}{c.totalPayments.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-gray-500 text-[11px]">
                        {c.lastTransactionDate || 'None'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Fast GET button */}
                          <button
                            onClick={() => openTxnModal('GET', c)}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg font-bold text-[11px] transition-colors"
                            title="Record Payment Received"
                          >
                            GET
                          </button>

                          {/* Fast GIVE button */}
                          <button
                            onClick={() => openTxnModal('GIVE', c)}
                            className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg font-bold text-[11px] transition-colors"
                            title="Give Credit / Goods"
                          >
                            GIVE
                          </button>

                          {/* WhatsApp button */}
                          <button
                            onClick={() => openWhatsAppModal(c)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {/* View Ledger */}
                          <button
                            onClick={() => navigate(`/customers/${c.id}`)}
                            className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Open Customer Ledger"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>

                          {canAccess('customers', 'delete') && (
                            <button
                              onClick={() => handleDelete(c.id, c.name)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900">Add New Customer</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-gray-400 hover:text-gray-700 font-bold text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asif Qureshi"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 00000"
                  value={newMobile}
                  onChange={e => setNewMobile(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Opening Balance ({currency})</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{currency}</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="0 (Enter positive if customer owes you, negative if advance)"
                    value={newOpeningBal}
                    onChange={e => setNewOpeningBal(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Positive = Customer owes you | Negative = Advance paid</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Address (Optional)</label>
                <input
                  type="text"
                  placeholder="Shop or residential address"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 disabled:opacity-50"
                >
                  {isAdding ? 'Saving...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Give / Get Modal */}
      <GiveGetModal
        isOpen={giveGetOpen}
        onClose={() => setGiveGetOpen(false)}
        defaultType={giveGetType}
        selectedCustomer={selectedCust}
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
