import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CalendarCheck,
  CalendarX,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  RotateCw,
  FileText,
  User,
  X,
  Building2,
  Check,
  Ban
} from 'lucide-react';
import api from '../../services/api';
import Toast from '../../components/Toast';

export default function AdminLeaveApproval() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);

  // Review Modal State
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [decisionAction, setDecisionAction] = useState(null); // 'approved' or 'rejected'
  const [adminRemarks, setAdminRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/leaves', {
        params: {
          status: statusFilter,
          department: deptFilter,
          search: searchTerm
        }
      });
      if (res.data?.leaves) {
        setLeaves(res.data.leaves);
      }
    } catch (err) {
      console.error('Failed to fetch admin leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [statusFilter, deptFilter]);

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLeave || !decisionAction) return;

    if (decisionAction === 'rejected' && !adminRemarks.trim()) {
      setModalError('Administrative remarks are required when rejecting a leave request.');
      return;
    }

    setIsSubmitting(true);
    setModalError('');
    try {
      const res = await api.put(`/admin/leaves/${selectedLeave.id}/decision`, {
        decision: decisionAction,
        admin_remarks: adminRemarks.trim()
      });

      setToast({
        type: 'success',
        title: `Leave ${decisionAction.toUpperCase()}`,
        message: res.data.message || `Leave request has been ${decisionAction}.`
      });
      setSelectedLeave(null);
      setDecisionAction(null);
      setAdminRemarks('');
      fetchLeaves();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit decision.';
      setModalError(msg);
      setToast({ type: 'error', title: 'Decision Error', message: msg });
    } finally {
      setIsSubmitting(false);
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

  const filteredLeaves = leaves.filter((l) => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const matchName = l.teacher_name?.toLowerCase().includes(s);
      const matchId = l.employee_id?.toLowerCase().includes(s);
      const matchType = l.leave_type?.toLowerCase().includes(s);
      const matchReason = l.reason?.toLowerCase().includes(s);
      return matchName || matchId || matchType || matchReason;
    }
    return true;
  });

  const pendingTotal = leaves.filter(l => l.status === 'pending').length;
  const approvedTotal = leaves.filter(l => l.status === 'approved').length;
  const rejectedTotal = leaves.filter(l => l.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Faculty Leave Requests & Approvals</h1>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full">
              {pendingTotal} Pending Action
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review, evaluate, and approve or reject faculty leave applications with audit logging and attendance locks.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLeaves}
          className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Requests</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{leaves.length}</div>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs">
          <span className="text-xs font-semibold text-amber-700">Pending Review</span>
          <div className="text-2xl font-black text-amber-800 mt-1">{pendingTotal}</div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700">Approved Leaves</span>
          <div className="text-2xl font-black text-emerald-800 mt-1">{approvedTotal}</div>
        </div>

        <div className="bg-white rounded-xl border border-rose-200 bg-rose-50/40 p-4 shadow-xs">
          <span className="text-xs font-semibold text-rose-700">Rejected Leaves</span>
          <div className="text-2xl font-black text-rose-800 mt-1">{rejectedTotal}</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 w-full md:w-auto">
          {['all', 'pending', 'approved', 'rejected'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-md font-bold capitalize transition cursor-pointer ${
                statusFilter === tab
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'all' ? 'All Requests' : tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search faculty name, ID, reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Departments</option>
            <option value="Computer Science & Engg">Computer Science & Engg</option>
            <option value="Electronics & Comm. Engg">Electronics & Comm. Engg</option>
            <option value="Mechanical Engineering">Mechanical Engineering</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Applied Sciences & Math">Applied Sciences & Math</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c2340] text-white font-semibold">
              <tr>
                <th className="py-3 px-4">Faculty Member</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Requested Dates</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Applied On</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading leave requests...
                  </td>
                </tr>
              ) : filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <CalendarX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No leave requests found.</p>
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{l.teacher_name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{l.employee_id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{l.department}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{l.leave_type}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                      {l.start_date} <span className="text-slate-400 font-sans">to</span> {l.end_date}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {l.duration_days} {l.duration_days === 1 ? 'day' : 'days'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(l.status)}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {l.created_at ? l.created_at.split('T')[0] : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLeave(l);
                          setDecisionAction(null);
                          setAdminRemarks(l.admin_remarks || '');
                          setModalError('');
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition shadow-xs cursor-pointer ${
                          l.status === 'pending'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {l.status === 'pending' ? 'Review & Decide' : 'View Decision'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision / Review Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Review Leave Request #{selectedLeave.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              {/* Teacher Info Card */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-blue-900 text-sm">{selectedLeave.teacher_name}</div>
                  <div className="text-[11px] text-blue-700 font-mono">
                    {selectedLeave.employee_id} • {selectedLeave.department}
                  </div>
                </div>
                <span>{getStatusBadge(selectedLeave.status)}</span>
              </div>

              {/* Leave Info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block mb-0.5 font-semibold">Leave Type</span>
                  <span className="font-bold text-slate-900">{selectedLeave.leave_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-semibold">Duration</span>
                  <span className="font-bold text-slate-900">{selectedLeave.duration_days} Day(s)</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-semibold">Start Date</span>
                  <span className="font-mono text-slate-800 font-bold">{selectedLeave.start_date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-semibold">End Date</span>
                  <span className="font-mono text-slate-800 font-bold">{selectedLeave.end_date}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block font-semibold mb-1">Reason Stated by Faculty:</span>
                <p className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 leading-relaxed font-sans">
                  {selectedLeave.reason}
                </p>
              </div>

              {/* Action Form if Pending */}
              {selectedLeave.status === 'pending' ? (
                <form onSubmit={handleDecisionSubmit} className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDecisionAction('approved')}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        decisionAction === 'approved'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve Request</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecisionAction('rejected')}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        decisionAction === 'rejected'
                          ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                          : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject Request</span>
                    </button>
                  </div>

                  {decisionAction && (
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700">
                        Administrative Remarks {decisionAction === 'rejected' && <span className="text-rose-500">*</span>}
                      </label>
                      <textarea
                        rows={3}
                        required={decisionAction === 'rejected'}
                        placeholder={decisionAction === 'rejected' ? 'Provide clear justification for rejection...' : 'Optional approval notes or duty reassignment details...'}
                        value={adminRemarks}
                        onChange={(e) => setAdminRemarks(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedLeave(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
                    >
                      Close
                    </button>
                    {decisionAction && (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-5 py-2 font-bold text-white rounded-lg shadow-sm cursor-pointer ${
                          decisionAction === 'approved'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                      >
                        {isSubmitting ? 'Recording Decision...' : `Confirm ${decisionAction.toUpperCase()}`}
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-500 block font-semibold mb-1">Administrative Remarks on Record:</span>
                    <p className="p-2.5 bg-blue-50/70 rounded-lg border border-blue-200 text-blue-900 font-medium">
                      "{selectedLeave.admin_remarks || 'No remarks provided.'}"
                    </p>
                  </div>

                  <div className="text-[11px] text-slate-500 flex justify-between pt-1">
                    <span>Reviewed By: {selectedLeave.reviewer_name || 'Administrator'}</span>
                    <span>Decision Date: {selectedLeave.reviewed_at?.split('T')[0] || '—'}</span>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => setSelectedLeave(null)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
