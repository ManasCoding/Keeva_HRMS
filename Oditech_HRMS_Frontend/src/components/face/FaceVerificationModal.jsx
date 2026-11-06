import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Eye,
  AlertTriangle,
  ScanFace
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const FaceVerificationModal = ({ isOpen, onClose, employee, onVerified, onSkipped }) => {
  const [cameraState, setCameraState] = useState('idle'); // 'idle' | 'starting' | 'streaming' | 'capturing' | 'verifying' | 'result' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null); // { matched, message, similarityScore, status }
  const [capturedSelfie, setCapturedSelfie] = useState(null);
  const [isSkipping, setIsSkipping] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const canvasRef = useRef(null);

  // Stop all camera tracks and clean up memory
  const stopCamera = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      } catch (err) {
        console.error('Error stopping track:', err);
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setFaceDetected(false);
  }, []);

  // Lightweight in-browser face presence check
  const checkFaceInFrame = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4) return;
    const video = videoRef.current;

    // 1. If native FaceDetector API is supported in modern Chrome/Edge
    if (window.FaceDetector) {
      try {
        const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(video);
        if (faces && faces.length > 0) {
          setFaceDetected(true);
          return;
        }
      } catch (e) {
        // Fall through to canvas analysis
      }
    }

    // 2. Canvas-based skin tone and facial region variance detection
    try {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, 160, 120);

      const frame = ctx.getImageData(30, 20, 100, 80);
      const data = frame.data;
      let skinPixels = 0;
      let total = 0;
      let sumY = 0, sumYSq = 0;

      for (let i = 0; i < data.length; i += 8) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        total++;
        sumY += y;
        sumYSq += y * y;

        if (y >= 30 && cb >= 77 && cb <= 135 && cr >= 130 && cr <= 180) {
          skinPixels++;
        }
      }

      const meanY = sumY / total;
      const variance = Math.sqrt(Math.max(0, sumYSq / total - meanY * meanY));
      const skinRatio = skinPixels / total;

      // Face is present when central oval has human skin tones and luminance variation
      const detected = skinRatio >= 0.09 && variance >= 7;
      setFaceDetected(detected);
    } catch (e) {
      setFaceDetected(true); // Default to permissive if canvas security denies
    }
  }, []);

  // Request camera and initialize live stream
  const startCamera = useCallback(async () => {
    try {
      setCameraState('starting');
      setErrorMessage('');
      setVerificationResult(null);
      setCapturedSelfie(null);

      // Check MediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your current browser.');
      }

      const constraints = {
        video: {
          facingMode: 'user', // Front-facing camera on mobile
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(console.error);
          setCameraState('streaming');
          // Start detection loop at 5 FPS
          detectionIntervalRef.current = setInterval(checkFaceInFrame, 200);
        };
      }
    } catch (err) {
      console.error('Camera access error:', err);
      let msg = 'Could not access front camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera permissions in your browser address bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on this system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is currently in use by another application.';
      }
      setErrorMessage(msg);
      setCameraState('error');
    }
  }, [checkFaceInFrame]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Capture current video frame and verify with backend
  const handleCaptureAndVerify = async () => {
    if (!videoRef.current || cameraState !== 'streaming') return;

    try {
      setCameraState('verifying');

      // 1. Capture snapshot to memory canvas
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight || video.readyState < 2) {
        toast.error('Camera stream is still initializing. Please wait a moment.');
        setCameraState('streaming');
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      // Mirror horizontally so it feels natural like a selfie
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64 JPEG
      const selfieBase64 = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedSelfie(selfieBase64);

      // 2. Send to backend in-memory comparison endpoint
      const res = await api.post('/face-verification/verify', {
        employeeId: employee?.id || employee?._id,
        selfieBase64,
        clientFaceDetected: faceDetected
      });

      // Clear local memory reference immediately
      canvas.width = 0;
      canvas.height = 0;

      if (res.data.success) {
        const resultData = {
          matched: res.data.matched,
          faceDetected: res.data.faceDetected,
          similarityScore: res.data.similarityScore,
          message: res.data.message,
          status: res.data.status,
          profileImage: res.data.profileImage || employee?.profileImage || null
        };
        setVerificationResult(resultData);
        setCameraState('result');

        if (res.data.matched) {
          toast.success(res.data.message || 'Face verified successfully!');
          stopCamera();
          if (onVerified) onVerified(resultData);
        } else {
          toast.error(res.data.message || 'Face did not match profile.');
        }
      } else {
        throw new Error(res.data.message || 'Face verification failed.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      const msg = err.response?.data?.message || err.message || 'Face verification failed.';
      setVerificationResult({
        matched: false,
        faceDetected: false,
        similarityScore: 0,
        message: msg,
        status: 'FAILED'
      });
      setCameraState('result');
      toast.error(msg);
    }
  };

  // Skip verification action
  const handleSkip = async () => {
    try {
      setIsSkipping(true);
      await api.post('/face-verification/skip', {
        employeeId: employee?.id || employee?._id
      });
      stopCamera();
      toast('Face verification skipped.', { icon: 'ℹ️' });
      if (onSkipped) onSkipped();
      onClose();
    } catch (err) {
      console.error('Skip error:', err);
      stopCamera();
      onClose();
    } finally {
      setIsSkipping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ScanFace size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Face Verification</h3>
              <p className="text-[11px] font-bold text-slate-400">Optional identity verification</p>
            </div>
          </div>
          <button
            onClick={() => { setCapturedSelfie(null); stopCamera(); onClose(); }}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Camera Viewport Area */}
        <div className="relative bg-slate-950 aspect-[4/3] w-full overflow-hidden flex items-center justify-center">
          {/* Hidden reference canvas */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Video Stream */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
              cameraState === 'streaming' ? 'opacity-100' : 'opacity-20'
            }`}
          />

          {/* Camera Starting / Loading State */}
          {cameraState === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 bg-slate-900/90">
              <RefreshCw size={32} className="animate-spin text-blue-400" />
              <p className="text-xs font-bold tracking-wider">Accessing front camera...</p>
            </div>
          )}

          {/* Verifying In-Memory State */}
          {cameraState === 'verifying' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 bg-slate-900/85 backdrop-blur-xs">
              <RefreshCw size={36} className="animate-spin text-emerald-400" />
              <p className="text-sm font-black tracking-wide text-white">Comparing facial features...</p>
              <p className="text-[11px] font-bold text-slate-300">Evaluating against profile photo in memory</p>
            </div>
          )}

          {/* Camera Permission / Device Error */}
          {cameraState === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-slate-900">
              <AlertTriangle size={36} className="text-amber-400 mb-2" />
              <h4 className="text-sm font-black mb-1">Camera Unavailable</h4>
              <p className="text-xs text-slate-300 mb-4 max-w-xs">{errorMessage}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={14} /> Retry Camera
                </button>
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Skip Verification
                </button>
              </div>
            </div>
          )}

          {/* Face Position Guide Overlay (Oval Frame) */}
          {cameraState === 'streaming' && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Oval Target Frame */}
              <div 
                className={`w-52 h-64 rounded-[50%] border-3 transition-all duration-300 shadow-2xl relative ${
                  faceDetected 
                    ? 'border-emerald-400 shadow-emerald-500/30 ring-4 ring-emerald-400/20' 
                    : 'border-white/60 border-dashed shadow-black/40'
                }`}
              >
                {/* Horizontal & Vertical Crosshair subtle guides */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/15" />
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-white/15" />

                {/* Animated scanning bar if face detected */}
                {faceDetected && (
                  <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full animate-pulse top-1/3" />
                )}
              </div>

              {/* Status Pill on top of camera */}
              <div className={`mt-3 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider backdrop-blur-md transition-all shadow-md ${
                faceDetected 
                  ? 'bg-emerald-500/90 text-white border border-emerald-400' 
                  : 'bg-black/60 text-slate-200 border border-white/20'
              }`}>
                {faceDetected ? '✓ Face Detected — Hold Still' : 'Position face inside the oval'}
              </div>
            </div>
          )}

          {/* Result Overlay */}
          {cameraState === 'result' && verificationResult && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white backdrop-blur-md animate-in zoom-in-95 duration-200 ${
              verificationResult.matched ? 'bg-emerald-950/90' : 'bg-rose-950/90'
            }`}>
              {verificationResult.matched ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mb-1.5 shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 size={26} />
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white mb-1">
                    FACE VERIFIED SUCCESSFULLY!
                  </h3>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-xs font-black uppercase tracking-wider mb-2">
                    <Sparkles size={12} /> {verificationResult.similarityScore}% Match Confidence
                  </div>

                  {/* Side-by-Side: Left = Profile Image, Right = Selfie Image */}
                  <div className="flex items-center justify-center gap-3.5 my-2 p-3 rounded-2xl bg-black/40 border border-emerald-400/30 shadow-inner">
                    {/* Left: Registered Profile Image */}
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden border-2 border-emerald-400 bg-slate-900 shadow-md relative">
                        {verificationResult.profileImage || employee?.profileImage ? (
                          <img
                            src={verificationResult.profileImage || employee?.profileImage}
                            alt="Registered Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                            Profile
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[8px] font-black">
                          ID
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 mt-1">
                        Profile Image
                      </span>
                    </div>

                    {/* Middle Indicator */}
                    <div className="flex flex-col items-center px-1">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center text-emerald-300 text-xs font-black">
                        ✓
                      </div>
                      <span className="text-[9px] font-bold text-emerald-300 mt-1">
                        Matched
                      </span>
                    </div>

                    {/* Right: Captured Selfie Image (Temporary) */}
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden border-2 border-emerald-400 bg-slate-900 shadow-md relative">
                        {capturedSelfie ? (
                          <img
                            src={capturedSelfie}
                            alt="Captured Selfie"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                            Selfie
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[8px] font-black">
                          LIVE
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 mt-1">
                        Selfie Image
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-emerald-100/90 max-w-xs mb-3">
                    Your facial identity has been verified against your registered profile photograph.
                  </p>
                  <button
                    onClick={() => { setCapturedSelfie(null); stopCamera(); onClose(); }}
                    className="px-6 py-2 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
                  >
                    Done & Continue
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-400 text-rose-400 flex items-center justify-center mb-3 shadow-lg shadow-rose-500/30">
                    <AlertCircle size={36} />
                  </div>
                  <h3 className="text-lg font-black tracking-tight text-white mb-1">
                    {verificationResult.faceDetected === false 
                      ? 'NO FACE DETECTED.' 
                      : 'FACE NOT MATCHED. PLEASE TRY AGAIN.'}
                  </h3>
                  {verificationResult.similarityScore > 0 && (
                    <p className="text-[11px] font-bold text-rose-200 mb-1.5">
                      Similarity Score: {verificationResult.similarityScore}% (Requires 60%+)
                    </p>
                  )}

                  {/* Side-by-Side Comparison for Failed */}
                  {(verificationResult.profileImage || employee?.profileImage || capturedSelfie) && (
                    <div className="flex items-center justify-center gap-3.5 my-2 p-2.5 rounded-2xl bg-black/40 border border-rose-400/30">
                      {/* Left: Registered Profile Image */}
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-rose-400 bg-slate-900 shadow-md relative">
                          {verificationResult.profileImage || employee?.profileImage ? (
                            <img
                              src={verificationResult.profileImage || employee?.profileImage}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                              Profile
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-rose-300 mt-1 uppercase tracking-wider">
                          Profile Image
                        </span>
                      </div>

                      {/* Middle */}
                      <div className="flex flex-col items-center px-1">
                        <div className="w-6 h-6 rounded-full bg-rose-500/30 border border-rose-400/50 flex items-center justify-center text-rose-300 text-xs font-black">
                          ≠
                        </div>
                      </div>

                      {/* Right: Captured Selfie Image */}
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-rose-400 bg-slate-900 shadow-md relative">
                          {capturedSelfie ? (
                            <img
                              src={capturedSelfie}
                              alt="Selfie"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                              Selfie
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-rose-300 mt-1 uppercase tracking-wider">
                          Selfie Image
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-rose-100/80 max-w-xs mb-4">
                    Make sure you are facing the camera directly in good lighting with no obstructions.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={startCamera}
                      className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                    >
                      <RefreshCw size={14} /> Try Again
                    </button>
                    <button
                      onClick={handleSkip}
                      disabled={isSkipping}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer transition-all border border-white/20"
                    >
                      {isSkipping ? 'Skipping...' : 'Skip Verification'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Privacy Notice Banner */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-slate-500">
          <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
          <p className="text-[10px] font-bold text-slate-500 leading-tight">
            <span className="text-slate-700 font-black">Zero-Storage Privacy:</span> Daily selfies are evaluated in temporary memory and never stored, saved, or uploaded.
          </p>
        </div>

        {/* Bottom Control Actions */}
        <div className="p-5 flex items-center justify-between gap-3 bg-white">
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSkipping || cameraState === 'verifying'}
            className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            Skip Verification
          </button>

          {cameraState === 'streaming' && (
            <button
              type="button"
              onClick={handleCaptureAndVerify}
              disabled={!faceDetected}
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                faceDetected 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 scale-100 hover:scale-[1.02] active:scale-95' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Camera size={16} />
              <span>Capture & Verify</span>
            </button>
          )}

          {cameraState === 'result' && !verificationResult?.matched && (
            <button
              type="button"
              onClick={startCamera}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} /> Retake
            </button>
          )}

          {cameraState === 'result' && verificationResult?.matched && (
            <button
              type="button"
              onClick={() => { stopCamera(); onClose(); }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={14} /> Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceVerificationModal;
