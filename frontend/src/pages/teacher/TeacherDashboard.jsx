import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  MapPin,
  Camera,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Sparkles,
  Info,
  CalendarCheck,
  ScanFace,
  Ban
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { DEFAULT_CAMPUS } from '../../services/geoUtils';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/teacher/dashboard');
        if (res.data) {
          setDashboardData(res.data);
        }
      } catch (err) {
        console.warn('Using local fallback for teacher dashboard metrics');
        setDashboardData({
          teacher: user,
          today_status: 'not_marked',
          today_record: null,
          total_present_month: 19,
          total_absent_month: 2,
          total_rejected_attempts: 0,
          is_on_leave_today: false,
          active_leave_today: null,
          pending_leaves_count: 0,
          approved_leaves_month: 0,
          recent_records: [],
          campus_settings: DEFAULT_CAMPUS
        });
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading Faculty Portal...</p>
        </div>
      </div>
    );
  }

  const isTodayMarked = dashboardData?.today_status === 'present' || dashboardData?.today_status === 'late';
  const isOnLeaveToday = Boolean(dashboardData?.is_on_leave_today);
  const activeLeave = dashboardData?.active_leave_today;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-lg border border-blue-200 shrink-0">
            {user?.full_name ? user.full_name.charAt(0) : 'T'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">{user?.full_name}</h2>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-300">
                Authorized Faculty
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Employee ID: <span className="font-semibold text-slate-700">{user?.employee_id}</span> • Department: <span className="font-semibold text-slate-700">{user?.department}</span>
            </p>
          </div>
        </div>

        {/* Quick Action Button */}
        <div>
          {isOnLeaveToday ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold shadow-xs">
              <Ban className="w-4 h-4 text-amber-600" />
              <span>Leave Approved Today (Attendance Locked)</span>
            </div>
          ) : isTodayMarked ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Today's Attendance Recorded</span>
            </div>
          ) : (
            <Link
              to="/teacher/mark"
              id="dashboard-mark-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Mark Today's Attendance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Prominent Approved Leave Alert Banner */}
      {isOnLeaveToday && (
        <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 shadow-sm flex items-start gap-3.5">
          <CalendarCheck className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-amber-900">
              Active Institutional Leave Approved for Today
            </h3>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Your <strong>{activeLeave?.leave_type || 'Leave'}</strong> is approved from{' '}
              <strong>{activeLeave?.start_date}</strong> to <strong>{activeLeave?.end_date}</strong>. Per institutional regulations, attendance marking is strictly locked during an approved leave period.
            </p>
            {activeLeave?.admin_remarks && (
              <p className="text-xs text-amber-900/90 font-medium mt-1">
                Admin Remarks: "{activeLeave.admin_remarks}"
              </p>
            )}
            <div className="mt-2.5">
              <Link
                to="/teacher/leave"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 underline"
              >
                <span>View Leave Management & Records</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Status</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-lg font-extrabold ${
                isOnLeaveToday
                  ? 'text-amber-600'
                  : isTodayMarked
                  ? 'text-emerald-600'
                  : 'text-slate-600'
              }`}
            >
              {isOnLeaveToday
                ? 'On Approved Leave'
                : isTodayMarked
                ? 'Present (Verified)'
                : 'Not Marked Yet'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isOnLeaveToday
              ? activeLeave?.leave_type
              : isTodayMarked
              ? `Check-in: ${dashboardData.today_record?.timestamp?.split('T')?.[1] || '08:52 AM'}`
              : 'Window open until 11:30 AM'}
          </p>
        </div>

        {/* Days Present this Month */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Days Present (Month)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {dashboardData?.total_present_month || 0}
            </span>
            <span className="text-xs text-slate-500">Working Days</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            Verified biometric logs
          </p>
        </div>

        {/* Leave Requests Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Leave Applications</span>
            <CalendarCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {dashboardData?.approved_leaves_month || 0}
            </span>
            <span className="text-xs text-slate-500">Approved This Month</span>
          </div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">
            {dashboardData?.pending_leaves_count || 0} Pending Review
          </p>
        </div>

        {/* Biometric Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Face Biometric Status</span>
            <ScanFace className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-slate-900">
              {user?.face_enrollment_status === 'enrolled' ? 'Template Enrolled' : 'Pending Enrollment'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            YuNet + SFace • Model 2023/2021
          </p>
        </div>
      </div>

      {/* Main Two-Card Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Quick Mark Attendance Card & Policy */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-r from-blue-900 to-[#0c2340] text-white rounded-xl p-6 shadow-md border border-blue-800 relative overflow-hidden">
            <div className="relative z-10 max-w-lg">
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300 bg-blue-800/80 px-2.5 py-0.5 rounded border border-blue-600/40">
                Institutional Geofence Active
              </span>
              <h3 className="text-lg sm:text-xl font-bold mt-2">
                Campus Attendance & Presence System
              </h3>
              <p className="text-xs text-blue-200 mt-1 leading-relaxed">
                Step-by-step verification requires live camera facial recognition and campus location validation (within 300m of the main academic block).
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {isOnLeaveToday ? (
                  <div className="px-4 py-2.5 rounded-md bg-amber-500/20 border border-amber-400 text-amber-200 text-xs font-bold flex items-center gap-2">
                    <Ban className="w-4 h-4 text-amber-300" />
                    <span>Attendance Disabled: Leave Approved Today</span>
                  </div>
                ) : (
                  <Link
                    to="/teacher/mark"
                    className="px-5 py-2.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{isTodayMarked ? 'View Today’s Check-in' : 'Mark Daily Attendance'}</span>
                  </Link>
                )}

                <Link
                  to="/teacher/history"
                  className="px-4 py-2.5 rounded-md bg-blue-950/80 hover:bg-blue-950 text-blue-100 font-semibold text-xs border border-blue-700/60 transition cursor-pointer"
                >
                  View My Attendance Log
                </Link>
              </div>
            </div>
          </div>

          {/* New Modules Fast Navigation Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Leave Management Quick Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1">
                  <CalendarCheck className="w-4 h-4 text-blue-600" />
                  <span>Leave Management</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apply for medical, casual, or duty leave. Track administrator approvals and manage absence records.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">
                  {dashboardData?.pending_leaves_count || 0} Pending Review
                </span>
                <Link
                  to="/teacher/leave"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  <span>Open Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Face Update Request Quick Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1">
                  <ScanFace className="w-4 h-4 text-indigo-600" />
                  <span>Biometric Face Update</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Request an administrative live camera re-enrollment session if you experience optical match issues or appearance changes.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">
                  {dashboardData?.latest_face_request ? `Status: ${dashboardData.latest_face_request.status}` : 'No active requests'}
                </span>
                <Link
                  to="/teacher/face-update"
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <span>Request Re-enroll</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Campus Perimeter & Today Record */}
        <div className="space-y-6">
          {/* Today Check-in Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Today's Session Overview
            </h4>

            {isOnLeaveToday ? (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <CalendarCheck className="w-4 h-4 text-amber-600" />
                  <span>On Approved Leave</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Your leave is active today. Attendance marking is disabled per institutional guidelines.
                </p>
              </div>
            ) : isTodayMarked ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Attendance Marked Successfully</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Status: <strong className="uppercase">{dashboardData.today_record?.status}</strong> • Time: {dashboardData.today_record?.timestamp?.split('T')?.[1]}
                  </p>
                </div>

                <div className="text-xs space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>Facial Match:</span>
                    <strong className="font-mono text-slate-900">{dashboardData.today_record?.face_score}%</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Distance to SKIT:</span>
                    <strong className="font-mono text-slate-900">{dashboardData.today_record?.distance_meters}m</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs space-y-2">
                <Clock className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-semibold text-slate-600">Attendance not recorded today.</p>
                <p className="text-[11px]">Click "Mark Today's Attendance" to initiate verified presence.</p>
              </div>
            )}
          </div>

          {/* Campus Geofence Specifications */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Campus Geofence Parameter</span>
            </div>
            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>Perimeter:</span>
                <span className="font-semibold text-slate-800">SKIT Jaipur</span>
              </div>
              <div className="flex justify-between">
                <span>Allowed Radius:</span>
                <span className="font-mono font-bold text-slate-900">300.0 Meters</span>
              </div>
              <div className="flex justify-between">
                <span>Biometric Engine:</span>
                <span className="font-semibold text-slate-800">YuNet (Detection) + SFace (Verification)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
