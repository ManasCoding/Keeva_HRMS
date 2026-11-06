import React, { useState } from 'react';
import { 
  X, Wifi, WifiOff, Server, Cpu, MapPin, Clock, Users, Database, 
  Activity, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, 
  Settings, Loader2
} from 'lucide-react';
import biometricService from '../../services/biometricService';

const DeviceDetailsModal = ({ isOpen, onClose, device, onEdit, onDeviceUpdated }) => {
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  if (!isOpen || !device) return null;

  const isConnected = device.status === 'Connected';

  const handleToggleConnection = async () => {
    setConnecting(true);
    setActionFeedback(null);
    try {
      const res = await biometricService.toggleDeviceConnection(device.id);
      setActionFeedback({
        type: 'success',
        message: res.message
      });
      if (onDeviceUpdated) onDeviceUpdated();
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to toggle device connection'
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleTestPing = async () => {
    setTesting(true);
    setActionFeedback(null);
    try {
      const res = await biometricService.testConnection(device);
      setActionFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
        latency: res.latency
      });
    } catch {
      setActionFeedback({
        type: 'error',
        message: 'Ping timed out. Check network cable & IP settings.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleQuickSync = async () => {
    setSyncing(true);
    setActionFeedback(null);
    try {
      const res = await biometricService.triggerSync(device.id);
      setActionFeedback({
        type: 'success',
        message: res.message
      });
      if (onDeviceUpdated) onDeviceUpdated();
    } catch {
      setActionFeedback({
        type: 'error',
        message: 'Failed to synchronize with device.'
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isConnected 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                {device.status}
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-100">
                LAN TCP/IP
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{device.name}</h2>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <MapPin size={13} className="text-slate-400" />
              {device.location}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleConnection}
              disabled={connecting}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                isConnected
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm'
              }`}
            >
              {connecting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : isConnected ? (
                <WifiOff size={13} />
              ) : (
                <Wifi size={13} />
              )}
              {connecting ? 'Updating...' : isConnected ? 'Disconnect' : 'Connect Device'}
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div className={`p-3.5 rounded-xl text-xs font-medium border flex items-center justify-between animate-in fade-in duration-200 ${
              actionFeedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center gap-2">
                {actionFeedback.type === 'success' ? (
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
                )}
                <span>{actionFeedback.message}</span>
              </div>
              {actionFeedback.latency && (
                <span className="font-mono font-bold bg-white/80 px-2 py-0.5 rounded border border-current text-[11px]">
                  {actionFeedback.latency}
                </span>
              )}
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Scans</p>
              <h4 className="text-xl font-black text-slate-800 mt-1">{(device.totalScans || 0).toLocaleString()}</h4>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Users Mapped</p>
              <h4 className="text-xl font-black text-blue-600 mt-1">{device.mappedUsers || 0}</h4>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Port</p>
              <h4 className="text-xl font-black text-slate-800 mt-1 font-mono">{device.port}</h4>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Auto Sync</p>
              <h4 className="text-base font-black text-emerald-600 mt-1.5">
                {device.autoSync ? `${device.syncInterval}m` : 'Off'}
              </h4>
            </div>
          </div>

          {/* Hardware & Network Specs */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Server size={14} className="text-blue-600" />
                Hardware & Network Specifications
              </h3>
              <span className="text-[10px] font-mono text-slate-400 font-semibold">TCP/IP Protocol</span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Brand:</span>
                <span className="font-bold text-slate-800">{device.brand}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Model:</span>
                <span className="font-bold text-slate-800">{device.model}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">IP Address:</span>
                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {device.ip}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">MAC Address:</span>
                <span className="font-mono text-slate-700">{device.macAddress || '00:1B:44:11:3A:B7'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Serial Number:</span>
                <span className="font-mono text-slate-700">{device.serialNumber || 'ZK-90821-X'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Firmware:</span>
                <span className="text-slate-700 font-semibold">{device.firmware || 'Ver 6.80 Oct 2025'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 font-medium">Last Communication:</span>
                <span className="text-slate-700 font-semibold">
                  {device.lastSync ? new Date(device.lastSync).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 font-medium">Connection Mode:</span>
                <span className="text-slate-800 font-bold">LAN Socket (Direct PUSH)</span>
              </div>
            </div>
          </div>

          {/* Device Storage Capacity */}
          <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Database size={14} className="text-indigo-600" />
              Machine Storage & Memory (Demo Profile)
            </h3>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-500 font-medium">User Capacity ({device.mappedUsers || 0} / 3,000)</span>
                  <span className="font-bold text-slate-700">
                    {Math.round(((device.mappedUsers || 0) / 3000) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full" 
                    style={{ width: `${Math.min(100, Math.max(3, ((device.mappedUsers || 0) / 3000) * 100))}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-500 font-medium">Scan Logs Capacity ({(device.totalScans || 0).toLocaleString()} / 100,000)</span>
                  <span className="font-bold text-slate-700">
                    {Math.round(((device.totalScans || 0) / 100000) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full" 
                    style={{ width: `${Math.min(100, Math.max(2, ((device.totalScans || 0) / 100000) * 100))}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Sync Settings Summary */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
            <Clock size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-slate-700 leading-relaxed">
              <span className="font-bold text-blue-950">Sync Policy:</span> {device.autoSync ? (
                <>Background daemon polls this device every <strong>{device.syncInterval} minutes</strong>. Scans are deduplicated using a 15-second window.</>
              ) : (
                <>Automatic synchronization is currently disabled for this device. Data can be pulled manually.</>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleTestPing}
              disabled={testing || syncing}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {testing ? <Loader2 size={13} className="animate-spin text-blue-600" /> : <Wifi size={13} className="text-blue-600" />}
              Test Connection
            </button>
            <button
              onClick={handleQuickSync}
              disabled={testing || syncing}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {syncing ? <Loader2 size={13} className="animate-spin text-blue-600" /> : <RefreshCw size={13} className="text-blue-600" />}
              Sync Now
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => {
                onClose();
                onEdit(device);
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
            >
              Edit Device
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold transition-all shadow-md shadow-slate-900/10"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceDetailsModal;
