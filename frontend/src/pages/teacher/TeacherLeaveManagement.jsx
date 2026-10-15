import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CalendarCheck,
  CalendarX,
  Clock,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCw,
  Info,
  ChevronRight,
  X,
  Ban
} from 'lucide-react';
import api from '../../services/api';
import Toast from '../../components/Toast';

export default function TeacherLeaveManagement() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Apply Form State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Selected leave detail modal
  const [selectedLeave, setSelectedLeave] = useState(null);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.get('/teacher/leaves');
      if (res.data?.leaves) {
        setLeaves(res.data.leaves);
      }
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    try {
      const s = new Date(start);
      const e = new Date(end);
      const diffTime = e - s;
      if (diffTime < 0) return 0;
      return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } catch {
      return 0;
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!startDate || !endDate) {
      setFormError('Please select both start date and end date.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setFormError('End date cannot be earlier than start date.');
      return;
    }

    if (!reason.trim()) {
      setFormError('Please enter a specific reason for your leave.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/teacher/leaves', {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim()
      });

      setToast({
        type: 'success',
        title: 'Application Submitted',
        message: res.data.message || 'Leave request submitted successfully for administrative approval.'
      });
      setShowApplyModal(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      fetchLeaves();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit leave application.';
      setFormError(msg);
      setToast({ type: 'error', title: 'Application Error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this pending leave request?')) {
      return;
    }

    try {
      const res = await api.put(`/teacher/leaves/${leaveId}/cancel`);
      setToast({
        type: 'info',
        title: 'Leave Cancelled',
        message: res.data.message || 'Your leave request has been cancelled.'
      });
      fetchLeaves();
      if (selectedLeave?.id === leaveId) {
        setSelectedLeave(null);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to cancel leave request.';
      setToast({ type: 'error', title: 'Cancellation Error', message: msg });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rejected
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-300">
            <Ban className="w-3 h-3 text-slate-500" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            Pending Review
          </span>
        );
    }
  };

  const pendingCount = leaves.filter(l => l.status === 'pending').length;
  const approvedCount = leaves.filter(l => l.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Faculty Leave Management</h1>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">
              {leaves.length} Applications
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Apply for institutional leave, track administrative review, and manage your absence records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLeaves}
            className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowApplyModal(true);
              setFormError('');
            }}
            id="apply-leave-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Approvals</span>
            <span className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">{pendingCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Under administrative review</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Approved Leaves</span>
            <span className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CalendarCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{approvedCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Attendance locked on approved dates</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Institutional Policy</span>
            <span className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Info className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-800 mt-2">Attendance Auto-lock</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Attendance marking is disabled on approved leave dates.
          </p>
        </div>
      </div>

      {/* Leave Applications History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Your Leave History & Status</h2>
          <span className="text-xs text-slate-500">Showing {leaves.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c2340] text-white font-semibold">
              <tr>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Duration & Dates</th>
                <th className="py-3 px-4">Days</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Admin Remarks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading leave records...
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <CalendarX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No leave applications found.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Click "Apply for Leave" above to submit a new absence request.
                    </p>
                  </td>
                </tr>
              ) : (
                leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{l.leave_type}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                      {l.start_date} <span className="text-slate-400 font-sans">to</span> {l.end_date}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {l.duration_days} {l.duration_days === 1 ? 'day' : 'days'}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(l.status)}</td>
                    <td className="py-3 px-4 text-slate-500 italic max-w-xs truncate" title={l.admin_remarks || 'None'}>
                      {l.admin_remarks ? (
                        <span className="text-slate-700 font-normal">"{l.admin_remarks}"</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedLeave(l)}
                          className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                        >
                          Details
                        </button>

                        {l.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleCancelLeave(l.id)}
                            className="px-2.5 py-1 rounded text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 cursor-pointer"
                          >
                            Cancel
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

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>Submit Leave Application</span>
              </div>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Leave Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="Casual Leave">Casual Leave (CL)</option>
                  <option value="Medical Leave">Medical Leave (ML)</option>
                  <option value="Duty Leave">Duty Leave / Academic Conference (DL)</option>
                  <option value="Maternity / Paternity Leave">Maternity / Paternity Leave</option>
                  <option value="Other">Other Institutional Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {startDate && endDate && (
                <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg text-blue-900 font-semibold flex items-center justify-between">
                  <span>Calculated Leave Duration:</span>
                  <span className="font-bold font-mono">
                    {calculateDays(startDate, endDate)} {calculateDays(startDate, endDate) === 1 ? 'Day' : 'Days'}
                  </span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reason for Absence <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide comprehensive details for institutional evaluation..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                  Institutional Attendance Policy Notice
                </span>
                <p>
                  Upon approval, attendance marking will be strictly disabled for the selected period. Unprocessed requests may be cancelled at any time before review.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Leave Application #{selectedLeave.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500 font-semibold">Status</span>
                <span>{getStatusBadge(selectedLeave.status)}</span>
              </div>

              <div>
                <span className="text-slate-500 block font-semibold mb-0.5">Leave Type</span>
                <span className="text-slate-900 font-bold">{selectedLeave.leave_type}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block font-semibold mb-0.5">Start Date</span>
                  <span className="font-mono text-slate-900 font-bold">{selectedLeave.start_date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold mb-0.5">End Date</span>
                  <span className="font-mono text-slate-900 font-bold">{selectedLeave.end_date}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block font-semibold mb-0.5">Duration</span>
                <span className="text-slate-900 font-bold">{selectedLeave.duration_days} day(s)</span>
              </div>

              <div>
                <span className="text-slate-500 block font-semibold mb-0.5">Application Reason</span>
                <p className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-800 leading-relaxed">
                  {selectedLeave.reason}
                </p>
              </div>

              {selectedLeave.admin_remarks && (
                <div>
                  <span className="text-slate-500 block font-semibold mb-0.5">Administrative Remarks</span>
                  <p className="p-2.5 bg-blue-50/70 rounded border border-blue-200 text-blue-900 leading-relaxed font-medium">
                    "{selectedLeave.admin_remarks}"
                  </p>
                </div>
              )}

              {selectedLeave.reviewer_name && (
                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between">
                  <span>Reviewed by: {selectedLeave.reviewer_name}</span>
                  <span>{selectedLeave.reviewed_at?.split('T')[0]}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
              {selectedLeave.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => handleCancelLeave(selectedLeave.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-300 rounded-lg cursor-pointer"
                >
                  Cancel Application
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
