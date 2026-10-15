import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const { type = 'info', title, message } = toast;

  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />
  };

  const borderMap = {
    success: 'border-emerald-500 bg-white text-slate-800',
    warning: 'border-amber-500 bg-white text-slate-800',
    error: 'border-rose-500 bg-white text-slate-800',
    info: 'border-blue-500 bg-white text-slate-800'
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-bounce-in shadow-xl">
      <div className={`p-4 rounded-lg border-l-4 shadow-lg flex items-start gap-3 ${borderMap[type] || borderMap.info}`}>
        {iconMap[type] || iconMap.info}
        <div className="flex-1">
          {title && <h5 className="text-xs font-bold uppercase tracking-wider mb-0.5">{title}</h5>}
          <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
