import React, { useState, useEffect } from 'react';
import {
  ScanFace,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  RotateCw,
  Send,
  X,
  Info,
  BadgeCheck,
  Ban
} from 'lucide-react';
import api from '../../services/api';
import Toast from '../../components/Toast';

export default function TeacherFaceUpdateRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [selectedReasonType, setSelectedReasonType] = useState('Appearance Change');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/teacher/face-update-requests');
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
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const fullReason = `${selectedReasonType}: ${reason.trim()}`;
    if (!reason.trim()) {
      setErrorMessage('Please describe the reason for your biometric update request.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/teacher/face-update-requests', {
        reason: fullReason
      });

      setToast({
        type: 'success',
        title: 'Request Submitted',
        message: res.data.message || 'Face update request submitted to Central Administration.'
      });
      setReason('');
      fetchRequests();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit face update request.';
      setErrorMessage(msg);
      setToast({ type: 'error', title: 'Submission Error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (reqId) => {
    if (!window.confirm('Are you sure you want to cancel this pending face update request?')) {
      return;
    }

    try {
      await api.put(`/teacher/face-update-requests/${reqId}/cancel`);
      setToast({
        type: 'info',
        title: 'Request Cancelled',
        message: 'Your biometric update request has been cancelled.'
      });
      fetchRequests();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to cancel request.';
      setToast({ type: 'error', title: 'Error', message: msg });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
            Template Re-enrolled
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            Approved for Enrollment
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
            Pending Admin Review
          </span>
        );
    }
  };

  const hasPendingRequest = requests.some(r => r.status === 'pending' || r.status === 'approved');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Biometric Face Update Requests</h1>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">
              Centralized Re-enrollment
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Request an administrative live-camera re-enrollment session if your facial appearance has changed.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRequests}
          className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Institutional Security Notice */}
      <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-blue-900">Strict Biometric Security Protocol</p>
          <p className="text-slate-600 leading-relaxed">
            Faculty members are strictly prevented from directly uploading external image files or modifying baseline template vectors. All face re-enrollments are supervised live by Central Administration using high-accuracy OpenCV optical verification to prevent spoofing.
          </p>
        </div>
      </div>

      {/* Main Grid: Submit Form & Requests History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs lg:col-span-1 h-fit">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 text-slate-900 font-bold text-sm">
            <ScanFace className="w-4 h-4 text-blue-600" />
            <span>Submit Update Request</span>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {hasPendingRequest ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Active Request Under Review</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                You already have an active face update request. Central Administration will review your request and conduct an authorized live camera enrollment.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Primary Reason Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedReasonType}
                  onChange={(e) => setSelectedReasonType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="Appearance Change">Appearance Change (Hair / Facial / Glasses)</option>
                  <option value="Verification Match Issues">Frequent Low Match Scores (&lt; 85%)</option>
                  <option value="Lighting / Optical Artifacts">Poor Lighting During Initial Registration</option>
                  <option value="Medical / Eye Procedure">Medical / Eye Treatment</option>
                  <option value="Other">Other Institutional Reason</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Explanation & Details <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Specify why a baseline face re-enrollment is necessary..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500">
                <span>Existing facial template remains active until an administrator performs live re-enrollment.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span>Submitting Request...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit for Administrative Review</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* History Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden lg:col-span-2">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Request History & Admin Decisions</h2>
            <span className="text-xs text-slate-500">Total: {requests.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c2340] text-white font-semibold">
                <tr>
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Admin Remarks</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      <ScanFace className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">No face update requests on record.</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        If you need to update your reference biometrics, fill the form to the left.
                      </p>
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">#{r.id}</td>
                      <td className="py-3 px-4 max-w-xs text-slate-800 truncate" title={r.reason}>
                        {r.reason}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(r.status)}</td>
                      <td className="py-3 px-4 max-w-xs text-slate-500 italic truncate" title={r.admin_remarks || 'None'}>
                        {r.admin_remarks ? `"${r.admin_remarks}"` : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {r.created_at ? r.created_at.split('T')[0] : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => handleCancel(r.id)}
                            className="px-2.5 py-1 rounded text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 cursor-pointer"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Finalized</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
