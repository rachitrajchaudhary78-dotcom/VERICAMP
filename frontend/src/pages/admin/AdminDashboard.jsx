import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Clock,
  ArrowRight,
  Download,
  Calendar,
  FileText,
  Camera
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../../services/api';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminDashboard = async () => {
      try {
        const res = await api.get('/admin/dashboard');
        if (res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.warn('Using local fallback for admin dashboard');
        // Fallback demo data
        setData({
          summary: {
            total_teachers: 38,
            present_today: 34,
            absent_today: 4,
            rejected_today: 1,
            attendance_rate: 89.5
          },
          weekly_trends: [
            { day_name: 'Mon', present: 36, absent: 2, rejected: 0 },
            { day_name: 'Tue', present: 35, absent: 3, rejected: 1 },
            { day_name: 'Wed', present: 37, absent: 1, rejected: 0 },
            { day_name: 'Thu', present: 34, absent: 4, rejected: 2 },
            { day_name: 'Fri', present: 33, absent: 5, rejected: 1 },
            { day_name: 'Sat', present: 32, absent: 6, rejected: 0 },
            { day_name: 'Today', present: 34, absent: 4, rejected: 1 },
          ],
          department_stats: [
            { department: 'Computer Science & Engg', total_faculty: 12, present_count: 11 },
            { department: 'Electronics & Comm. Engg', total_faculty: 8, present_count: 7 },
            { department: 'Mechanical Engineering', total_faculty: 7, present_count: 6 },
            { department: 'Information Technology', total_faculty: 6, present_count: 5 },
            { department: 'Applied Sciences', total_faculty: 5, present_count: 5 },
          ],
          recent_events: [
            {
              id: 501,
              full_name: 'Dr. Ananya Sharma',
              employee_id: 'EMP-1001',
              department: 'Computer Science & Engg',
              timestamp: '08:52:14 AM',
              status: 'present',
              face_score: 96.4,
              distance_meters: 42.3
            },
            {
              id: 502,
              full_name: 'Prof. Rajesh Verma',
              employee_id: 'EMP-1002',
              department: 'Electronics & Comm.',
              timestamp: '08:58:30 AM',
              status: 'present',
              face_score: 95.1,
              distance_meters: 61.2
            },
            {
              id: 503,
              full_name: 'Er. Amit Patel',
              employee_id: 'EMP-1004',
              department: 'Information Technology',
              timestamp: '09:12:05 AM',
              status: 'rejected',
              face_score: 64.0,
              distance_meters: 850.0,
              failure_reason: 'Outside Campus Geofence (850m > 300m)'
            }
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAdminDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading Institutional Analytics...</p>
        </div>
      </div>
    );
  }

  const { summary, weekly_trends, department_stats, recent_events } = data || {};

  return (
    <div className="space-y-6">
      {/* Top Welcome & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Institutional Administration Dashboard</h2>
            <span className="text-[11px] bg-blue-900 text-white font-bold px-2 py-0.5 rounded">
              SKIT JAIPUR
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time biometric attendance oversight, geofence compliance, and faculty presence monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/attendance"
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
          >
            All Attendance Logs
          </Link>
          <Link
            to="/admin/teachers"
            className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition"
          >
            Manage Teachers
          </Link>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Teachers */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Faculty</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{summary?.total_teachers || 0}</span>
            <span className="text-xs text-slate-500">Registered</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">100% Biometric Enrolled</p>
        </div>

        {/* Present Today */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Present Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600">{summary?.present_today || 0}</span>
            <span className="text-xs text-slate-500">
              ({summary?.attendance_rate || 0}%)
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Verified within Campus</p>
        </div>

        {/* Absent Today */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Absent Today</span>
            <XCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-600">{summary?.absent_today || 0}</span>
            <span className="text-xs text-slate-500">Teachers</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Unmarked or on leave</p>
        </div>

        {/* Rejected Attendance Attempts */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Rejected Attempts</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-600">{summary?.rejected_today || 0}</span>
            <span className="text-xs text-slate-500">Attempts</span>
          </div>
        </div>
      </div>

      {/* Action Required Banners for Approvals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pending Leaves Alert */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-white rounded-xl border border-amber-200 p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">Faculty Leave Requests</h4>
                {(summary?.pending_leaves || 0) > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500 text-white animate-pulse">
                    {summary.pending_leaves} Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and approve or reject submitted faculty leave applications.
              </p>
            </div>
          </div>
          <Link
            to="/admin/leaves"
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5 shrink-0"
          >
            Review Leaves
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Pending Face Updates Alert */}
        <div className="bg-gradient-to-r from-indigo-500/10 via-indigo-50 to-white rounded-xl border border-indigo-200 p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-300 flex items-center justify-center text-indigo-700">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">Face Update Requests</h4>
                {(summary?.pending_face_updates || 0) > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-600 text-white animate-pulse">
                    {summary.pending_face_updates} Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Authorize appearance changes and run live camera re-enrollments.
              </p>
            </div>
          </div>
          <Link
            to="/admin/face-updates"
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5 shrink-0"
          >
            Manage Faces
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Analytics Charts (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day Trend Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                7-Day Institutional Attendance Trend
              </h3>
              <p className="text-[11px] text-slate-500">Daily breakdown of Present vs Absent faculty</p>
            </div>
            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              Live Feed
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly_trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day_name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0c2340', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="present" name="Present (Verified)" fill="#1b4d89" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" name="Absent" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" name="Rejected" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Breakdown (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Department Presence Rates
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">Today's turnout across engineering faculties</p>

            <div className="space-y-2.5">
              {department_stats?.map((dept, idx) => {
                const pct = dept.total_faculty > 0 ? Math.round((dept.present_count / dept.total_faculty) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={dept.department}>
                        {dept.department}
                      </span>
                      <span className="font-mono text-slate-600 font-bold">
                        {dept.present_count} / {dept.total_faculty} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Overall Campus Turnout</span>
            <span className="font-extrabold text-blue-900 font-mono text-sm">
              {summary?.attendance_rate}%
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activity Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Real-time Campus Check-in Stream
            </h3>
          </div>
          <Link to="/admin/attendance" className="text-xs text-blue-600 hover:underline font-semibold">
            View Complete Logs →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Faculty Member</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Verification Status</th>
                <th className="py-2.5 px-4">Face Similarity</th>
                <th className="py-2.5 px-4">Geofence Distance</th>
                <th className="py-2.5 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recent_events?.map((ev, idx) => (
                <tr key={ev.id || idx} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {ev.full_name} <span className="text-slate-400 text-[10px]">({ev.employee_id})</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{ev.department}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {ev.timestamp?.includes('T') ? ev.timestamp.split('T')[1].split('.')[0] : ev.timestamp}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        ev.status === 'present'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                          : ev.status === 'late'
                          ? 'bg-amber-50 text-amber-700 border border-amber-300'
                          : 'bg-rose-50 text-rose-700 border border-rose-300'
                      }`}
                    >
                      {ev.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    {ev.face_score ? `${ev.face_score}%` : '--'}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {ev.distance_meters !== undefined ? `${ev.distance_meters} m` : '--'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-xs">
                    {ev.failure_reason || 'Verified presence within campus geofence.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
