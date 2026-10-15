import React, { useState, useEffect } from 'react';
import {
  Camera,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  RotateCw,
  User,
  X,
  Building2,
  Check,
  Ban,
  Sparkles,
  RefreshCw,
  Eye
} from 'lucide-react';
import api from '../../services/api';
import Toast from '../../components/Toast';
import CameraCapture from '../../components/CameraCapture';

export default function AdminFaceUpdateApproval() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);

  // Review Modal State
  const [selectedReq, setSelectedReq] = useState(null);
  const [decisionAction, setDecisionAction] = useState(null); // 'approved' or 'rejected'
  const [adminRemarks, setAdminRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Live Camera Re-enrollment Modal State
  const [cameraModalReq, setCameraModalReq] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isReEnrolling, setIsReEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/face-update-requests', {
        params: {
          status: statusFilter,
          search: searchTerm
        }
      });
      if (res.data?.requests) {
        setRequests(res.data.requests);
      }
    } catch (err) {
      console.error('Failed to fetch face update requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq || !decisionAction) return;

    if (decisionAction === 'rejected' && !adminRemarks.trim()) {
      setModalError('Administrative remarks are required when rejecting a face update request.');
      return;
    }

    setIsSubmitting(true);
    setModalError('');
    try {
      const res = await api.put(`/admin/face-update-requests/${selectedReq.id}/decision`, {
        decision: decisionAction,
        admin_remarks: adminRemarks.trim()
      });

      setToast({
        type: 'success',
        title: `Request ${decisionAction.toUpperCase()}`,
        message: res.data.message || `Request marked as ${decisionAction}.`
      });

      const updatedReq = res.data.request;
      setSelectedReq(null);
      setDecisionAction(null);
      setAdminRemarks('');
      fetchRequests();

      // If approved, prompt admin to optionally start live enrollment immediately
      if (decisionAction === 'approved' && updatedReq) {
        setCameraModalReq(updatedReq);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit decision.';
      setModalError(msg);
      setToast({ type: 'error', title: 'Decision Error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLiveReEnrollSubmit = async () => {
    if (!cameraModalReq || !capturedImage) return;

    setIsReEnrolling(true);
    setEnrollError(null);
    try {
      const res = await api.post('/admin/face-re-enroll', {
        employee_id: cameraModalReq.teacher_employee_id,
        image_base64: capturedImage,
        request_id: cameraModalReq.id
      });

      if (res.data?.success) {
        setToast({
          type: 'success',
          title: 'Template Replaced Successfully',
          message: `Biometric face template for ${cameraModalReq.teacher_name} updated successfully.`
        });
        setCameraModalReq(null);
        setCapturedImage(null);
        fetchRequests();
      } else {
        setEnrollError(res.data?.message || 'Biometric enrollment failed.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Biometric validation error. Please try again.';
      setEnrollError(msg);
    } finally {
      setIsReEnrolling(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Re-enrolled
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Approved • Ready for Camera
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rejected
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
            <Ban className="w-3.5 h-3.5 text-slate-500" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Review
          </span>
        );
    }
  };

  const counts = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    completed: requests.filter((r) => r.status === 'completed').length,
    rejected: requests.filter((r) => r.status === 'rejected').length
  };

  const filteredRequests = requests.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.teacher_name?.toLowerCase().includes(term) ||
      r.teacher_employee_id?.toLowerCase().includes(term) ||
      r.teacher_department?.toLowerCase().includes(term) ||
      r.reason?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Camera className="w-7 h-7 text-indigo-600" />
            Faculty Face Update Requests
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Authorize biometric update requests and execute verified live camera re-enrollment sessions.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          Refresh List
        </button>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            statusFilter === 'all'
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-slate-500">All Requests</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{counts.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter('pending')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            statusFilter === 'pending'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Pending Review
          </div>
          <div className="text-xl font-bold text-amber-900 mt-1">{counts.pending}</div>
        </div>

        <div
          onClick={() => setStatusFilter('approved')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            statusFilter === 'approved'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-blue-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Ready for Re-enroll
          </div>
          <div className="text-xl font-bold text-blue-900 mt-1">{counts.approved}</div>
        </div>

        <div
          onClick={() => setStatusFilter('completed')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            statusFilter === 'completed'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </div>
          <div className="text-xl font-bold text-emerald-900 mt-1">{counts.completed}</div>
        </div>

        <div
          onClick={() => setStatusFilter('rejected')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            statusFilter === 'rejected'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-rose-700 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </div>
          <div className="text-xl font-bold text-rose-900 mt-1">{counts.rejected}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by faculty name, employee ID, department, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved (Pending Camera)</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RotateCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-600 font-medium">Loading face update requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No requests found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              There are no face update requests matching your current filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Reason for Update</th>
                  <th className="py-3 px-4">Requested On</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Admin Remarks</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                          {req.teacher_name?.charAt(0) || 'T'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{req.teacher_name}</div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {req.teacher_employee_id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {req.teacher_department || 'General'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-slate-800 line-clamp-2">{req.reason}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(req.status)}</td>

                    <td className="py-3.5 px-4 max-w-xs">
                      {req.admin_remarks ? (
                        <div className="text-slate-700 text-[11px] italic bg-slate-50 p-1.5 rounded border border-slate-200 line-clamp-2">
                          "{req.admin_remarks}"
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedReq(req);
                                setDecisionAction('approved');
                                setAdminRemarks('');
                                setModalError('');
                              }}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-xs font-semibold transition"
                            >
                              Review
                            </button>
                            <button
                              onClick={() => {
                                setCameraModalReq(req);
                                setCapturedImage(null);
                                setEnrollError(null);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition inline-flex items-center gap-1"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              Re-enroll
                            </button>
                          </>
                        )}

                        {req.status === 'approved' && (
                          <button
                            onClick={() => {
                              setCameraModalReq(req);
                              setCapturedImage(null);
                              setEnrollError(null);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition inline-flex items-center gap-1.5"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Start Live Camera
                          </button>
                        )}

                        {(req.status === 'completed' ||
                          req.status === 'rejected' ||
                          req.status === 'cancelled') && (
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setDecisionAction(null);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            Details
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision Review Modal */}
      {selectedReq && decisionAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Review Biometric Update Request
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedReq(null);
                  setDecisionAction(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDecisionSubmit} className="p-5 space-y-4">
              {/* Faculty Summary Card */}
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{selectedReq.teacher_name}</div>
                  <div className="text-xs font-mono text-indigo-700">
                    {selectedReq.teacher_employee_id} • {selectedReq.teacher_department}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 text-right">
                  Requested on:
                  <div className="font-medium text-slate-700">
                    {new Date(selectedReq.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teacher's Stated Reason:
                </label>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800">
                  {selectedReq.reason}
                </div>
              </div>

              {/* Action Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Administrative Decision <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDecisionAction('approved')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 transition ${
                      decisionAction === 'approved'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Check className="w-4 h-4 text-emerald-600" />
                    Approve for Camera Session
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionAction('rejected')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 transition ${
                      decisionAction === 'rejected'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <X className="w-4 h-4 text-rose-600" />
                    Reject Request
                  </button>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Administrative Remarks{' '}
                  {decisionAction === 'rejected' && (
                    <span className="text-rose-500">(Required for rejection)</span>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  placeholder={
                    decisionAction === 'rejected'
                      ? 'State the reason for rejecting this face update request...'
                      : 'Optional notes regarding scheduled camera enrollment...'
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReq(null);
                    setDecisionAction(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 ${
                    decisionAction === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmitting && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {selectedReq && !decisionAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Face Update Request Details</h3>
              <button
                onClick={() => setSelectedReq(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">Faculty Member:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedReq.teacher_name} ({selectedReq.teacher_employee_id})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Department:</span>
                <span className="text-slate-800 font-semibold">{selectedReq.teacher_department}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Reason:</span>
                <span className="text-slate-800">{selectedReq.reason}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Status:</span>
                <div className="mt-1">{getStatusBadge(selectedReq.status)}</div>
              </div>
              {selectedReq.admin_remarks && (
                <div>
                  <span className="text-slate-500 block font-medium">Admin Remarks:</span>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700 italic">
                    "{selectedReq.admin_remarks}"
                  </div>
                </div>
              )}
              {selectedReq.reviewed_at && (
                <div>
                  <span className="text-slate-500 block font-medium">Reviewed On:</span>
                  <span className="text-slate-700">
                    {new Date(selectedReq.reviewed_at).toLocaleString()}
                  </span>
                </div>
              )}
              {selectedReq.completed_at && (
                <div>
                  <span className="text-slate-500 block font-medium">Completed On:</span>
                  <span className="text-slate-700">
                    {new Date(selectedReq.completed_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedReq(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-md text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Re-enrollment Modal */}
      {cameraModalReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm">Biometric Live Camera Re-enrollment</h3>
                  <p className="text-[11px] text-slate-300">
                    Admin verification & template replacement workflow
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setCameraModalReq(null);
                  setCapturedImage(null);
                  setEnrollError(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Faculty Identifier Box */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-indigo-950 block text-sm">
                    {cameraModalReq.teacher_name}
                  </span>
                  <span className="text-indigo-700 font-mono text-[11px]">
                    ID: {cameraModalReq.teacher_employee_id} • {cameraModalReq.teacher_department}
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-md text-[11px] font-bold border border-indigo-300">
                  Request #{cameraModalReq.id}
                </span>
              </div>

              {/* Security Guideline */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Biometric Integrity Protocol
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Only the administrator can capture and replace this face template. Ensure the faculty
                  member is positioned directly facing the camera in well-lit conditions. The existing
                  template is preserved safely until this new live capture passes verification.
                </p>
              </div>

              {/* Camera Component */}
              <div>
                <CameraCapture
                  capturedImage={capturedImage}
                  onCapture={(base64) => {
                    setCapturedImage(base64);
                    setEnrollError(null);
                  }}
                  onRetake={() => {
                    setCapturedImage(null);
                    setEnrollError(null);
                  }}
                  isProcessing={isReEnrolling}
                />
              </div>

              {/* Error Message */}
              {enrollError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{enrollError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setCameraModalReq(null);
                    setCapturedImage(null);
                    setEnrollError(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!capturedImage || isReEnrolling}
                  onClick={handleLiveReEnrollSubmit}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-2"
                >
                  {isReEnrolling && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  Save & Overwrite Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
