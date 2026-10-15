import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ScanFace,
  RotateCw,
  ArrowRight,
  Sparkles,
  Info,
  CalendarCheck,
  Ban
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import VerificationSteps from '../../components/VerificationSteps';
import CameraCapture from '../../components/CameraCapture';
import GeofenceRadar from '../../components/GeofenceRadar';
import Toast from '../../components/Toast';
import api from '../../services/api';
import { MockVerificationService } from '../../services/mockService';
import { calculateHaversineDistance, DEFAULT_CAMPUS } from '../../services/geoUtils';

export default function MarkAttendance() {
  const { user, isBackendOnline } = useAuth();
  const navigate = useNavigate();

  // Active Approved Leave Check
  const [activeLeave, setActiveLeave] = useState(null);
  const [checkingLeave, setCheckingLeave] = useState(true);

  // Verification Pipeline States
  const [currentStep, setCurrentStep] = useState(1);
  const [stepStatuses, setStepStatuses] = useState({
    1: 'current',
    2: 'waiting',
    3: 'waiting',
    4: 'waiting'
  });

  // Captured snapshot
  const [capturedImage, setCapturedImage] = useState(null);

  // Campus Settings & Geolocation
  const [campus, setCampus] = useState(DEFAULT_CAMPUS);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isInside, setIsInside] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [isSimulated, setIsSimulated] = useState(true);

  // Face Verification Results
  const [faceResult, setFaceResult] = useState(null);

  // Mark status
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalStatus, setFinalStatus] = useState(null); // 'success' | 'rejected'
  const [statusMessage, setStatusMessage] = useState('');
  const [toast, setToast] = useState(null);

  // Check Active Leave for Today
  useEffect(() => {
    const checkActiveLeave = async () => {
      try {
        const res = await api.get('/teacher/dashboard');
        if (res.data?.is_on_leave_today && res.data?.active_leave_today) {
          setActiveLeave(res.data.active_leave_today);
        }
      } catch (err) {
        console.error('Leave status check error:', err);
      } finally {
        setCheckingLeave(false);
      }
    };
    checkActiveLeave();
  }, []);

  // Fetch campus settings
  useEffect(() => {
    const fetchCampus = async () => {
      try {
        const res = await api.get('/admin/campus-settings');
        if (res.data?.settings) {
          setCampus(res.data.settings);
        }
      } catch {
        setCampus(DEFAULT_CAMPUS);
      }
    };
    fetchCampus();
  }, []);

  // Geolocation handling
  const resolveLocation = () => {
    setLocationError(null);
    if (isSimulated) {
      const simulatedLat = 26.8229;
      const simulatedLon = 75.8651;
      const dist = calculateHaversineDistance(simulatedLat, simulatedLon, campus.latitude, campus.longitude);
      setCurrentCoords({ latitude: simulatedLat, longitude: simulatedLon, accuracy: 5 });
      setDistance(dist);
      setIsInside(dist <= campus.allowed_radius_meters);
    } else {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by your browser.');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const dist = calculateHaversineDistance(lat, lon, campus.latitude, campus.longitude);
          setCurrentCoords({ latitude: lat, longitude: lon, accuracy: position.coords.accuracy });
          setDistance(dist);
          setIsInside(dist <= campus.allowed_radius_meters);
        },
        (err) => {
          console.error('GPS error:', err);
          setLocationError(`GPS Permission Error: ${err.message}. You can toggle simulated campus coordinates below.`);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  useEffect(() => {
    if (!activeLeave) {
      resolveLocation();
    }
  }, [isSimulated, campus, activeLeave]);

  // Handlers for Camera
  const handleCapture = (imageBase64) => {
    setCapturedImage(imageBase64);
    setStepStatuses(prev => ({ ...prev, 1: 'success', 2: 'current' }));
    setCurrentStep(2);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setFaceResult(null);
    setFinalStatus(null);
    setStatusMessage('');
    setCurrentStep(1);
    setStepStatuses({
      1: 'current',
      2: 'waiting',
      3: 'waiting',
      4: 'waiting'
    });
  };

  const handleToggleSimulated = () => {
    setIsSimulated(!isSimulated);
  };

  // Main Attendance Verification & Submission
  const handleVerifyAndSubmit = async () => {
    if (activeLeave) {
      setToast({
        type: 'warning',
        title: 'Attendance Unavailable',
        message: 'Your leave is approved for today. Attendance marking is unavailable.'
      });
      return;
    }

    if (!capturedImage) {
      setToast({ type: 'warning', title: 'Camera Required', message: 'Please capture your face photo first.' });
      return;
    }
    if (!currentCoords) {
      setToast({ type: 'warning', title: 'Location Required', message: 'Waiting for device GPS coordinates.' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Step 2: Performing facial recognition against registered biometric template...');
    setStepStatuses(prev => ({ ...prev, 2: 'current' }));

    try {
      let faceData;
      if (isBackendOnline) {
        const verifyRes = await api.post('/attendance/verify', {
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
          image_base64: capturedImage
        });
        faceData = {
          success: verifyRes.data.face_verified,
          confidence: verifyRes.data.face_score,
          message: verifyRes.data.failure_reason || 'Facial template matched successfully.'
        };
      } else {
        faceData = await MockVerificationService.verifyFaceCapture(capturedImage, user?.id);
      }

      setFaceResult(faceData);

      if (!faceData.success) {
        setStepStatuses(prev => ({ ...prev, 2: 'failed' }));
        setFinalStatus('rejected');
        setStatusMessage(faceData.message || 'Face verification failed.');
        setToast({ type: 'error', title: 'Face Mismatch', message: faceData.message });
        setIsProcessing(false);
        return;
      }

      // Step 2 Passed
      setStepStatuses(prev => ({ ...prev, 2: 'success', 3: 'current' }));
      setCurrentStep(3);
      setStatusMessage('Step 3: Validating campus geofence coordinates...');
      await new Promise(r => setTimeout(r, 600));

      const calculatedDist = calculateHaversineDistance(
        currentCoords.latitude,
        currentCoords.longitude,
        campus.latitude,
        campus.longitude
      );
      const isWithinCampus = calculatedDist <= campus.allowed_radius_meters;

      if (!isWithinCampus) {
        setStepStatuses(prev => ({ ...prev, 3: 'failed' }));
        setFinalStatus('rejected');
        const rejectMsg = `Outside approved campus geofence (${calculatedDist}m > ${campus.allowed_radius_meters}m). Attendance rejected.`;
        setStatusMessage(rejectMsg);
        setToast({ type: 'error', title: 'Geofence Violation', message: rejectMsg });
        setIsProcessing(false);
        return;
      }

      // Step 3 Passed
      setStepStatuses(prev => ({ ...prev, 3: 'success', 4: 'current' }));
      setCurrentStep(4);
      setStatusMessage('Step 4: Submitting verified attendance to institutional database...');
      await new Promise(r => setTimeout(r, 500));

      // Final Mark Attendance API Call
      if (isBackendOnline) {
        const markRes = await api.post('/attendance/mark', {
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
          image_base64: capturedImage,
          device_info: navigator.userAgent
        });
        setStepStatuses(prev => ({ ...prev, 4: 'success' }));
        setFinalStatus('success');
        setStatusMessage(markRes.data.message || 'Attendance verified & recorded successfully!');
        setToast({ type: 'success', title: 'Verified Presence', message: markRes.data.message });
      } else {
        const markRes = await MockVerificationService.markAttendance(user, {
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
          imageBase64: capturedImage,
          distance: calculatedDist,
          faceScore: faceData.confidence
        });
        setStepStatuses(prev => ({ ...prev, 4: 'success' }));
        setFinalStatus('success');
        setStatusMessage('Attendance verified & recorded successfully (Mock Store)!');
        setToast({ type: 'success', title: 'Verified Presence', message: 'Attendance recorded successfully!' });
      }
    } catch (err) {
      console.error('Attendance mark error:', err);
      const isLeaveBlocked = err.response?.data?.leave_blocked;
      const errMsg = err.response?.data?.message || err.message || 'Failed to submit attendance.';
      setFinalStatus('rejected');
      setStatusMessage(errMsg);
      setToast({
        type: 'error',
        title: isLeaveBlocked ? 'Leave Active' : 'Verification Failed',
        message: errMsg
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // If approved leave covers today, block attendance marking completely
  if (activeLeave) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pt-6">
        <div className="bg-white rounded-2xl border-2 border-amber-300 p-8 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center border border-amber-200">
            <CalendarCheck className="w-8 h-8 text-amber-600" />
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
              Institutional Leave Active
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-3">
              Attendance Marking Unavailable
            </h1>
            <p className="text-sm font-semibold text-amber-900 mt-2">
              Your leave is approved for today. Attendance marking is unavailable.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-left space-y-2.5 max-w-lg mx-auto">
            <div className="flex justify-between items-center text-slate-700">
              <span className="font-semibold text-slate-500">Approved Leave Type:</span>
              <strong className="text-slate-900">{activeLeave.leave_type}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span className="font-semibold text-slate-500">Approved Dates:</span>
              <span className="font-mono font-bold text-slate-900">
                {activeLeave.start_date} to {activeLeave.end_date}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <span className="font-semibold text-slate-500 block mb-1">Reason on Record:</span>
              <p className="text-slate-700 italic">"{activeLeave.reason}"</p>
            </div>
            {activeLeave.admin_remarks && (
              <div className="pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-500 block mb-1">Admin Remarks:</span>
                <p className="text-blue-900 font-medium">"{activeLeave.admin_remarks}"</p>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Under central institutional guidelines, faculty members with an approved leave request covering the current date cannot mark attendance.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/teacher/leave"
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
            >
              View Leave Management
            </Link>
            <Link
              to="/teacher"
              className="px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Mark Campus Attendance</h2>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-200">
              Biometric Presence
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete the 4-step verified attendance pipeline (Live Facial Recognition + GPS Geofence Check).
          </p>
        </div>

        <button
          onClick={handleRetake}
          disabled={isProcessing}
          className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Reset Capture</span>
        </button>
      </div>

      {/* Progress Verification Stepper */}
      <VerificationSteps currentStep={currentStep} stepStatuses={stepStatuses} />

      {/* Main Grid: Camera & Radar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Live Camera Capture */}
        <div className="space-y-4">
          <CameraCapture
            capturedImage={capturedImage}
            onCapture={handleCapture}
            onRetake={handleRetake}
            isProcessing={isProcessing}
          />
        </div>

        {/* Right Column: Radar & Location Verification Status */}
        <div className="space-y-4 flex flex-col justify-between">
          <GeofenceRadar
            campusSettings={campus}
            currentCoords={currentCoords}
            distanceMeters={distance}
            isInside={isInside}
            isSimulated={isSimulated}
            onToggleSimulated={handleToggleSimulated}
          />

          {/* Action Trigger Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex justify-between items-center">
                <span>1. Camera Snapshot:</span>
                <span className={`font-semibold ${capturedImage ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {capturedImage ? '✓ Captured' : 'Awaiting photo'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>2. Geofence Perimeter:</span>
                <span className={`font-semibold ${isInside ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isInside ? `✓ Within ${campus.allowed_radius_meters}m` : `✗ Outside boundary`}
                </span>
              </div>
            </div>

            {/* Submit Attendance Button */}
            <button
              onClick={handleVerifyAndSubmit}
              disabled={!capturedImage || isProcessing || finalStatus === 'success'}
              className={`w-full py-3 px-4 rounded-lg font-bold text-sm text-white shadow-md transition flex items-center justify-center gap-2 ${
                finalStatus === 'success'
                  ? 'bg-emerald-600 cursor-default'
                  : capturedImage && !isProcessing
                  ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{statusMessage}</span>
                </>
              ) : finalStatus === 'success' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span>Attendance Verified & Recorded</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-white" />
                  <span>Verify Biometrics & Mark Attendance</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
