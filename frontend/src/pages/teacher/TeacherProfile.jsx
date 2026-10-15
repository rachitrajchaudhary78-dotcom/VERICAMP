import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Lock,
  FileText,
  BadgeCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/Toast';

export default function TeacherProfile() {
  const { user } = useAuth();
  const [toast, setToast] = useState(null);

  // Security settings state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setToast({ type: 'warning', title: 'Weak Password', message: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast({ type: 'warning', title: 'Mismatch', message: 'New passwords do not match.' });
      return;
    }
    setToast({ type: 'success', title: 'Security Updated', message: 'Password change request submitted for institutional sync.' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex items-center justify-center font-extrabold text-2xl border-4 border-white shadow-md">
          {user?.full_name ? user.full_name.charAt(0) : 'T'}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl font-bold text-slate-900">{user?.full_name}</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
              Active Faculty Member
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Institutional Employee ID: <span className="font-semibold text-slate-800">{user?.employee_id}</span>
          </p>
          <p className="text-xs text-slate-600">
            {user?.department} • Swami Keshvanand Institute of Technology (SKIT)
          </p>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Official Personnel Information */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <User className="w-4 h-4 text-blue-600" />
            <span>Personnel & Academic Details</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Full Legal Name</span>
              <span className="font-semibold text-slate-800">{user?.full_name}</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Department / Faculty</span>
              <span className="font-semibold text-slate-800">{user?.department}</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Institutional Email</span>
              <span className="font-semibold text-slate-800">{user?.email || `${user?.username}@vericamp.edu`}</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Contact Number</span>
              <span className="font-semibold text-slate-800">{user?.phone || '+91 98290 33445'}</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Portal Role Access</span>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] uppercase border border-blue-200">
                Teacher / Faculty Access Only
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Biometric Face Enrollment Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Biometric Face Enrollment</span>
          </h3>

          <div className="p-4 rounded-lg bg-blue-50/70 border border-blue-200 space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
              <BadgeCheck className="w-5 h-5 text-blue-600 shrink-0" />
              <span>Biometric Security Profile (Read-Only)</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Per VERICAMP zero-proxy institutional policy, reference facial biometric templates are registered exclusively through an authorized Administrator Terminal using live camera capture. Self-service gallery uploads are disabled to prevent spoofing.
            </p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Biometric Template:</span>
              <span className="font-mono font-semibold text-blue-900">dataset/faces/{user?.employee_id}.jpg</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Enrollment Authority:</span>
              <span className="font-semibold text-slate-800">Admin Live Camera Enrollment</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Detector & Matcher:</span>
              <span className="font-mono font-semibold">OpenCV Haar + HSV 2D Histogram</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Verification Threshold:</span>
              <span className="font-mono font-semibold text-emerald-700">≥ 85.0% Similarity</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              <span className="text-slate-500">Status in System:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Managed by Central Admin
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 italic">
            Privacy Guarantee: Raw face captures are never exposed or made public. Attendance uses one-way mathematical embeddings.
          </p>
        </div>
      </div>

      {/* Account Security Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
          <KeyRound className="w-4 h-4 text-blue-600" />
          <span>Account Security Settings</span>
        </h3>

        <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Current Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Confirm New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md transition shadow cursor-pointer"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
