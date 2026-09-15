import React, { useState, useEffect } from 'react';
import { ActivityLogItem } from '../../types';
import { Search, History, Filter } from 'lucide-react';
import { systemService } from '../../firebase/services';

export const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const allLogs = await systemService.getActivityLogs();
      let filtered = allLogs;
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(l =>
          (l.userName && l.userName.toLowerCase().includes(s)) ||
          (l.action && l.action.toLowerCase().includes(s)) ||
          (l.module && l.module.toLowerCase().includes(s)) ||
          (l.tenantName && l.tenantName.toLowerCase().includes(s))
        );
      }
      if (moduleFilter !== 'ALL') {
        filtered = filtered.filter(l => l.module === moduleFilter);
      }
      setLogs(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, moduleFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Platform Audit Logs</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Immutable chronological audit trail across all tenants, admins, staff, and system events
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search user, action, tenant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
          />
        </div>

        <select
          value={moduleFilter}
          onChange={e => setModuleFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 w-full sm:w-auto"
        >
          <option value="ALL">All Modules</option>
          <option value="Authentication">Authentication</option>
          <option value="Clients">Clients</option>
          <option value="Modules">Modules</option>
          <option value="Transactions">Transactions</option>
          <option value="Customers">Customers</option>
          <option value="Expenses">Expenses</option>
          <option value="Invoices">Invoices</option>
          <option value="Staff">Staff</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Client Tenant</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading audit trail...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">No activity logs found.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-bold text-gray-900">{log.userName}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {log.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-brand-700">{log.action}</td>
                    <td className="py-3 px-4 font-medium text-gray-600">{log.module}</td>
                    <td className="py-3 px-4 font-bold text-gray-800">{log.tenantName || 'Global Platform'}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                      {log.date} {log.time}
                    </td>
                    <td className="py-3 px-4 text-gray-500 truncate max-w-xs font-mono text-[10px]">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
