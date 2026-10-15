import React from 'react';
import { Camera, ScanFace, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';

export default function VerificationSteps({ currentStep, stepStatuses }) {
  // steps:
  // 1: Camera Ready
  // 2: Face Verification
  // 3: Location Verification
  // 4: Attendance Confirmed

  const steps = [
    { id: 1, label: 'Camera Ready', icon: Camera },
    { id: 2, label: 'Face Verification', icon: ScanFace },
    { id: 3, label: 'Location Verification', icon: MapPin },
    { id: 4, label: 'Attendance Confirmed', icon: CheckCircle2 }
  ];

  return (
    <div className="w-full bg-white rounded-lg border border-slate-200 p-4 shadow-sm mb-5">
      <div className="flex items-center justify-between relative">
        {/* Background Connecting Line */}
        <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-0.5 bg-slate-200 -z-0" />

        {steps.map((step, idx) => {
          const status = stepStatuses[step.id] || (currentStep > step.id ? 'success' : currentStep === step.id ? 'current' : 'waiting');
          const Icon = step.icon;

          let badgeBg = 'bg-slate-100 text-slate-400 border-slate-300';
          let textColor = 'text-slate-500';

          if (status === 'success') {
            badgeBg = 'bg-emerald-600 text-white border-emerald-600 shadow-sm';
            textColor = 'text-emerald-700 font-semibold';
          } else if (status === 'current') {
            badgeBg = 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 shadow-sm animate-pulse';
            textColor = 'text-blue-900 font-bold';
          } else if (status === 'failed') {
            badgeBg = 'bg-red-600 text-white border-red-600 shadow-sm';
            textColor = 'text-red-700 font-semibold';
          }

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center text-center px-1">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center transition-all ${badgeBg}`}
              >
                {status === 'failed' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>
              <span className={`text-[11px] sm:text-xs mt-1.5 max-w-[75px] sm:max-w-none leading-tight ${textColor}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
