import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { User, StaffPermissions } from '../../types';
import { UserCheck, Plus, Trash2, Edit, Check, X, Shield } from 'lucide-react';
import { staffService } from '../../firebase/services';

const MODULE_OPTIONS = [
  'customers', 'suppliers', 'transactions', 'ledger', 'expenses', 'income', 'products', 'inventory', 'invoices', 'reports'
];

export const StaffPage: React.FC = () => {
  const { tenant, user } = useAuth();
  const { showToast } = useNotifications();

  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Permission Matrix state
  const [permissions, setPermissions] = useState<StaffPermissions>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStaff = async () => {
    if (!tenant?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await staffService.getStaff(tenant.id);
      setStaffList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [tenant?.id]);

  const openAddModal = () => {
    setEditingStaffId(null);
    setName('');
    setMobile('');
    setEmail('');
    setUsername('');
    setPassword('');

    // Default permission preset (e.g. Sales)
    const initialPerms: StaffPermissions = {};
    MODULE_OPTIONS.forEach(mod => {
      initialPerms[mod] = {
        view: ['customers', 'transactions', 'ledger', 'products', 'invoices'].includes(mod),
        add: ['customers', 'transactions', 'invoices'].includes(mod),
        edit: false,
        delete: false,
        export: ['customers', 'transactions'].includes(mod),
      };
    });
    setPermissions(initialPerms);
    setModalOpen(true);
  };

  const openEditModal = (staff: User) => {
    setEditingStaffId(staff.id);
    setName(staff.name);
    setMobile(staff.mobile);
    setEmail(staff.email);
    setUsername(staff.username);
    setPassword(''); // leave blank to keep unchanged
    setPermissions(staff.permissions || {});
    setModalOpen(true);
  };

  const togglePermission = (mod: string, action: 'view' | 'add' | 'edit' | 'delete' | 'export') => {
    setPermissions(prev => {
      const currentMod = prev[mod] || { view: false, add: false, edit: false, delete: false, export: false };
      return {
        ...prev,
        [mod]: {
          ...currentMod,
          [action]: !currentMod[action],
        },
      };
    });
  };

  const applyPreset = (preset: 'SALES' | 'ACCOUNTANT' | 'READONLY') => {
    const updated: StaffPermissions = {};
    MODULE_OPTIONS.forEach(mod => {
      if (preset === 'SALES') {
        updated[mod] = {
          view: ['customers', 'transactions', 'ledger', 'products', 'invoices'].includes(mod),
          add: ['customers', 'transactions', 'invoices'].includes(mod),
          edit: ['customers'].includes(mod),
          delete: false,
          export: ['customers'].includes(mod),
        };
      } else if (preset === 'ACCOUNTANT') {
        updated[mod] = {
          view: true,
          add: true,
          edit: true,
          delete: false,
          export: true,
        };
      } else {
        // READONLY
        updated[mod] = {
          view: true,
          add: false,
          edit: false,
          delete: false,
          export: true,
        };
      }
    });
    setPermissions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;
    setIsSubmitting(true);

    try {
      if (editingStaffId) {
        await staffService.updateStaffPermissions(editingStaffId, permissions);
        showToast('Staff permissions updated successfully.', 'success');
        setModalOpen(false);
        fetchStaff();
      } else {
        if (!password || password.length < 6) {
          showToast('Password must be at least 6 characters', 'error');
          setIsSubmitting(false);
          return;
        }

        await staffService.createStaff(tenant.id, {
          name,
          mobile,
          email,
          password,
          permissions,
        });

        showToast(`Staff account "${name}" created successfully.`, 'success');
        setModalOpen(false);
        fetchStaff();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save staff', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, staffName: string) => {
    if (!confirm(`Remove staff member "${staffName}"?`)) return;
    try {
      await staffService.deleteStaff(id);
      showToast('Staff member removed.', 'success');
      fetchStaff();
    } catch (err) {
      showToast('Error removing staff', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Staff & Permissions Matrix</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage employee accounts with granular View, Add, Edit, Delete and Export access control
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Staff Member
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Username / Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Permitted Modules</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">Loading staff...</td></tr>
              ) : staffList.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">No staff members created yet.</td></tr>
              ) : (
                staffList.map(s => {
                  const permittedCount = Object.keys(s.permissions || {}).filter(k => s.permissions?.[k]?.view).length;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/60">
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-xs">
                            {s.name.charAt(0)}
                          </div>
                          <span>{s.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-600">{s.email}</td>
                      <td className="py-3.5 px-4 font-mono text-gray-600">{s.mobile}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {s.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold text-brand-700">
                          {permittedCount} modules allowed
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1.5 text-gray-500 hover:text-brand-600 rounded-lg hover:bg-gray-100"
                            title="Edit Permissions"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100"
                            title="Delete Staff"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Staff Permission Matrix Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 max-h-[92vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">
                {editingStaffId ? `Edit Permissions: ${name}` : 'Add Staff Member & Assign Roles'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl font-bold">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto space-y-4 flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="staff@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Password {editingStaffId ? '(Leave blank to keep current)' : '*'}
                  </label>
                  <input
                    type="password"
                    required={!editingStaffId}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Permission Presets */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase">Role Presets:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('SALES')}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100"
                  >
                    Sales Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('ACCOUNTANT')}
                    className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100"
                  >
                    Accountant
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('READONLY')}
                    className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200"
                  >
                    View Only
                  </button>
                </div>
              </div>

              {/* Permission Matrix Grid */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Module</th>
                      <th className="py-2.5 px-3 text-center">View</th>
                      <th className="py-2.5 px-3 text-center">Add</th>
                      <th className="py-2.5 px-3 text-center">Edit</th>
                      <th className="py-2.5 px-3 text-center">Delete</th>
                      <th className="py-2.5 px-3 text-center">Export</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {MODULE_OPTIONS.map(mod => {
                      const perm = permissions[mod] || { view: false, add: false, edit: false, delete: false, export: false };
                      return (
                        <tr key={mod} className="hover:bg-gray-50">
                          <td className="py-2 px-3 font-bold text-gray-800 capitalize">{mod}</td>
                          {(['view', 'add', 'edit', 'delete', 'export'] as const).map(action => (
                            <td key={action} className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={!!perm[action]}
                                onChange={() => togglePermission(mod, action)}
                                className="h-4 w-4 text-brand-600 focus:ring-brand-500 rounded cursor-pointer"
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-xs font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20"
                >
                  {isSubmitting ? 'Saving...' : editingStaffId ? 'Save Permissions' : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
