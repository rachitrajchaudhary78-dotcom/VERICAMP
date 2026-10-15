import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  Search,
  ScanFace
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function AttendanceHistory() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const params = {};
        if (statusFilter !== 'all') params.status = statusFilter;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const res = await api.get('/attendance/history', { params });
        if (res.data?.records) {
          setRecords(res.data.records);
        }
      } catch (err) {
        console.warn('Fallback mock history records');
        // Fallback demo records
        const demoRecords = [];
        for (let i = 0; i < 15; i++) {
          const d = new Date(Date.now() - i * 86400000);
          const dateStr = d.toISOString().split('T')[0];
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          if (!isWeekend) {
            demoRecords.push({
              id: 200 + i,
              date: dateStr,
              timestamp: `${dateStr}T08:${45 + (i % 15)}:22`,
              status: i === 4 ? 'late' : i === 9 ? 'rejected' : 'present',
              face_score: i === 9 ? 64.2 : 96.5 - (i * 0.2),
              distance_meters: i === 9 ? 740.0 : 35.0 + (i * 3),
              inside_campus: i === 9 ? 0 : 1,
              failure_reason: i === 9 ? 'Outside Geofence (740m > 300m)' : null,
              device_info: 'Chrome Mobile / Android 14'
            });
          }
        }
        setRecords(demoRecords);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [statusFilter, startDate, endDate]);

  const filteredRecords = records.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchTerm) {
      const matchDate = r.date?.includes(searchTerm);
      const matchStatus = r.status?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDate || matchStatus;
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ['Record ID', 'Date', 'Time', 'Status', 'Face Similarity (%)', 'Distance (m)', 'Inside Campus', 'Failure Reason'];
    const rows = filteredRecords.map(r => [
      r.id,
      r.date,
      r.timestamp?.split('T')?.[1]?.split('.')?.[0] || r.timestamp,
      r.status,
      r.face_score || '--',
      r.distance_meters !== undefined ? r.distance_meters : '--',
      r.inside_campus ? 'YES' : 'NO',
      `"${r.failure_reason || 'N/A'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VERICAMP_Attendance_${user?.employee_id}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Personal Attendance History</h2>
          <p className="text-xs text-slate-500 mt-1">
            Faculty: <span className="font-semibold text-slate-700">{user?.full_name}</span> ({user?.employee_id}) • Department: <span className="font-semibold text-slate-700">{user?.department}</span>
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={filteredRecords.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Statement</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>Filter Records</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Verification Statuses</option>
              <option value="present">Present (On-Time)</option>
              <option value="late">Late Arrival</option>
              <option value="rejected">Rejected Attempts</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Search Keyword</label>
            <div className="relative">
              <input
                type="text"
                placeholder="YYYY-MM-DD or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-500 pl-8"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c2340] text-white font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Check-in Time</th>
                <th className="py-3 px-4">Attendance Status</th>
                <th className="py-3 px-4">Face Match</th>
                <th className="py-3 px-4">Geofence Distance</th>
                <th className="py-3 px-4">Inside Campus</th>
                <th className="py-3 px-4">Notes / Failure Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Fetching attendance logs...
                  </td>
                </tr>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">{r.date}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {r.timestamp?.includes('T') ? r.timestamp.split('T')[1].split('.')[0] : r.timestamp}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.status === 'present'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            : r.status === 'late'
                            ? 'bg-amber-50 text-amber-700 border border-amber-300'
                            : 'bg-rose-50 text-rose-700 border border-rose-300'
                        }`}
                      >
                        {r.status === 'present' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {r.status === 'late' && <Clock className="w-3 h-3 text-amber-600" />}
                        {r.status === 'rejected' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {r.face_score ? `${r.face_score}%` : '--'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {r.distance_meters !== undefined ? `${r.distance_meters} m` : '--'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-semibold ${
                          r.inside_campus ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {r.inside_campus ? '✓ Within Perimeter' : '✗ Outside Geofence'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                      {r.failure_reason || (r.status === 'present' ? 'Verified on-time check-in' : 'Late attendance logged')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No attendance records match the selected criteria.
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
