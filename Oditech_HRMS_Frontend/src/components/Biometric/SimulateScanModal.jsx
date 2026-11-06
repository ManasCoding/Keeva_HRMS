import React, { useState, useEffect } from 'react';
import { 
  X, Fingerprint, CheckCircle2, AlertCircle, Sparkles, 
  Clock, Server, Users, Loader2, UserCheck, ShieldCheck
} from 'lucide-react';
import biometricService from '../../services/biometricService';

const SimulateScanModal = ({ isOpen, onClose, devices, mappings, onScanRecorded }) => {
  const connectedDevices = devices.filter(d => d.status === 'Connected');

  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [scanType, setScanType] = useState('IN');
  const [verifyMode, setVerifyMode] = useState('Fingerprint');

  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (connectedDevices.length > 0) {
      setSelectedDeviceId(connectedDevices[0].id);
    } else {
      setSelectedDeviceId('');
    }

    if (mappings.length > 0) {
      setSelectedUserId(mappings[0].biometricUserId);
    } else {
      setSelectedUserId('');
    }

    setScanSuccess(null);
    setErrorMessage('');
  }, [isOpen, devices, mappings]);

  if (!isOpen) return null;

  const handleSimulatePunch = async () => {
    if (!selectedDeviceId) {
      setErrorMessage('Please select a connected biometric machine');
      return;
    }
    if (!selectedUserId) {
      setErrorMessage('Please select a mapped employee');
      return;
    }

    setErrorMessage('');
    setIsScanning(true);
    setScanSuccess(null);

    setTimeout(() => {
      try {
        const newLog = biometricService.recordLiveScan({
          deviceId: selectedDeviceId,
          biometricUserId: selectedUserId,
          scanType,
          verifyMode
        });

        setIsScanning(false);
        setScanSuccess(newLog);

        if (onScanRecorded) {
          onScanRecorded(newLog);
        }
      } catch (err) {
        setIsScanning(false);
        setErrorMessage(err.message || 'Scan registration failed');
      }
    }, 800);
  };

  const selectedDev = devices.find(d => d.id === selectedDeviceId);
  const selectedEmp = mappings.find(m => m.biometricUserId.toString() === selectedUserId.toString());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <Sparkles size={12} />
                Live Punch Simulator
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">Test Biometric Machine Punch</h2>
            <p className="text-xs text-slate-500">
              Simulate an employee placing their finger on a connected terminal.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {connectedDevices.length === 0 ? (
            <div className="p-6 text-center space-y-2 border border-dashed border-rose-200 rounded-2xl bg-rose-50/40">
              <AlertCircle size={32} className="mx-auto text-rose-500" />
              <h4 className="text-sm font-bold text-slate-800">No Biometric Machines Connected</h4>
              <p className="text-xs text-slate-500">
                All machines are currently Disconnected. Go to the Devices tab and click "Connect" on a machine first.
              </p>
            </div>
          ) : (
            <>
              {/* Select Machine */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Connected Machine <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Server size={14} className="absolute left-3.5 top-3 text-slate-400" />
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {connectedDevices.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.ip}:{d.port}) — {d.location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Select Employee */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Employee Fingerprint Profile <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Users size={14} className="absolute left-3.5 top-3 text-slate-400" />
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {mappings.map(m => (
                      <option key={m.id} value={m.biometricUserId}>
                        {m.employeeName} ({m.employeeCode}) — User ID #{m.biometricUserId}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scan Type & Verify Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Scan Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setScanType('IN')}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        scanType === 'IN'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Punch IN
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanType('OUT')}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        scanType === 'OUT'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Punch OUT
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Verify Mode
                  </label>
                  <select
                    value={verifyMode}
                    onChange={(e) => setVerifyMode(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="Fingerprint">Fingerprint Scan</option>
                    <option value="Face Recognition">Face Recognition</option>
                    <option value="RFID Card">RFID Card Tap</option>
                  </select>
                </div>
              </div>

              {/* Interactive Biometric Fingerprint Scanner Button */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={handleSimulatePunch}
                  className={`w-full py-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 group shadow-md ${
                    isScanning
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'bg-gradient-to-b from-slate-900 to-[#0f172a] hover:from-slate-800 hover:to-slate-900 border-slate-800 text-white shadow-slate-900/10'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    isScanning ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-white/10 text-white group-hover:scale-105'
                  }`}>
                    {isScanning ? (
                      <Loader2 size={28} className="animate-spin text-blue-600" />
                    ) : (
                      <Fingerprint size={32} className="text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold tracking-wide">
                      {isScanning ? 'Processing Biometric Template...' : 'Tap To Record Fingerprint Punch'}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Sends LAN socket punch event to {selectedDev?.name || 'terminal'}
                    </p>
                  </div>
                </button>
              </div>

              {/* Scan Success Box */}
              {scanSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 size={16} />
                      Punch Verified & Recorded Successfully!
                    </span>
                    <span className="bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono">
                      MATCH: 99.2%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-emerald-200/60">
                    <div>
                      <span className="text-emerald-700 font-medium">Employee: </span>
                      <strong>{scanSuccess.employeeName}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 font-medium">Punch Type: </span>
                      <strong className="text-emerald-800 uppercase">{scanSuccess.scanType}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 font-medium">Scan Time: </span>
                      <strong className="font-mono">{scanSuccess.scanTime}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 font-medium">Terminal: </span>
                      <strong>{scanSuccess.deviceName}</strong>
                    </div>
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-1 italic">
                    ✓ Log saved and synced into Attendance Logs tab.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimulateScanModal;
