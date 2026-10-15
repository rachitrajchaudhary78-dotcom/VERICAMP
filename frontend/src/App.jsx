import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Camera,
  History,
  User,
  HelpCircle,
  LogOut,
  Users,
  FileSpreadsheet,
  Settings,
  ShieldAlert,
  Menu,
  X,
  ShieldCheck,
  Building2,
  Calendar,
  ScanFace
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Login from './pages/Login';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import MarkAttendance from './pages/teacher/MarkAttendance';
import AttendanceHistory from './pages/teacher/AttendanceHistory';
import TeacherProfile from './pages/teacher/TeacherProfile';
import TeacherHelp from './pages/teacher/TeacherHelp';
import TeacherLeaveManagement from './pages/teacher/TeacherLeaveManagement';
import TeacherFaceUpdateRequest from './pages/teacher/TeacherFaceUpdateRequest';

import AdminDashboard from './pages/admin/AdminDashboard';
import TeacherManagement from './pages/admin/TeacherManagement';
import AttendanceRecords from './pages/admin/AttendanceRecords';
import CampusSettings from './pages/admin/CampusSettings';
import AuditLogs from './pages/admin/AuditLogs';
import AdminLeaveApproval from './pages/admin/AdminLeaveApproval';
import AdminFaceUpdateApproval from './pages/admin/AdminFaceUpdateApproval';

// Role Guard Component
function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/teacher'} replace />;
  }

  return children;
}

// Teacher Portal Layout
function TeacherLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/teacher', icon: LayoutDashboard },
    { label: 'Mark Attendance', path: '/teacher/mark', icon: Camera, highlight: true },
    { label: 'Leave Management', path: '/teacher/leave', icon: Calendar },
    { label: 'Request Face Update', path: '/teacher/face-update', icon: ScanFace },
    { label: 'Attendance History', path: '/teacher/history', icon: History },
    { label: 'My Profile', path: '/teacher/profile', icon: User },
    { label: 'Help & Guidelines', path: '/teacher/help', icon: HelpCircle },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f9]">
      <Navbar />

      {/* Sub-header on mobile with quick menu toggle */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800">Faculty Portal</span>
          <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
            {user?.employee_id}
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex gap-6">
        {/* Desktop Sidebar (Teacher) */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between transform transition-transform duration-200 md:relative md:translate-x-0 md:border md:rounded-xl md:shadow-sm md:h-fit ${
            mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <div className="space-y-4">
            {/* Mobile Sidebar Close */}
            <div className="md:hidden flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-900">VERICAMP Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Snippet in Sidebar */}
            <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {user?.full_name ? user.full_name.charAt(0) : 'T'}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-blue-900 truncate">{user?.full_name}</div>
                <div className="text-[10px] font-mono text-blue-700">{user?.employee_id}</div>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition ${
                      isActive
                        ? 'bg-[#1b4d89] text-white shadow-sm'
                        : item.highlight
                        ? 'bg-blue-50 text-blue-800 hover:bg-blue-100/80'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-6">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      <Footer />
    </div>
  );
}

// Admin Portal Layout
function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Faculty Management', path: '/admin/teachers', icon: Users },
    { label: 'Leave Requests', path: '/admin/leaves', icon: Calendar },
    { label: 'Face Update Requests', path: '/admin/face-updates', icon: ScanFace },
    { label: 'Attendance Records', path: '/admin/attendance', icon: FileSpreadsheet },
    { label: 'Campus Settings', path: '/admin/campus-settings', icon: Settings },
    { label: 'Audit Trail', path: '/admin/audit-logs', icon: ShieldAlert },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f9]">
      <Navbar />

      {/* Sub-header on mobile with quick menu toggle */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800">Admin Portal</span>
          <span className="text-[10px] bg-slate-800 text-white font-semibold px-2 py-0.5 rounded">
            SUPERVISOR
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex gap-6">
        {/* Desktop Sidebar (Admin) */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between transform transition-transform duration-200 md:relative md:translate-x-0 md:border md:rounded-xl md:shadow-sm md:h-fit ${
            mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <div className="space-y-4">
            {/* Mobile Sidebar Close */}
            <div className="md:hidden flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-900">Admin Console</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Snippet in Sidebar */}
            <div className="p-3 rounded-lg bg-slate-900 text-white flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                A
              </div>
              <div className="truncate">
                <div className="text-xs font-bold truncate">{user?.full_name}</div>
                <div className="text-[10px] text-blue-300">Central Administration</div>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition ${
                      isActive
                        ? 'bg-[#0c2340] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-6">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Teacher Routes */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherLayout>
                  <TeacherDashboard />
                </TeacherLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/mark"
            element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherLayout>
                  <MarkAttendance />
                </TeacherLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/history"
            element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherLayout>
                  <AttendanceHistory />
                </TeacherLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/leave"
            element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherLayout>
                  <TeacherLeaveManagement />
                </TeacherLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/face-update"
            element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherLayout>
                  <TeacherFaceUpdateRequest />
                </TeacherLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/profile"
            element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherLayout>
                  <TeacherProfile />
                </TeacherLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/help"
            element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherLayout>
                  <TeacherHelp />
                </TeacherLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/teachers"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminLayout>
                  <TeacherManagement />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/leaves"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminLayout>
                  <AdminLeaveApproval />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/face-updates"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminLayout>
                  <AdminFaceUpdateApproval />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/attendance"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminLayout>
                  <AttendanceRecords />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/campus-settings"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminLayout>
                  <CampusSettings />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminLayout>
                  <AuditLogs />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Default Fallback Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
