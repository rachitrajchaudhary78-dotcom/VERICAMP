import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('vericamp_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('vericamp_token') || null);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check backend health
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await api.get('/health', { timeout: 2500 });
        if (res.data && res.data.status === 'healthy') {
          setIsBackendOnline(true);
        } else {
          setIsBackendOnline(false);
        }
      } catch (e) {
        setIsBackendOnline(false);
      } finally {
        setLoading(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, []);

  const login = async (employeeId, password, role) => {
    // Attempt real Flask API login first
    try {
      const response = await api.post('/auth/login', {
        employee_id: employeeId,
        password,
        role
      });
      if (response.data && response.data.token) {
        const userData = response.data.user;
        const userToken = response.data.token;
        setUser(userData);
        setToken(userToken);
        localStorage.setItem('vericamp_user', JSON.stringify(userData));
        localStorage.setItem('vericamp_token', userToken);
        setIsBackendOnline(true);
        return { success: true, user: userData, mode: 'api' };
      }
    } catch (apiError) {
      // If error is 401 or 400 or 403, it reached backend but credentials failed
      if (apiError.response && (apiError.response.status === 401 || apiError.response.status === 400 || apiError.response.status === 403)) {
        throw new Error(apiError.response.data.message || 'Invalid credentials.');
      }
      // If backend network error or offline, fallback to mock demo authentication
      console.warn('Backend unavailable, falling back to mock authentication:', apiError.message);
      setIsBackendOnline(false);

      if (role === 'admin') {
        if (employeeId === 'admin' || employeeId === 'ADM-001') {
          const mockAdmin = {
            id: 1,
            employee_id: 'ADM-001',
            username: 'admin',
            full_name: 'Prof. K. N. Sharma',
            role: 'admin',
            department: 'Institutional Administration',
            email: 'admin@vericamp.edu',
            phone: '+91 98290 11223',
            face_enrollment_status: 'none'
          };
          setUser(mockAdmin);
          setToken('mock_admin_token');
          localStorage.setItem('vericamp_user', JSON.stringify(mockAdmin));
          localStorage.setItem('vericamp_token', 'mock_admin_token');
          return { success: true, user: mockAdmin, mode: 'mock' };
        }
        throw new Error('Invalid Admin credentials in Demo Mode.');
      } else {
        // Teacher login fallback
        let matchedTeacher = null;
        const cached = localStorage.getItem('vericamp_teachers_cache');
        if (cached) {
          try {
            const list = JSON.parse(cached);
            if (Array.isArray(list)) {
              matchedTeacher = list.find(t => (t.employee_id || '').toUpperCase() === employeeId.toUpperCase());
            }
          } catch (e) {}
        }
        if (!matchedTeacher) {
          const defaultTeachers = [
            { id: 2, employee_id: 'EMP-1001', full_name: 'Dr. Ananya Sharma', role: 'teacher', department: 'Computer Science & Engg', email: 'ananya.sharma@vericamp.edu', face_enrollment_status: 'enrolled' },
            { id: 3, employee_id: 'EMP-1002', full_name: 'Prof. Rajesh Verma', role: 'teacher', department: 'Electronics & Comm. Engg', email: 'rajesh.verma@vericamp.edu', face_enrollment_status: 'enrolled' },
            { id: 4, employee_id: 'EMP-1003', full_name: 'Dr. Sunita Rao', role: 'teacher', department: 'Mechanical Engineering', email: 'sunita.rao@vericamp.edu', face_enrollment_status: 'enrolled' },
            { id: 5, employee_id: 'EMP-1004', full_name: 'Er. Amit Patel', role: 'teacher', department: 'Information Technology', email: 'amit.patel@vericamp.edu', face_enrollment_status: 'pending' },
            { id: 6, employee_id: 'EMP-1005', full_name: 'Dr. Priya Nair', role: 'teacher', department: 'Applied Sciences & Math', email: 'priya.nair@vericamp.edu', face_enrollment_status: 'enrolled' }
          ];
          matchedTeacher = defaultTeachers.find(t => (t.employee_id || '').toUpperCase() === employeeId.toUpperCase());
        }

        const fallbackName = matchedTeacher?.full_name || `Faculty ${employeeId.toUpperCase()}`;
        const fallbackDept = matchedTeacher?.department || 'Computer Science & Engg';
        const fallbackEmail = matchedTeacher?.email || `${employeeId.toLowerCase()}@vericamp.edu`;

        const mockTeacher = {
          id: matchedTeacher?.id || 101,
          employee_id: employeeId.toUpperCase(),
          username: employeeId.toLowerCase(),
          full_name: fallbackName,
          role: 'teacher',
          department: fallbackDept,
          email: fallbackEmail,
          phone: matchedTeacher?.phone || '+91 98290 12345',
          face_enrollment_status: matchedTeacher?.face_enrollment_status || 'enrolled'
        };
        setUser(mockTeacher);
        setToken(`mock_token_${employeeId.toUpperCase()}`);
        localStorage.setItem('vericamp_user', JSON.stringify(mockTeacher));
        localStorage.setItem('vericamp_token', `mock_token_${employeeId.toUpperCase()}`);
        return { success: true, user: mockTeacher, mode: 'mock' };
      }
    }
  };

  const logout = async () => {
    try {
      if (isBackendOnline) {
        await api.post('/auth/logout');
      }
    } catch {}
    setUser(null);
    setToken(null);
    localStorage.removeItem('vericamp_user');
    localStorage.removeItem('vericamp_token');
  };

  const setAuthSession = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('vericamp_user', JSON.stringify(userData));
    localStorage.setItem('vericamp_token', userToken);
    setIsBackendOnline(true);
  };

  return (
    <AuthContext.Provider value={{ user, token, role: user?.role, login, logout, setAuthSession, isBackendOnline, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
