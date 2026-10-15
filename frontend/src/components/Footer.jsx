import React from 'react';
import { ShieldCheck, Building2, MapPin, Award } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function Footer() {
  return (
    <footer className="w-full bg-[#0c2340] border-t border-blue-900/80 text-slate-300 text-xs py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Left: Project identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-blue-800 flex items-center justify-center p-1 border border-blue-600/40 overflow-hidden">
            <img src={logoImg} alt="VERICAMP Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="font-bold text-sm text-white tracking-wide">VERICAMP PORTAL</div>
            <p className="text-[11px] text-slate-400">Smart Campus Facial Recognition & Teacher Attendance System</p>
          </div>
        </div>

        {/* Center: Problem Statement and Institution */}
        <div className="text-center md:text-left flex flex-col gap-1 text-[11px] text-slate-400">
          <div className="flex items-center justify-center md:justify-start gap-1.5 text-slate-200 font-medium">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>IEEE-IGNITE Hackathon Problem Statement SKIT023</span>
          </div>
          <p>Designed for Authorized Faculty & Institutional Academic Administration.</p>
        </div>

        {/* Right: Security & Compliance */}
        <div className="text-center md:text-right text-[11px] text-slate-400">
          <p>© {new Date().getFullYear()} VERICAMP Systems. All rights reserved.</p>
          <p className="text-slate-500 mt-0.5">Biometric data is securely processed per ISO/IEC 19794 compliance standards.</p>
        </div>
      </div>
    </footer>
  );
}
