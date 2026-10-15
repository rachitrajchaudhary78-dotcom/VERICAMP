import React from 'react';
import { HelpCircle, Camera, MapPin, ShieldCheck, Smartphone, CheckCircle2, AlertTriangle, PhoneCall } from 'lucide-react';
import { DEFAULT_CAMPUS } from '../../services/geoUtils';

export default function TeacherHelp() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold text-slate-900">Faculty Attendance Guidelines & FAQ</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Operational instructions for marking presence via VERICAMP biometric and geofenced verification.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-sm border-b border-slate-100 pb-2">
            <Camera className="w-4 h-4 text-blue-600" />
            <span>1. Camera & Facial Recognition</span>
          </div>
          <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 leading-relaxed">
            <li>Position your face squarely within the oval HUD targeting guide.</li>
            <li>Ensure adequate natural lighting and remove sunglasses or heavy facial coverings.</li>
            <li>Live camera stream is mandatory; static photos from phone gallery are strictly rejected to prevent proxy attendance.</li>
            <li>Biometric matching requires a minimum similarity threshold of 85.0%.</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-sm border-b border-slate-100 pb-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>2. Campus Geofence Perimeter</span>
          </div>
          <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 leading-relaxed">
            <li>You must be physically present inside the approved campus boundary ({DEFAULT_CAMPUS.allowed_radius_meters}m from central academic block).</li>
            <li>Enable "High Accuracy" GPS mode in your Android or iOS device settings.</li>
            <li>If you are working remotely or off-campus on official duty, obtain manual clearance from your department HOD.</li>
            <li>Attendance attempts outside the approved radius are permanently recorded in the institutional security audit log.</li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
          <PhoneCall className="w-4 h-4 text-amber-600" />
          <span>Troubleshooting & Institutional Support</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-0.5">Camera Not Opening?</span>
            <p className="text-[11px] text-slate-500">Tap the padlock/camera icon in Chrome address bar and switch permission to 'Allow'.</p>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-0.5">GPS Timeout Error?</span>
            <p className="text-[11px] text-slate-500">Toggle Airplane Mode on & off or step near a window for clear GPS satellite lock.</p>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-0.5">IT Administration Office</span>
            <p className="text-[11px] text-slate-500">Academic Block A, Ground Floor. Ext: 204. Email: helpdesk@vericamp.edu</p>
          </div>
        </div>
      </div>
    </div>
  );
}
