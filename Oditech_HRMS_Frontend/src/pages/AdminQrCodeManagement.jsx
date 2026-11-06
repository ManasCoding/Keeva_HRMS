import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  QrCode,
  RefreshCw,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Smartphone,
  Sparkles,
  Layers,
  ArrowRight,
  Globe,
  Monitor
} from 'lucide-react';
import QRCode from 'qrcode';
import AdminLayout from '../layouts/AdminLayout';
import QrAttendanceTabs from '../components/qr/QrAttendanceTabs';
import api from '../services/api';
import toast from 'react-hot-toast';

const AdminQrCodeManagement = () => {
  // Active View Tab: 'dual' (both side-by-side) | 'smart' (new) | 'classic' (previous)
  const [activeTab, setActiveTab] = useState('dual');

  // New Smart QR State
  const [tokenData, setTokenData] = useState(null);
  const [smartQrDataUrl, setSmartQrDataUrl] = useState('');
  const [loadingSmart, setLoadingSmart] = useState(true);
  const [regeneratingSmart, setRegeneratingSmart] = useState(false);
  const [smartMode, setSmartMode] = useState('permanent'); // permanent or rotating
  const [expirySeconds, setExpirySeconds] = useState(60);
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  // Previous / Classic QR State
  const [classicUrl, setClassicUrl] = useState('');
  const [classicQrDataUrl, setClassicQrDataUrl] = useState('');
  const [loadingClassic, setLoadingClassic] = useState(true);

  // UI States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const containerRef = useRef(null);

  // Compute Full Scanning URLs
  const getFullSmartScanUrl = useCallback((token) => {
    const origin = window.location.origin;
    return `${origin}/qr-attendance?token=${encodeURIComponent(token || '')}`;
  }, []);

  const getFullClassicScanUrl = useCallback(() => {
    const origin = window.location.origin;
    return classicUrl || `${origin}/login`;
  }, [classicUrl]);

  // Generate Classic QR Code
  useEffect(() => {
    const origin = window.location.origin;
    const defaultClassic = `${origin}/login`;
    if (!classicUrl) setClassicUrl(defaultClassic);

    const generateClassicQR = async () => {
      try {
        setLoadingClassic(true);
        const urlToEncode = classicUrl || defaultClassic;
        const canvas = await QRCode.toDataURL(urlToEncode, {
          width: 600,
          margin: 2,
          color: {
            dark: '#1e293b',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'H'
        });
        setClassicQrDataUrl(canvas);
      } catch (err) {
        toast.error('Failed to generate Classic QR code');
      } finally {
        setLoadingClassic(false);
      }
    };

    generateClassicQR();
  }, [classicUrl]);

  // Fetch or Refresh Live Token for New Smart QR
  const fetchSmartToken = useCallback(async (forced = false) => {
    try {
      if (forced) setRegeneratingSmart(true);
      const url = forced
        ? '/qr-attendance/admin/regenerate-token'
        : `/qr-attendance/admin/current-token?mode=${smartMode}&expirySeconds=${expirySeconds}`;
      const method = forced ? 'post' : 'get';
      const payload = forced ? { mode: smartMode, expirySeconds } : undefined;

      const res = await api[method](url, payload);

      if (res.data.success && res.data.data) {
        const d = res.data.data;
        setTokenData(d);

        // Generate high-resolution Smart QR code
        const scanUrl = getFullSmartScanUrl(d.token);
        const urlCanvas = await QRCode.toDataURL(scanUrl, {
          width: 600,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'H'
        });
        setSmartQrDataUrl(urlCanvas);

        if (d.expiresAt) {
          const diff = Math.max(0, Math.floor((new Date(d.expiresAt).getTime() - Date.now()) / 1000));
          setSecondsRemaining(diff > 0 ? diff : expirySeconds);
        }

        if (forced) {
          toast.success(d.isPermanent ? 'New permanent Smart QR Code generated!' : 'New rotating Smart QR Code generated!');
        }
      }
    } catch (err) {
      toast.error('Failed to load Smart QR token');
    } finally {
      setLoadingSmart(false);
      setRegeneratingSmart(false);
    }
  }, [smartMode, expirySeconds, getFullSmartScanUrl]);

  // Load smart token on mount or mode change
  useEffect(() => {
    fetchSmartToken();
  }, [fetchSmartToken]);

  // Countdown timer for rotating smart QR mode
  useEffect(() => {
    if (smartMode !== 'rotating') return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          fetchSmartToken();
          return expirySeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [smartMode, expirySeconds, fetchSmartToken]);

  // Copy helper
  const handleCopy = (url, key) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopiedKey(''), 2000);
  };

  // Download helper
  const handleDownload = (dataUrl, filename) => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataUrl;
    link.click();
    toast.success('QR Code image downloaded');
  };

  // Print Dual Poster (both Smart and Classic on one official poster)
  const handlePrintDualPoster = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return toast.error('Please allow popups to print poster');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Oditech HRMS - Dual Office Attendance Poster</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; color: #0f172a; margin: 0; padding: 10px; }
            .header { margin-bottom: 20px; }
            .badge { display: inline-block; background: #0f172a; color: #ffffff; font-weight: 800; font-size: 11px; padding: 5px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
            h1 { font-size: 26px; font-weight: 900; margin: 0 0 4px 0; }
            p.sub { font-size: 13px; color: #64748b; margin: 0; font-weight: 600; }
            .dual-grid { display: flex; justify-content: center; gap: 30px; margin-top: 15px; }
            .card { flex: 1; max-width: 420px; border-radius: 20px; padding: 18px; border: 2px solid #cbd5e1; box-sizing: border-box; }
            .card-smart { border-color: #059669; background: #f0fdf4; }
            .card-classic { border-color: #3b82f6; background: #eff6ff; }
            .card-title { font-size: 17px; font-weight: 900; margin: 0 0 6px 0; }
            .card-smart .card-title { color: #065f46; }
            .card-classic .card-title { color: #1e40af; }
            .card-desc { font-size: 11px; color: #475569; margin: 0 0 14px 0; font-weight: 600; min-height: 28px; }
            .qr-wrap { display: inline-block; background: #ffffff; padding: 12px; border-radius: 16px; border: 2px solid #0f172a; }
            .qr-wrap img { width: 220px; height: 220px; display: block; }
            .steps { text-align: left; margin-top: 14px; font-size: 11px; line-height: 1.4; color: #334155; }
            .steps strong { color: #0f172a; }
            .footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="badge">Official Attendance Station</div>
            <h1>Oditech Global HRMS</h1>
            <p class="sub">Choose your preferred method to record attendance using Google Lens or phone camera</p>
          </div>

          <div class="dual-grid">
            <!-- New Smart QR -->
            <div class="card card-smart">
              <div class="card-title">⚡ Smart QR Attendance (New)</div>
              <div class="card-desc">Automatic mobile phone recognition • Zero passwords required from 2nd day • Instant check-in/out</div>
              <div class="qr-wrap">
                <img src="${smartQrDataUrl}" alt="Smart QR Code" />
              </div>
              <div class="steps">
                <strong>How it works:</strong><br/>
                1. Scan with Google Lens or Camera.<br/>
                2. First time: Log in once to bind device.<br/>
                3. From then on: Instant auto check-in & check-out!
              </div>
            </div>

            <!-- Classic QR -->
            <div class="card card-classic">
              <div class="card-title">📋 Classic Portal Check-In (Previous)</div>
              <div class="card-desc">Standard HRMS web portal login • Manual check-in with GPS geofence location tracking</div>
              <div class="qr-wrap">
                <img src="${classicQrDataUrl}" alt="Classic QR Code" />
              </div>
              <div class="steps">
                <strong>How it works:</strong><br/>
                1. Scan with Google Lens or Camera.<br/>
                2. Log in with Employee ID & Password.<br/>
                3. Click Check-In button on dashboard.
              </div>
            </div>
          </div>

          <div class="footer">
            Oditech Global HRMS • Supported on Android & iOS • Permanent Office Attendance
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  // Print Single Poster (Smart or Classic)
  const handlePrintSingle = (isSmart = true) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return toast.error('Please allow popups to print poster');

    const qrUrl = isSmart ? smartQrDataUrl : classicQrDataUrl;
    const title = isSmart ? '⚡ Smart QR Attendance (New Version)' : '📋 Classic HRMS Attendance (Previous Version)';
    const desc = isSmart
      ? 'Automatic mobile recognition with zero logins required after first registration'
      : 'Standard web portal check-in with geofence location verification';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Oditech HRMS - Attendance Poster</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; color: #0f172a; margin: 0; padding: 20px; }
            .badge { display: inline-block; background: ${isSmart ? '#ecfdf5' : '#eff6ff'}; color: ${isSmart ? '#059669' : '#1d4ed8'}; font-weight: 800; font-size: 13px; padding: 6px 14px; border-radius: 999px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid ${isSmart ? '#a7f3d0' : '#bfdbfe'}; margin-bottom: 12px; }
            h1 { font-size: 32px; font-weight: 900; margin: 0 0 6px 0; color: #0f172a; }
            p.sub { font-size: 15px; color: #64748b; margin: 0 0 28px 0; font-weight: 600; }
            .qr-box { display: inline-block; padding: 24px; border-radius: 28px; border: 4px solid #0f172a; box-shadow: 0 10px 30px rgba(0,0,0,0.08); background: #ffffff; }
            .qr-box img { width: 340px; height: 340px; display: block; }
            .instructions { margin-top: 36px; text-align: left; max-width: 480px; margin-left: auto; margin-right: auto; }
            .step { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
            .step-num { width: 28px; height: 28px; border-radius: 50%; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; shrink-0; }
            .step-text { font-size: 13px; font-weight: 600; color: #334155; line-height: 1.4; }
            .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
          </style>
        </head>
        <body>
          <div class="badge">${isSmart ? 'Smart QR Terminal' : 'Standard Web Terminal'}</div>
          <h1>${title}</h1>
          <p class="sub">${desc}</p>

          <div class="qr-box">
            <img src="${qrUrl}" alt="Oditech Office Attendance QR Code" />
          </div>

          <div class="instructions">
            <div class="step">
              <div class="step-num">1</div>
              <div class="step-text">Open <strong>Google Lens</strong> or your phone's default Camera app.</div>
            </div>
            <div class="step">
              <div class="step-num">2</div>
              <div class="step-text">Point camera at the QR code and tap the link that appears on screen.</div>
            </div>
            <div class="step">
              <div class="step-num">3</div>
              <div class="step-text">${isSmart ? 'First time: Log in once to bind device. Next time: Instant check-in & check-out!' : 'Log in to your account and click Check-In with GPS location.'}</div>
            </div>
          </div>

          <div class="footer">
            Oditech Global HRMS • Permanent Office Attendance
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  // Toggle Fullscreen Kiosk
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <AdminLayout
      title="QR Attendance"
      subtitle="Smart QR attendance terminal, mobile device authorizations, and live activity feed"
    >
      <div className="space-y-6">
        {/* Navigation Tabs to Switch Views */}
        <QrAttendanceTabs activeTab="code" />

        {/* Top Control Bar with Tabs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
          {/* Navigation View Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('dual')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'dual'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers size={14} />
              <span>Both QR Codes (Side-by-Side)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('smart')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'smart'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              <Sparkles size={14} />
              <span>New Smart QR</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('classic')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'classic'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 hover:text-blue-900'
              }`}
            >
              <Globe size={14} />
              <span>Previous Classic QR</span>
            </button>
          </div>

          {/* Quick Action: Print Dual Poster */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintDualPoster}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Dual Poster (Both QR Codes)</span>
            </button>
          </div>
        </div>

        {/* ── TAB 1: DUAL VIEW (BOTH QR CODES SIDE-BY-SIDE) ──────────────────── */}
        {activeTab === 'dual' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 1. NEW SMART QR CARD */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/30 shadow-xs flex flex-col justify-between text-center space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black uppercase tracking-wider">
                  <Sparkles size={13} className="text-emerald-600" />
                  <span>NEW SMART QR CODE (RECOMMENDED)</span>
                </div>
                <h3 className="text-xl font-black text-slate-900">Automated Device Attendance</h3>
                <p className="text-xs font-medium text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Employees bind their mobile device once. From then on: <strong>Zero passwords</strong>, automatic check-in/out, and animated success popups!
                </p>
              </div>

              {/* QR Code Container */}
              <div className="relative inline-block mx-auto p-4 bg-white rounded-3xl shadow-lg border-2 border-emerald-500">
                {loadingSmart ? (
                  <div className="w-56 h-56 flex items-center justify-center">
                    <RefreshCw size={28} className="animate-spin text-emerald-600" />
                  </div>
                ) : smartQrDataUrl ? (
                  <div className="relative">
                    <img src={smartQrDataUrl} alt="Smart QR Code" className="w-56 h-56 object-contain rounded-xl" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-9 h-9 bg-white rounded-lg shadow-sm border border-emerald-600 p-0.5 flex items-center justify-center">
                        <img src="/logo.jpeg" alt="" className="w-full h-full object-contain rounded" />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                  <ShieldCheck size={13} />
                  <span>Permanent Office Token • Never Expires</span>
                </span>
                <p className="text-[11px] font-mono text-slate-400 truncate max-w-xs mx-auto">
                  {tokenData ? getFullSmartScanUrl(tokenData.token) : '...'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-2 flex-wrap pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleDownload(smartQrDataUrl, 'Oditech-Smart-QR')}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download PNG</span>
                </button>

                <button
                  onClick={() => handlePrintSingle(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Printer size={13} />
                  <span>Print Poster</span>
                </button>

                <button
                  onClick={() => handleCopy(tokenData ? getFullSmartScanUrl(tokenData.token) : '', 'smart')}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedKey === 'smart' ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedKey === 'smart' ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* 2. PREVIOUS CLASSIC QR CARD */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-blue-500/30 shadow-xs flex flex-col justify-between text-center space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-black uppercase tracking-wider">
                  <Globe size={13} className="text-blue-600" />
                  <span>PREVIOUS / CLASSIC VERSION</span>
                </div>
                <h3 className="text-xl font-black text-slate-900">Standard Web Portal Login</h3>
                <p className="text-xs font-medium text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Employees scan and open the standard HRMS login page. They log in with their credentials and click Check-In on their dashboard as previously done.
                </p>
              </div>

              {/* QR Code Container */}
              <div className="relative inline-block mx-auto p-4 bg-white rounded-3xl shadow-lg border-2 border-blue-600">
                {loadingClassic ? (
                  <div className="w-56 h-56 flex items-center justify-center">
                    <RefreshCw size={28} className="animate-spin text-blue-600" />
                  </div>
                ) : classicQrDataUrl ? (
                  <div className="relative">
                    <img src={classicQrDataUrl} alt="Classic QR Code" className="w-56 h-56 object-contain rounded-xl" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-9 h-9 bg-white rounded-lg shadow-sm border border-blue-600 p-0.5 flex items-center justify-center">
                        <img src="/logo.jpeg" alt="" className="w-full h-full object-contain rounded" />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                  <CheckCircle2 size={13} />
                  <span>Static Portal Link • Never Expires</span>
                </span>
                <p className="text-[11px] font-mono text-slate-400 truncate max-w-xs mx-auto">
                  {getFullClassicScanUrl()}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-2 flex-wrap pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleDownload(classicQrDataUrl, 'Oditech-Classic-QR')}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download PNG</span>
                </button>

                <button
                  onClick={() => handlePrintSingle(false)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Printer size={13} />
                  <span>Print Poster</span>
                </button>

                <button
                  onClick={() => handleCopy(getFullClassicScanUrl(), 'classic')}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedKey === 'classic' ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedKey === 'classic' ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ── TAB 2: SMART QR CODE (FOCUSED VIEW) ───────────────────────────── */}
        {activeTab === 'smart' && (
          <div
            ref={containerRef}
            className={`bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden ${
              isFullscreen ? 'fixed inset-0 z-50 flex items-center justify-center p-8 bg-[#0f172a] text-white' : 'p-8 text-center'
            }`}
          >
            <div className="max-w-md mx-auto space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black uppercase tracking-wider mb-2">
                  <Sparkles size={13} className="text-emerald-600" />
                  New Smart QR Code (Automated Device Scan)
                </div>
                <h2 className={`font-black tracking-tight ${isFullscreen ? 'text-3xl text-white' : 'text-2xl text-slate-900'}`}>
                  Instant Mobile Attendance
                </h2>
                <p className={`text-xs font-medium mt-1 ${isFullscreen ? 'text-slate-400' : 'text-slate-500'}`}>
                  Permanent signed code. Employees scan with Google Lens or Camera for instant check-in.
                </p>
              </div>

              {/* QR Box */}
              <div className="relative inline-block p-6 bg-white rounded-[2.5rem] shadow-xl border-4 border-slate-900">
                {smartQrDataUrl ? (
                  <div className="relative">
                    <img src={smartQrDataUrl} alt="Smart QR" className="w-72 h-72 object-contain rounded-xl" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-md border-2 border-slate-900 p-1 flex items-center justify-center">
                        <img src="/logo.jpeg" alt="" className="w-full h-full object-contain rounded" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-72 h-72 flex items-center justify-center">
                    <RefreshCw size={32} className="animate-spin text-primary" />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <button
                  onClick={() => handleDownload(smartQrDataUrl, 'Oditech-Smart-QR')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download PNG</span>
                </button>

                <button
                  onClick={() => handlePrintSingle(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Printer size={14} />
                  <span>Print Poster</span>
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  <span>{isFullscreen ? 'Exit Kiosk' : 'Kiosk Display'}</span>
                </button>

                <button
                  onClick={() => {
                    if (window.confirm('Regenerate Smart QR Code? Previously printed posters for this QR code will need to be replaced.')) {
                      fetchSmartToken(true);
                    }
                  }}
                  disabled={regeneratingSmart}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw size={14} className={regeneratingSmart ? 'animate-spin text-primary' : ''} />
                  <span>Regenerate Code</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: CLASSIC QR CODE (FOCUSED VIEW) ─────────────────────────── */}
        {activeTab === 'classic' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-8 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-black uppercase tracking-wider mb-2">
                  <Globe size={13} className="text-blue-600" />
                  Classic QR Code (Previous Version)
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">
                  Standard Web Portal Login
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Scanning this QR code directs employees to the login page where they log in and check in as previously done.
                </p>
              </div>

              {/* QR Box */}
              <div className="relative inline-block p-6 bg-white rounded-[2.5rem] shadow-xl border-4 border-blue-600">
                {classicQrDataUrl ? (
                  <div className="relative">
                    <img src={classicQrDataUrl} alt="Classic QR" className="w-72 h-72 object-contain rounded-xl" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-md border-2 border-blue-600 p-1 flex items-center justify-center">
                        <img src="/logo.jpeg" alt="" className="w-full h-full object-contain rounded" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-72 h-72 flex items-center justify-center">
                    <RefreshCw size={32} className="animate-spin text-blue-600" />
                  </div>
                )}
              </div>

              {/* URL Customizer for Classic */}
              <div className="max-w-sm mx-auto text-left space-y-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Encoded Target URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={classicUrl}
                    onChange={(e) => setClassicUrl(e.target.value)}
                    placeholder="https://hrms.oditechglobal.com/login"
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(classicUrl, 'classic-input')}
                    className="p-2 border border-slate-200 bg-white hover:bg-slate-100 rounded-xl text-slate-600 cursor-pointer"
                    title="Copy URL"
                  >
                    {copiedKey === 'classic-input' ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <button
                  onClick={() => handleDownload(classicQrDataUrl, 'Oditech-Classic-QR')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download PNG</span>
                </button>

                <button
                  onClick={() => handlePrintSingle(false)}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Printer size={14} />
                  <span>Print Poster</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default AdminQrCodeManagement;
