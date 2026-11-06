import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  QrCode,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  LogOut,
  RefreshCw,
  Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import CheckInSuccessPopup from '../components/qr/CheckInSuccessPopup';
import CheckOutSuccessPopup from '../components/qr/CheckOutSuccessPopup';

const DEVICE_STORAGE_KEY = 'oditech_device_credential';

// Helper to detect device model, OS, and browser from client userAgent
const detectClientDevice = () => {
  const ua = navigator.userAgent || '';
  let os = 'Android';
  let deviceModel = 'Smartphone';
  let browser = 'Chrome';

  if (/iPhone|iPad|iPod/i.test(ua)) {
    os = 'iOS';
    deviceModel = /iPhone/i.test(ua) ? 'Apple iPhone' : 'Apple iPad';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
    const match = ua.match(/Android.*;\s*([^;)]+)\s*Build/i);
    deviceModel = match && match[1] ? match[1].trim() : 'Android Phone';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
    deviceModel = 'Windows PC';
  } else if (/Macintosh/i.test(ua)) {
    os = 'macOS';
    deviceModel = 'MacBook';
  }

  if (/Chrome/i.test(ua) && !/Edge|Edg|OPR/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Edge|Edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/SamsungBrowser/i.test(ua)) {
    browser = 'Samsung Browser';
  }

  return { deviceName: deviceModel, deviceModel, os, browser };
};

