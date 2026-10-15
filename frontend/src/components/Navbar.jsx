import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, LogOut, User, Bell, Clock, Building2, Wifi, HelpCircle, PhoneCall, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import logoImg from '../assets/logo.png';

export default function Navbar() {
  const { user, logout, isBackendOnline } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <header className="w-full bg-gradient-to-r from-[#0F2027] via-[#203A43] to-[#2C5364] text-white shadow-md select-none">
      {/* Top Utility Bar (eShikshakosh portal inspired) */}
      <div className="border-b border-blue-900/60 bg-[#071629] px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center space-x-3 text-slate-300">
            <span className="inline-flex items-center gap-1 font-medium text-amber-400">
              <Building2 className="w-3.5 h-3.5" />
              IEEE-IGNITE HACKATHON SKIT023
            </span>
            <span className="hidden sm:inline text-slate-500">|</span>
            <span className="hidden sm:inline">Institutional Portal for Verified Presence</span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Live Clock */}
            <div className="flex items-center gap-1.5 font-mono text-slate-200 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/40">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{formatDate(currentTime)}</span>
              <span className="text-cyan-300 font-bold">{formatTime(currentTime)}</span>
            </div>

            {/* Backend Connectivity Status */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isBackendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[11px] text-slate-300 hidden md:inline">
                {isBackendOnline ? 'Flask REST API Live' : 'Demo Local Mode'}
              </span>
            </div>

            {/* Quick Links */}
            <div className="hidden lg:flex items-center space-x-3 text-slate-300 text-xs">
              <span className="hover:text-white cursor-pointer transition">A-</span>
              <span className="hover:text-white cursor-pointer transition">A</span>
              <span className="hover:text-white cursor-pointer transition">A+</span>
              <span className="text-slate-500">|</span>
              <span className="flex items-center gap-1 hover:text-white cursor-pointer">
                <Globe className="w-3 h-3" /> English / हिन्दी
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Portal Header */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-3.5 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-800 p-0.5 shadow-md flex items-center justify-center border border-blue-400/30 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#0c2340] rounded-[6px] flex items-center justify-center p-1 overflow-hidden">
              <img
  src={logoImg}
  alt="Vericamp Logo"
  className="w-10 h-10 object-contain rounded-lg"
/>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl sm:text-2xl tracking-wider text-white">VERICAMP</span>
              <span className="text-[10px] font-semibold bg-blue-700/80 text-blue-100 uppercase px-1.5 py-0.5 rounded tracking-wide border border-blue-500/40">
                v2.4 PORTAL
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-blue-200/90 font-medium tracking-tight">
              Smart Attendance. Verified Presence.
            </p>
          </div>
        </Link>

        {/* User Status / Action Menu */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <NotificationBell />

              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-semibold text-white leading-tight">{user.full_name}</span>
                <span className="text-[10px] text-blue-300">
                  {user.role === 'admin' ? '🛡️ Portal Administrator' : `👨‍🏫 ${user.department || 'Faculty'}`}
                </span>
              </div>

              <div className="w-8 h-8 rounded-full bg-blue-800/80 border border-blue-400/40 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                {user.full_name ? user.full_name.charAt(0) : 'U'}
              </div>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="flex items-center gap-1.5 text-xs font-medium bg-red-600/80 hover:bg-red-600 text-white px-2.5 py-1.5 rounded transition shadow-sm border border-red-500/30 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <Link
                to="/login"
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-3.5 py-1.5 rounded transition shadow-sm border border-blue-400/30"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Institutional Notice Ticker (Portal Hallmark) */}
      <div className="bg-[#1b4d89] text-blue-50 text-xs px-4 py-1 flex items-center overflow-hidden border-t border-blue-800">
        <div className="max-w-7xl mx-auto w-full flex items-center gap-2">
          <span className="bg-amber-400 text-slate-900 font-bold px-1.5 py-0.5 rounded text-[10px] uppercase shrink-0">
            Notice
          </span>
          <div className="truncate text-slate-100 font-normal">
            Facial recognition and GPS geofence validation is active on campus (SKIT Jaipur, Allowed Radius: 300m). Ensure camera & location permissions are allowed on your device.
          </div>
        </div>
      </div>
    </header>
  );
}
