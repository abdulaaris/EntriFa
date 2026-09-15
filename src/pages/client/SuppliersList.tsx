import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Supplier } from '../../types';
import { Search, Plus, Truck, BookOpen, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supplierService } from '../../firebase/services';

export const SuppliersList: React.FC = () => {
  const { tenant, canAccess } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!tenant?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = supplierService.subscribeSuppliers(tenant.id, (list) => {
      setAllSuppliers(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [tenant?.id]);

  const suppliers = allSuppliers.filter(s => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(query)) ||
      (s.mobile && s.mobile.includes(query)) ||
      (s.email && s.email.toLowerCase().includes(query))
    );
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile || !tenant?.id) return;
    setIsAdding(true);
    try {
      await supplierService.createSupplier(tenant.id, {
        name,
        mobile,
        email,
        address,
        openingBalance: parseFloat(openingBalance) || 0,
      });

      showToast(`Supplier "${name}" created successfully.`, 'success');
      setAddModalOpen(false);
      setName('');
      setMobile('');
      setEmail('');
      setAddress('');
      setOpeningBalance('0');
    } catch (err: any) {
      showToast(err.message || 'Error creating supplier', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!tenant?.id) return;
    if (!confirm(`Delete supplier "${name}"?`)) return;
    try {
      await supplierService.deleteSupplier(tenant.id, id);
      showToast('Supplier deleted.', 'success');
    } catch (err) {
      showToast('Failed to delete supplier', 'error');
    }
  };

  const currency = tenant?.currency || '₹';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Suppliers & Payables</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage vendor purchase credit, payments made, and supplier ledgers
          </p>
        </div>

        {canAccess('suppliers', 'add') && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search supplier name, mobile..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-right">Outstanding Payable</th>
                <th className="py-3 px-4 text-right">Total Purchases</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading suppliers...</td></tr>
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">No suppliers found.</td></tr>
              ) : (
                suppliers.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/60">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{s.name}</p>
                          <p className="text-[10px] text-gray-400">{s.address || 'Local Vendor'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-600">{s.mobile}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600 text-sm">
                      {currency}{s.currentBalance.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-gray-700">
                      {currency}{s.totalCredit.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-600">
                      {currency}{s.totalPayments.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-500 text-[11px]">
                      {s.lastTransactionDate || 'None'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => showToast(`Supplier ledger for ${s.name} balance: ${currency}${s.currentBalance}`, 'info')}
                          className="px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg font-bold text-[11px] hover:bg-brand-100"
                        >
                          Ledger
                        </button>
                        {canAccess('suppliers', 'delete') && (
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 p-6 space-y-4">
            <h3 className="font-bold text-base text-gray-900">Add New Supplier</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Paper Mills"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98450 00000"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Opening Payable ({currency})</label>
                <input
                  type="number"
                  placeholder="0 (Amount you owe to this supplier)"
                  value={openingBalance}
                  onChange={e => setOpeningBalance(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Address / Warehouse</label>
                <input
                  type="text"
                  placeholder="Street or industrial estate"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-xs font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20"
                >
                  {isAdding ? 'Saving...' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