const QrAttendanceScan = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qrToken = searchParams.get('token');

  // Scanning State
  const [loading, setLoading] = useState(true);
  const [scanStatus, setScanStatus] = useState('CHECKING'); // CHECKING | SUCCESS_CHECKIN | SUCCESS_CHECKOUT | ALREADY_COMPLETED | FIRST_TIME_LOGIN | BLOCKED | EXPIRED | ERROR
  const [errorMessage, setErrorMessage] = useState('');
  const [scanResult, setScanResult] = useState(null);

  // First-time Login & Registration Form State
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submittingRegistration, setSubmittingRegistration] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({ deviceName: '', deviceModel: '', os: '', browser: '' });

  // Popups visibility
  const [showCheckInPopup, setShowCheckInPopup] = useState(false);
  const [showCheckOutPopup, setShowCheckOutPopup] = useState(false);

  useEffect(() => {
    setDeviceInfo(detectClientDevice());
  }, []);

  // Main Effect: Evaluate QR token and Device Credential
  useEffect(() => {
    const processScan = async () => {
      if (!qrToken) {
        setLoading(false);
        setScanStatus('NO_TOKEN');
        return;
      }

      setLoading(true);
      setErrorMessage('');

      // Check if persistent mobile credential exists
      const savedDeviceToken = localStorage.getItem(DEVICE_STORAGE_KEY);

      if (savedDeviceToken) {
        // Returning registered device: automatically process attendance without asking for login!
        try {
          const res = await api.post('/qr-attendance/scan', {
            qrToken,
            deviceToken: savedDeviceToken
          });

          if (res.data.success) {
            setScanResult(res.data);
            if (res.data.action === 'CHECK-IN') {
              setScanStatus('SUCCESS_CHECKIN');
              setShowCheckInPopup(true);
            } else if (res.data.action === 'CHECK-OUT') {
              setScanStatus('SUCCESS_CHECKOUT');
              setShowCheckOutPopup(true);
            }
          } else if (res.data.action === 'ALREADY_COMPLETED') {
            setScanResult(res.data);
            setScanStatus('ALREADY_COMPLETED');
          }
        } catch (err) {
          const errData = err.response?.data || {};
          const errCode = errData.error || '';

          if (errCode === 'DEVICE_NOT_REGISTERED') {
            // Local token no longer valid or admin reset device
            localStorage.removeItem(DEVICE_STORAGE_KEY);
            toast('Please log in once to register this mobile device.', { icon: '📱' });
            setScanStatus('FIRST_TIME_LOGIN');
          } else if (errCode === 'DEVICE_BLOCKED') {
            setScanStatus('BLOCKED');
            setErrorMessage(errData.message || 'This device has been blocked by the Administrator. Please contact HR.');
          } else if (errCode === 'QR_EXPIRED') {
            setScanStatus('EXPIRED');
            setErrorMessage(errData.message || 'QR Code has expired. Please scan the current code displayed on the screen.');
          } else {
            setScanStatus('ERROR');
            setErrorMessage(errData.message || 'Failed to record attendance. Please try again.');
          }
        } finally {
          setLoading(false);
        }
      } else {
        // No device token stored yet -> First-Time Employee Registration & Login
        setLoading(false);
        setScanStatus('FIRST_TIME_LOGIN');
      }
    };

    processScan();
  }, [qrToken]);

  // Handle First-Time Employee Registration & Check-In
  const handleRegisterAndCheckIn = async (e) => {
    e.preventDefault();
    if (!loginId.trim() || !password) {
      toast.error('Please enter your Employee ID and password');
      return;
    }

    try {
      setSubmittingRegistration(true);
      const res = await api.post('/qr-attendance/register-device', {
        loginId: loginId.trim(),
        password,
        qrToken,
        deviceInfo
      });

      if (res.data.success && res.data.deviceToken) {
        // Save persistent device token
        localStorage.setItem(DEVICE_STORAGE_KEY, res.data.deviceToken);
        toast.success(res.data.message || 'Device registered successfully!');
        setScanResult(res.data);

        if (res.data.action === 'CHECK-IN' || res.data.action === 'REGISTER_ONLY') {
          setScanStatus('SUCCESS_CHECKIN');
          setShowCheckInPopup(true);
        } else if (res.data.action === 'CHECK-OUT') {
          setScanStatus('SUCCESS_CHECKOUT');
          setShowCheckOutPopup(true);
        } else {
          setScanStatus('ALREADY_COMPLETED');
        }
      }
    } catch (err) {
      const errData = err.response?.data || {};
      if (errData.error === 'QR_EXPIRED') {
        setScanStatus('EXPIRED');
        setErrorMessage(errData.message || 'QR Code has expired. Please scan the current code on the screen.');
      } else {
        toast.error(errData.message || 'Registration failed. Check Employee ID & password.');
      }
    } finally {
      setSubmittingRegistration(false);
    }
  };

  const handleUnlinkDevice = () => {
    if (window.confirm('Are you sure you want to unlink this device? You will need to log in again on your next scan.')) {
      localStorage.removeItem(DEVICE_STORAGE_KEY);
      toast.success('Device credential cleared.');
      setScanStatus('FIRST_TIME_LOGIN');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 max-w-md mx-auto w-full flex items-center justify-between pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-white/20 p-1 flex items-center justify-center shadow-lg">
            <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div>
            <h1 className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
              Oditech Global
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                QR Smart
              </span>
            </h1>
            <p className="text-[11px] font-bold text-slate-400">Mobile Attendance Terminal</p>
          </div>
        </div>

        {localStorage.getItem(DEVICE_STORAGE_KEY) && (
          <button
            type="button"
            onClick={handleUnlinkDevice}
            className="text-[10px] font-bold text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
            title="Unlink device credential"
          >
            <LogOut size={11} />
            <span>Unlink</span>
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-md mx-auto w-full my-auto py-6">

        {/* 1. LOADING SCREEN: Identifying Device */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl space-y-6"
          >
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                <QrCode size={32} />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-black text-white">Verifying Device...</h2>
              <p className="text-xs font-medium text-slate-400 mt-1">
                Authenticating your mobile device credential & recording attendance
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-2 px-4 rounded-xl">
              <Loader2 size={14} className="animate-spin" />
              <span>Recognizing device signature...</span>
            </div>
          </motion.div>
        )}

        {/* 2. NO TOKEN SCREEN */}
        {!loading && scanStatus === 'NO_TOKEN' && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <QrCode size={32} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">No QR Token Detected</h2>
              <p className="text-xs font-medium text-slate-400 mt-2 leading-relaxed">
                Please scan the official office QR code using <strong>Google Lens</strong>, your phone's default camera, or any QR scanner.
              </p>
            </div>
            <p className="text-[11px] text-slate-500 font-bold bg-white/5 p-3 rounded-xl border border-white/5">
              The office QR code refreshes automatically for maximum attendance security.
            </p>
          </div>
        )}

        {/* 3. EXPIRED QR TOKEN */}
        {!loading && scanStatus === 'EXPIRED' && (
          <div className="bg-white/5 backdrop-blur-xl border border-rose-500/20 rounded-3xl p-8 text-center shadow-2xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">QR Code Expired</h2>
              <p className="text-xs font-medium text-slate-400 mt-2 leading-relaxed">
                {errorMessage || 'The scanned QR code has expired. Office QR codes update every 30–60 seconds to protect against proxy attendance.'}
              </p>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs font-bold text-rose-300">
              Please point your camera at the office screen to scan the fresh code.
            </div>
          </div>
        )}

        {/* 4. BLOCKED DEVICE SCREEN */}
        {!loading && scanStatus === 'BLOCKED' && (
          <div className="bg-white/5 backdrop-blur-xl border border-rose-500/20 rounded-3xl p-8 text-center shadow-2xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Lock size={32} />
            </div>
            <div>
              <h2 className="text-lg font-black text-rose-400">Device Blocked</h2>
              <p className="text-xs font-medium text-slate-300 mt-2 leading-relaxed">
                {errorMessage || 'This mobile device has been blocked by the Administrator from recording QR attendance.'}
              </p>
            </div>
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl text-[11px] text-slate-400">
              Please contact HR or your system administrator to unblock or reset this device.
            </div>
          </div>
        )}

        {/* 5. ALREADY COMPLETED ATTENDANCE SCREEN */}
        {!loading && scanStatus === 'ALREADY_COMPLETED' && scanResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-5"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                DAILY ATTENDANCE COMPLETE
              </span>
              <h2 className="text-xl font-black text-white mt-2">
                All Done For Today, {scanResult.employee?.fullName}! 🎉
              </h2>
              <p className="text-xs font-medium text-slate-400 mt-1">
                Both Check-In and Check-Out have already been recorded for today.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 text-left">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Check-In</p>
                <p className="text-sm font-black text-emerald-400 mt-0.5">{scanResult.attendance?.checkInTime || '--:--'}</p>
              </div>
              <div className="border-l border-white/10 pl-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Check-Out</p>
                <p className="text-sm font-black text-blue-400 mt-0.5">{scanResult.attendance?.checkOutTime || '--:--'}</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 italic">
              "Great work! Have a restful evening."
            </p>
          </motion.div>
        )}

        {/* 6. FIRST-TIME REGISTRATION & LOGIN FORM */}
        {!loading && scanStatus === 'FIRST_TIME_LOGIN' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-2xl border border-white/20 text-slate-800 space-y-5"
          >
            {/* Header */}
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-100 shadow-xs">
                <Smartphone size={24} />
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">First-Time Registration</h2>
              <p className="text-xs font-medium text-slate-500 max-w-xs mx-auto leading-relaxed">
                Log in once to bind this mobile device to your employee account. From tomorrow, just scan and check in instantly!
              </p>
            </div>

            {/* Detected Device Badge */}
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-left">
              <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Detected Device</p>
                <p className="text-xs font-bold text-slate-700 truncate">
                  {deviceInfo.deviceName} • {deviceInfo.os} • {deviceInfo.browser}
                </p>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleRegisterAndCheckIn} className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Employee ID or Email
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ODI-042 or name@oditechglobal.com"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingRegistration}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {submittingRegistration ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Registering & Checking In...</span>
                    </>
                  ) : (
                    <>
                      <span>Register Device & Check-In</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-center text-slate-400 font-medium pt-1">
                🔒 Device credential is authenticated and bound by Oditech HRMS backend.
              </p>
            </form>
          </motion.div>
        )}

      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-md mx-auto w-full text-center pt-4 border-t border-white/10 text-[11px] font-bold text-slate-500">
        <p>© {new Date().getFullYear()} Oditech Global. Smart QR Attendance System.</p>
      </footer>

      {/* Check-In Success Popup */}
      <CheckInSuccessPopup
        isOpen={showCheckInPopup}
        onClose={() => setShowCheckInPopup(false)}
        employee={scanResult?.employee || {}}
        attendance={scanResult?.attendance || {}}
        greeting={scanResult?.greeting || 'GOOD MORNING'}
        autoCloseSeconds={10}
      />

      {/* Check-Out Success Popup */}
      <CheckOutSuccessPopup
        isOpen={showCheckOutPopup}
        onClose={() => setShowCheckOutPopup(false)}
        employee={scanResult?.employee || {}}
        attendance={scanResult?.attendance || {}}
        greeting={scanResult?.greeting || 'GOOD EVENING'}
        autoCloseSeconds={10}
      />
    </div>
  );
};

export default QrAttendanceScan;
