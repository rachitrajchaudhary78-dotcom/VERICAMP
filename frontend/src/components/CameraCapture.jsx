import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, AlertCircle, CheckCircle, ShieldCheck, VideoOff, Info } from 'lucide-react';

export default function CameraCapture({ onCapture, onRetake, isProcessing, capturedImage }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const sessionRef = useRef(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraErrorDetails, setCameraErrorDetails] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Helper to safely stop all media tracks across refs and video elements
  const stopAllTracks = useCallback(() => {
    sessionRef.current += 1; // Invalidate any in-flight getUserMedia calls

    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      console.log(`[VERICAMP Camera] Stopping ${tracks.length} active track(s)...`);
      tracks.forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn('[VERICAMP Camera] Error stopping stream track:', e);
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const vTracks = videoRef.current.srcObject.getTracks ? videoRef.current.srcObject.getTracks() : [];
        vTracks.forEach(track => {
          try {
            track.stop();
          } catch (e) {}
        });
      } catch (e) {}
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setIsVideoReady(false);
  }, []);

  // Main camera acquisition function
  const startCamera = useCallback(async () => {
    const currentSession = ++sessionRef.current;
    setIsInitializing(true);
    setCameraError(null);
    setCameraErrorDetails(null);
    setIsVideoReady(false);

    // Stop any existing stream first to release hardware lock
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const tracks = videoRef.current.srcObject.getTracks ? videoRef.current.srcObject.getTracks() : [];
        tracks.forEach(t => t.stop());
      } catch (e) {}
      videoRef.current.srcObject = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('[VERICAMP Camera Error] navigator.mediaDevices.getUserMedia is not supported.');
      setCameraError('Camera access is not supported by your browser or environment. Please use Chrome/Edge on HTTPS or localhost.');
      setCameraErrorDetails('The MediaDevices API requires a secure context (HTTPS or localhost).');
      setIsInitializing(false);
      return;
    }

    // Primary constraints (ideal resolution and frontal user camera)
    const primaryConstraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    };

    // Generic fallback constraints if driver rejects strict constraints
    const fallbackConstraints = {
      video: true,
      audio: false
    };

    let stream = null;
    console.log('[VERICAMP Camera] Requesting camera access with primary constraints...');

    try {
      stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
    } catch (primaryErr) {
      console.warn('[VERICAMP Camera] Primary constraint acquisition failed:', {
        name: primaryErr.name,
        message: primaryErr.message
      });

      // If overconstrained or failed, attempt basic fallback constraints
      if (
        primaryErr.name === 'OverconstrainedError' ||
        primaryErr.name === 'ConstraintNotSatisfiedError' ||
        primaryErr.name === 'TypeError'
      ) {
        try {
          console.log('[VERICAMP Camera] Retrying with generic fallback constraints...');
          stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        } catch (fallbackErr) {
          primaryErr = fallbackErr;
        }
      }

      if (!stream) {
        // Diagnostic log without any sensitive biometric data
        console.error('[VERICAMP Camera Error]', {
          name: primaryErr.name,
          message: primaryErr.message
        });

        let userMsg = 'Could not access camera.';
        let actionTip = null;

        if (primaryErr.name === 'NotReadableError' || primaryErr.name === 'TrackStartError') {
          userMsg = 'Camera hardware is currently in use or locked by another application.';
          actionTip = 'Please close any other application using your webcam (such as Zoom, Microsoft Teams, Google Meet, Skype, or Lenovo Vantage camera widget), then click Retry.';
        } else if (primaryErr.name === 'NotAllowedError' || primaryErr.name === 'PermissionDeniedError') {
          userMsg = 'Camera permission was denied in your browser.';
          actionTip = 'Click the camera/lock icon in your browser address bar (left of http://localhost:5173), change camera access to "Allow", and click Retry.';
        } else if (primaryErr.name === 'NotFoundError' || primaryErr.name === 'DevicesNotFoundError') {
          userMsg = 'No camera hardware detected on this device.';
          actionTip = 'Please ensure your webcam is connected, enabled in Device Manager, and not switched off via physical privacy shutter.';
        } else if (primaryErr.name === 'AbortError') {
          userMsg = 'Camera hardware request was interrupted.';
          actionTip = 'Please click Retry to initialize the camera stream again.';
        } else {
          userMsg = primaryErr.message || 'Unable to start camera stream.';
        }

        if (sessionRef.current === currentSession) {
          setCameraError(userMsg);
          setCameraErrorDetails(actionTip);
          setCameraActive(false);
          setIsInitializing(false);
        }
        return;
      }
    }

    // Check if component unmounted or session changed while awaiting getUserMedia
    if (sessionRef.current !== currentSession) {
      console.log('[VERICAMP Camera] Session invalidated during acquisition. Stopping stream immediately.');
      stream.getTracks().forEach(t => t.stop());
      return;
    }

    streamRef.current = stream;
    console.log('[VERICAMP Camera] Camera stream acquired successfully. Tracks:',
      stream.getVideoTracks().map(t => ({ label: t.label, enabled: t.enabled, readyState: t.readyState }))
    );

    // Attach stream directly to video element
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        if (sessionRef.current !== currentSession) return;
        if (videoRef.current) {
          const vw = videoRef.current.videoWidth;
          const vh = videoRef.current.videoHeight;
          console.log(`[VERICAMP Camera] Video metadata loaded: ${vw}x${vh}`);
          if (vw > 0 && vh > 0) {
            setIsVideoReady(true);
          }
          videoRef.current.play().catch(playErr => {
            console.warn('[VERICAMP Camera] video.play() catch:', playErr.message);
          });
        }
      };
    }

    setCameraActive(true);
    setIsInitializing(false);
  }, []);

  // Effect to manage camera lifecycle based on capturedImage
  useEffect(() => {
    if (!capturedImage) {
      startCamera();
    } else {
      stopAllTracks();
    }

    return () => {
      stopAllTracks();
    };
  }, [capturedImage, startCamera, stopAllTracks]);

  // Handle explicit Retry
  const handleRetry = () => {
    stopAllTracks();
    // Brief delay to allow OS/hardware media layer to release the handle
    setTimeout(() => {
      startCamera();
    }, 150);
  };

  // Capture frame to canvas
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (!vw || !vh) {
      console.warn('[VERICAMP Camera] Cannot capture: video dimensions are not valid yet.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');

    // Draw video frame
    ctx.drawImage(video, 0, 0, vw, vh);

    // Convert to base64 JPEG
    const base64 = canvas.toDataURL('image/jpeg', 0.88);

    // Stop active camera stream once snapshot is taken
    stopAllTracks();

    onCapture(base64);
  };

  const handleRetake = () => {
    onRetake();
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  const canCapture = cameraActive && isVideoReady && !isProcessing && !capturedImage;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Live Facial Capture</h4>
            <p className="text-[11px] text-slate-500">Live stream only (Gallery upload disabled)</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              cameraActive && isVideoReady ? 'bg-emerald-500 animate-pulse' : isInitializing ? 'bg-amber-400 animate-ping' : 'bg-slate-400'
            }`}
          />
          <span className="text-[11px] font-medium text-slate-600">
            {capturedImage
              ? 'Snapshot Ready'
              : cameraActive && isVideoReady
              ? 'Camera Live'
              : isInitializing
              ? 'Initializing...'
              : 'Camera Off'}
          </span>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="relative aspect-[4/3] max-w-md mx-auto bg-slate-900 rounded-lg overflow-hidden border-2 border-slate-700 shadow-inner flex items-center justify-center">
        {/* Video element is permanently mounted to keep videoRef valid and avoid attachment race conditions */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onCanPlay={() => {
            if (videoRef.current && videoRef.current.videoWidth > 0) {
              setIsVideoReady(true);
            }
          }}
          className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-200 ${
            cameraActive && !capturedImage ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
          }`}
        />

        {/* Live Facial Oval HUD Guide Overlay (shown when stream is active) */}
        {cameraActive && !capturedImage && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
            <div className="w-48 h-60 sm:w-56 sm:h-72 border-2 border-dashed border-cyan-400/80 rounded-[50%] flex flex-col items-center justify-between py-3 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-cyan-300 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                Align Face Here
              </span>
              <span className="text-[9px] text-cyan-200/90 bg-black/50 px-2 py-0.5 rounded backdrop-blur-xs">
                Good Lighting • Look Straight
              </span>
            </div>

            {/* Scanning Radar Line */}
            <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent pointer-events-none animate-scan" />

            {/* Corner Bracket Accents */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />
          </div>
        )}

        {/* Captured Snapshot Preview (shown after capture) */}
        {capturedImage && (
          <div className="relative w-full h-full z-20">
            <img
              src={capturedImage}
              alt="Live Face Capture"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 bg-emerald-700/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
              <CheckCircle className="w-3 h-3" /> Captured Frame
            </div>
          </div>
        )}

        {/* Loading Spinner overlay */}
        {!capturedImage && !cameraActive && isInitializing && !cameraError && (
          <div className="p-6 text-center text-slate-300 flex flex-col items-center z-10">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
            <p className="text-xs text-slate-300 font-medium">Initializing camera stream...</p>
            <p className="text-[10px] text-slate-400 mt-1">Connecting to video input device</p>
          </div>
        )}

        {/* Error State overlay */}
        {!capturedImage && cameraError && (
          <div className="p-5 text-center text-slate-300 flex flex-col items-center z-10 max-w-sm">
            <VideoOff className="w-10 h-10 text-rose-400 mb-2 shrink-0" />
            <p className="text-xs text-rose-300 font-bold mb-1.5 leading-snug">{cameraError}</p>
            {cameraErrorDetails && (
              <p className="text-[11px] text-slate-300 bg-black/60 p-2.5 rounded-lg border border-rose-500/30 mb-3.5 leading-relaxed text-left">
                {cameraErrorDetails}
              </p>
            )}
            <button
              type="button"
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition shadow-sm cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Camera Permission</span>
            </button>
          </div>
        )}
      </div>

      {/* Camera Action Buttons */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {!capturedImage ? (
          <button
            type="button"
            onClick={handleCapture}
            disabled={!canCapture}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition shadow-md ${
              canCapture
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>
              {cameraActive && !isVideoReady
                ? 'Waiting for video stream...'
                : isInitializing
                ? 'Starting camera...'
                : 'Capture Live Photo'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRetake}
            disabled={isProcessing}
            className="w-full sm:w-auto px-5 py-2 rounded-md font-semibold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retake Photo</span>
          </button>
        )}
      </div>
    </div>
  );
}
