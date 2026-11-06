import React, { useState, useEffect } from 'react';
import { 
  X, Check, AlertCircle, Wifi, Cpu, MapPin, 
  Clock, ShieldAlert, Loader2, Sparkles 
} from 'lucide-react';
import biometricService from '../../services/biometricService';

const BRANDS = ['ZKTeco', 'eSSL', 'Matrix', 'Mantra', 'Other'];

const DeviceFormModal = ({ isOpen, onClose, device, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    brand: 'ZKTeco',
    model: '',
    ip: '192.168.1.',
    port: 4370,
    connectionType: 'LAN',
    location: '',
    autoSync: true,
    syncInterval: 10
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (device) {
      setFormData({
        id: device.id,
        name: device.name || '',
        brand: device.brand || 'ZKTeco',
        model: device.model || '',
        ip: device.ip || '',
        port: device.port || 4370,
        connectionType: device.connectionType || 'LAN',
        location: device.location || '',
        autoSync: device.autoSync !== undefined ? device.autoSync : true,
        syncInterval: device.syncInterval || 10
      });
    } else {
      setFormData({
        name: '',
        brand: 'ZKTeco',
        model: 'SilkBio-101TC',
        ip: '192.168.1.205',
        port: 4370,
        connectionType: 'LAN',
        location: 'Branch Office Lobby',
        autoSync: true,
        syncInterval: 10
      });
    }
    setTestResult(null);
    setErrors({});
  }, [device, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Device name is required';
    if (!formData.model.trim()) errs.model = 'Model is required';
    if (!formData.ip.trim()) {
      errs.ip = 'IP address is required';
    } else {
      const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipPattern.test(formData.ip.trim())) {
        errs.ip = 'Enter a valid IPv4 address (e.g. 192.168.1.100)';
      }
    }
    if (!formData.port || isNaN(formData.port)) {
      errs.port = 'Valid port number is required';
    }
    if (!formData.location.trim()) errs.location = 'Location is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validate()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await biometricService.testConnection(formData);
      setTestResult(result);
    } catch {
      setTestResult({
        success: false,
        demoMode: true,
        message: 'Network test failed. Could not establish socket.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                <Sparkles size={12} />
                Demo Mode Simulation
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              {device ? 'Edit Biometric Device' : 'Add New Biometric Device'}
            </h2>
            <p className="text-xs text-slate-500">
              Configure device network settings and LAN handshake parameters.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Hardware Notice Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/60 flex items-start gap-3">
            <ShieldAlert size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold">Hardware Phase Notice:</span> Biometric machines communicate over local office LAN. In this frontend demo phase, connection tests and sync runs use simulated packet handshakes.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Device Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Device Name <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="e.g. Main Reception K40"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.name ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
                }`}
              />
              {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Device Brand <span className="text-rose-500">*</span>
              </label>
              <select 
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-700"
              >
                {BRANDS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Device Model <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="e.g. SilkBio-101TC or MB160"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.model ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
                }`}
              />
              {errors.model && <p className="text-[11px] text-rose-500 mt-1">{errors.model}</p>}
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Physical Location <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="e.g. Ground Floor Reception"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className={`w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.location ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.location && <p className="text-[11px] text-rose-500 mt-1">{errors.location}</p>}
            </div>

            {/* IP Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                LAN IP Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Wifi size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="192.168.1.201"
                  value={formData.ip}
                  onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                  className={`w-full pl-9 pr-3.5 py-2.5 text-sm font-mono bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.ip ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.ip && <p className="text-[11px] text-rose-500 mt-1">{errors.ip}</p>}
            </div>

            {/* Port */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Port Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Cpu size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input 
                  type="number" 
                  placeholder="4370"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value, 10) || '' })}
                  className={`w-full pl-9 pr-3.5 py-2.5 text-sm font-mono bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.port ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Default 4370 for ZKTeco/eSSL, 5005 for Matrix</p>
              {errors.port && <p className="text-[11px] text-rose-500 mt-1">{errors.port}</p>}
            </div>
          </div>

          {/* Connection Type & Sync Config */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Connection Type</p>
                <p className="text-[11px] text-slate-500">Ethernet LAN TCP/IP Direct Protocol</p>
              </div>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm inline-flex items-center gap-1.5 w-fit">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                LAN (Local Area Network)
              </span>
            </div>

            <div className="pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Automatic Synchronization</p>
                <p className="text-[11px] text-slate-500">Auto pull new punch logs in background</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, autoSync: !formData.autoSync })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.autoSync ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.autoSync ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-xs font-semibold text-slate-700">
                  {formData.autoSync ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            {formData.autoSync && (
              <div className="pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Sync Interval</p>
                  <p className="text-[11px] text-slate-500">Frequency of device poll requests</p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <select
                    value={formData.syncInterval}
                    onChange={(e) => setFormData({ ...formData, syncInterval: parseInt(e.target.value, 10) })}
                    className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value={5}>Every 5 minutes</option>
                    <option value={10}>Every 10 minutes</option>
                    <option value={15}>Every 15 minutes</option>
                    <option value={30}>Every 30 minutes</option>
                    <option value={60}>Every 60 minutes</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Test Connection Result Box */}
          {testResult && (
            <div className={`p-4 rounded-2xl border text-xs leading-relaxed animate-in fade-in duration-300 ${
              testResult.success 
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                : 'bg-rose-50/80 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center justify-between font-bold mb-1">
                <span className="flex items-center gap-2">
                  {testResult.success ? (
                    <Check size={16} className="text-emerald-600" />
                  ) : (
                    <AlertCircle size={16} className="text-rose-600" />
                  )}
                  {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/70 border border-current">
                  Simulated
                </span>
              </div>
              <p className="mt-1">{testResult.message}</p>
              {testResult.latency && (
                <div className="mt-2 pt-2 border-t border-emerald-200/50 flex items-center gap-4 text-[11px] font-semibold text-emerald-800">
                  <span>Ping: <strong>{testResult.latency}</strong></span>
                  <span>Firmware: <strong>{testResult.firmware}</strong></span>
                  <span>Status: <strong className="text-emerald-700">ONLINE</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              disabled={testing}
              onClick={handleTestConnection}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60"
            >
              {testing ? (
                <>
                  <Loader2 size={14} className="animate-spin text-blue-600" />
                  Pinging LAN Device...
                </>
              ) : (
                <>
                  <Wifi size={14} className="text-blue-600" />
                  Test Connection
                </>
              )}
            </button>

            <div className="w-full sm:w-auto flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold shadow-md shadow-slate-900/10 transition-all flex items-center justify-center gap-2"
              >
                <Check size={14} />
                Save Device
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeviceFormModal;
