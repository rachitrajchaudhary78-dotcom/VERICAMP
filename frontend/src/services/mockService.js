/**
 * MOCK VERIFICATION & DATA SERVICE
 * -------------------------------------------------------------
 * Clearly isolated fallback service for local testing and demonstration.
 * In production, the Axios API calls in api.js connect directly to
 * the Flask REST API endpoints in backend/app.py.
 */

import { calculateHaversineDistance, DEFAULT_CAMPUS } from './geoUtils';

const STORAGE_KEY_TEACHERS = 'vericamp_mock_teachers';
const STORAGE_KEY_RECORDS = 'vericamp_mock_records';
const STORAGE_KEY_CAMPUS = 'vericamp_mock_campus';
const STORAGE_KEY_LOGS = 'vericamp_mock_logs';

// Initialize mock store
const defaultTeachers = [
  {
    id: 2,
    employee_id: 'EMP-1001',
    username: 'ananya.sharma',
    full_name: 'Dr. Ananya Sharma',
    role: 'teacher',
    department: 'Computer Science & Engg',
    email: 'ananya.sharma@vericamp.edu',
    phone: '+91 98290 33445',
    is_active: 1,
    face_enrollment_status: 'enrolled',
    enrolled_at: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 3,
    employee_id: 'EMP-1002',
    username: 'rajesh.verma',
    full_name: 'Prof. Rajesh Verma',
    role: 'teacher',
    department: 'Electronics & Comm. Engg',
    email: 'rajesh.verma@vericamp.edu',
    phone: '+91 98290 44556',
    is_active: 1,
    face_enrollment_status: 'enrolled',
    enrolled_at: new Date(Date.now() - 45 * 86400000).toISOString()
  },
  {
    id: 4,
    employee_id: 'EMP-1003',
    username: 'sunita.rao',
    full_name: 'Dr. Sunita Rao',
    role: 'teacher',
    department: 'Mechanical Engineering',
    email: 'sunita.rao@vericamp.edu',
    phone: '+91 98290 55667',
    is_active: 1,
    face_enrollment_status: 'enrolled',
    enrolled_at: new Date(Date.now() - 20 * 86400000).toISOString()
  },
  {
    id: 5,
    employee_id: 'EMP-1004',
    username: 'amit.patel',
    full_name: 'Er. Amit Patel',
    role: 'teacher',
    department: 'Information Technology',
    email: 'amit.patel@vericamp.edu',
    phone: '+91 98290 66778',
    is_active: 1,
    face_enrollment_status: 'pending',
    enrolled_at: null
  },
  {
    id: 6,
    employee_id: 'EMP-1005',
    username: 'priya.nair',
    full_name: 'Dr. Priya Nair',
    role: 'teacher',
    department: 'Applied Sciences & Math',
    email: 'priya.nair@vericamp.edu',
    phone: '+91 98290 77889',
    is_active: 1,
    face_enrollment_status: 'enrolled',
    enrolled_at: new Date(Date.now() - 10 * 86400000).toISOString()
  }
];

function getStored(key, defaultVal) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function setStored(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {}
}

export const MockVerificationService = {
  isMock: true,

  /**
   * Simulate facial recognition verification against registered biometric template
   * Real production counterpart: Backend OpenCV / DeepFace / FaceNet feature vector distance
   */
  async verifyFaceCapture(imageBase64, teacherId) {
    // Realistic artificial latency (800ms - 1200ms)
    await new Promise((r) => setTimeout(r, 900));

    if (!imageBase64 || imageBase64.length < 50) {
      return {
        success: false,
        face_detected: false,
        confidence: 0,
        message: 'No clear face detected in the live camera capture. Please align within the boundary.'
      };
    }

    // In mock mode, calculate realistic confidence score
    // If testing an unenrolled teacher (EMP-1004), reject
    const teachers = getStored(STORAGE_KEY_TEACHERS, defaultTeachers);
    const teacher = teachers.find(t => t.id === teacherId || t.employee_id === teacherId);

    if (teacher && teacher.face_enrollment_status === 'pending') {
      return {
        success: false,
        face_detected: true,
        confidence: 42.1,
        message: 'Biometric template not enrolled for this teacher. Please complete initial enrollment.'
      };
    }

    // Pass with 96.4% confidence score
    return {
      success: true,
      face_detected: true,
      confidence: 96.4,
      anti_spoofing: {
        liveness_score: 98.2,
        blink_detected: true,
        texture_analyzed: 'natural_skin'
      },
      message: 'Facial identity confirmed with 96.4% similarity to registered institutional template.'
    };
  },

  /**
   * Verify Geofence Location
   */
  async verifyLocation(lat, lon) {
    await new Promise((r) => setTimeout(r, 400));
    const campus = getStored(STORAGE_KEY_CAMPUS, DEFAULT_CAMPUS);
    const distance = calculateHaversineDistance(lat, lon, campus.latitude, campus.longitude);
    const isInside = distance <= campus.allowed_radius_meters;

    return {
      success: isInside,
      distance_meters: distance,
      allowed_radius_meters: campus.allowed_radius_meters,
      campus_name: campus.campus_name,
      message: isInside
        ? `Inside campus perimeter (${distance}m from central point).`
        : `Outside allowed campus geofence (${distance}m > ${campus.allowed_radius_meters}m).`
    };
  },

  /**
   * Submit Attendance in Mock store
   */
  async markAttendance(teacher, { latitude, longitude, imageBase64, distance, faceScore }) {
    await new Promise((r) => setTimeout(r, 800));
    const campus = getStored(STORAGE_KEY_CAMPUS, DEFAULT_CAMPUS);
    const records = getStored(STORAGE_KEY_RECORDS, []);
    const todayStr = new Date().toISOString().split('T')[0];

    // Duplicate check
    const alreadyMarked = records.find(
      r => r.user_id === teacher.id && r.date === todayStr && (r.status === 'present' || r.status === 'late')
    );
    if (alreadyMarked) {
      throw new Error(`Attendance has already been marked today for ${teacher.full_name}.`);
    }

    const isInside = distance <= campus.allowed_radius_meters;
    const facePass = faceScore >= 85.0;

    const now = new Date();
    const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30);
    const status = (!isInside || !facePass) ? 'rejected' : (isLate ? 'late' : 'present');

    const newRecord = {
      id: Date.now(),
      user_id: teacher.id,
      employee_id: teacher.employee_id,
      full_name: teacher.full_name,
      department: teacher.department,
      date: todayStr,
      timestamp: now.toISOString(),
      status,
      face_score: faceScore,
      distance_meters: distance,
      latitude,
      longitude,
      inside_campus: isInside ? 1 : 0,
      device_info: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Workstation',
      failure_reason: status === 'rejected' ? 'Geofence violation or face mismatch' : null,
      created_at: now.toISOString()
    };

    records.unshift(newRecord);
    setStored(STORAGE_KEY_RECORDS, records);

    return {
      success: status !== 'rejected',
      record: newRecord
    };
  },

  getMockCampus() {
    return getStored(STORAGE_KEY_CAMPUS, DEFAULT_CAMPUS);
  },

  updateMockCampus(settings) {
    setStored(STORAGE_KEY_CAMPUS, { ...DEFAULT_CAMPUS, ...settings });
    return true;
  }
};
