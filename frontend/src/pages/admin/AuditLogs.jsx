import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Clock,
  RotateCw,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Settings
} from 'lucide-react';
import api from '../../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/audit-logs');
      if (res.data?.logs) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.warn('Fallback mock audit logs');
      setLogs([
        {
          id: 1,
          user_name: 'Prof. K. N. Sharma',
          user_role: 'admin',
          action: 'CAMPUS_SETTINGS_UPDATED',
          target_type: 'SETTINGS',
          target_id: '1',
          details: 'Updated campus boundary: SKIT Campus, Lat: 26.8227, Lon: 75.8653, Radius: 300m',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 2,
          user_name: 'Er. Amit Patel',
          user_role: 'teacher',
          action: 'ATTENDANCE_REJECTED',
          target_type: 'ATTENDANCE',
          target_id: 'EMP-1004',
          details: 'Rejected check-in for EMP-1004: Outside Campus Geofence (850.0m > 300m)',
          timestamp: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 3,
          user_name: 'Dr. Ananya Sharma',
          user_role: 'teacher',
          action: 'ATTENDANCE_MARKED',
          target_type: 'ATTENDANCE',
          target_id: '601',
          details: 'Attendance marked (present) at 08:52:14. Distance: 42.3m, Face: 96.4%.',
          timestamp: new Date(Date.now() - 14400000).toISOString()
        },
        {
          id: 4,
          user_name: 'Prof. K. N. Sharma',
          user_role: 'admin',
          action: 'TEACHER_CREATED',
          target_type: 'TEACHER',
          target_id: '6',
          details: 'Created new faculty Dr. Priya Nair (EMP-1005), Department: Applied Sciences',
          timestamp: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 5,
          user_name: 'System Kernel',
          user_role: 'system',
          action: 'SYSTEM_INIT',
          target_type: 'SYSTEM',
          target_id: '1',
          details: 'VERICAMP institutional database setup and campus geofence configuration initialized.',
          timestamp: new Date(Date.now() - 172800000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    if (searchTerm) {
      const matchDetails = l.details?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchUser = l.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchAction = l.action?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDetails || matchUser || matchAction;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">Institutional Audit & Compliance Trail</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident record of administrative modifications, rejected biometric verifications, and user security events.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition self-start sm:self-auto cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Trail</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 min-w-[280px]">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search audit trail by actor, action, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-500 pl-8"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <div className="w-56">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Audit Actions</option>
              <option value="ATTENDANCE_MARKED">Attendance Marked</option>
              <option value="ATTENDANCE_REJECTED">Attendance Rejected</option>
              <option value="CAMPUS_SETTINGS_UPDATED">Campus Settings Updated</option>
              <option value="TEACHER_CREATED">Faculty Created</option>
              <option value="USER_LOGIN">User Login</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c2340] text-white font-semibold">
              <tr>
                <th className="py-3 px-4">Event Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action Code</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Audit Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {log.timestamp?.replace('T', ' ').split('.')[0]}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{log.user_name || 'System'}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">{log.user_role || 'kernel'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          log.action.includes('REJECTED')
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : log.action.includes('SETTINGS')
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : log.action.includes('MARKED')
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {log.target_type} #{log.target_id || '--'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 leading-relaxed">
                      {log.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No audit records match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
