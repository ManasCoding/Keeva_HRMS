import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Fingerprint, Users, Sparkles, Building2, Server } from 'lucide-react';
import biometricService from '../../services/biometricService';

const EmployeeMappingModal = ({ isOpen, onClose, mapping, devices, employees, onSaved }) => {
  const [formData, setFormData] = useState({
    employeeName: '',
    employeeCode: '',
    department: 'Engineering',
    biometricUserId: '',
    deviceId: '',
    deviceName: '',
    status: 'Active'
  });

  const [selectedEmpIndex, setSelectedEmpIndex] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (mapping) {
      setFormData({
        id: mapping.id,
        employeeName: mapping.employeeName || '',
        employeeCode: mapping.employeeCode || '',
        department: mapping.department || 'Engineering',
        biometricUserId: mapping.biometricUserId || '',
        deviceId: mapping.deviceId || (devices[0]?.id || ''),
        deviceName: mapping.deviceName || (devices[0]?.name || ''),
        status: mapping.status || 'Active'
      });
      setSelectedEmpIndex('custom');
    } else {
      const defaultDev = devices[0] || {};
      const firstEmp = employees[0] || {
        fullName: 'Manas Kumar Gumansingh',
        empCode: 'OG1001',
        department: 'Engineering'
      };

      setFormData({
        employeeName: firstEmp.fullName || firstEmp.name || '',
        employeeCode: firstEmp.empCode || 'OG1001',
        department: firstEmp.department || 'Engineering',
        biometricUserId: '',
        deviceId: defaultDev.id || '',
        deviceName: defaultDev.name || '',
        status: 'Active'
      });
      setSelectedEmpIndex('0');
    }
    setError('');
  }, [mapping, isOpen, devices, employees]);

  if (!isOpen) return null;

  const handleEmployeeSelect = (idxStr) => {
    setSelectedEmpIndex(idxStr);
    if (idxStr !== 'custom') {
      const idx = parseInt(idxStr, 10);
      const emp = employees[idx];
      if (emp) {
        setFormData(prev => ({
          ...prev,
          employeeName: emp.fullName || emp.name || '',
          employeeCode: emp.empCode || '',
          department: emp.department || 'General'
        }));
      }
    }
  };

  const handleDeviceSelect = (devId) => {
    const dev = devices.find(d => d.id === devId);
    setFormData(prev => ({
      ...prev,
      deviceId: devId,
      deviceName: dev ? dev.name : ''
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.employeeName.trim()) {
      setError('Employee name is required');
      return;
    }
    if (!formData.biometricUserId.toString().trim()) {
      setError('Biometric Device User ID is required (e.g. 101, 102)');
      return;
    }
    if (!formData.deviceId) {
      setError('Please select a biometric device');
      return;
    }

    try {
      biometricService.saveMapping(formData);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save mapping');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] shadow-2xl border border-slate-100 w-full max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                <Fingerprint size={12} />
                Hardware Identity Bridge
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              {mapping ? 'Edit Employee Mapping' : 'Map Employee to Biometric'}
            </h2>
            <p className="text-xs text-slate-500">
              Bind HRMS employee record with machine fingerprint User ID.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle size={16} className="text-rose-600 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Notice */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600 leading-relaxed">
            💡 <strong>Note:</strong> HRMS Employee Code (e.g. <span className="font-mono text-slate-800 font-semibold">OG1001</span>) and Biometric Machine ID (e.g. <span className="font-mono text-blue-600 font-bold">101</span>) are decoupled. Enter the exact User ID registered inside the machine's memory.
          </div>

          {/* Employee Selection */}
          {!mapping && employees && employees.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select HRMS Employee
              </label>
              <select
                value={selectedEmpIndex}
                onChange={(e) => handleEmployeeSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {employees.map((emp, idx) => (
                  <option key={emp._id || emp.id || idx} value={idx.toString()}>
                    {emp.fullName || emp.name} ({emp.empCode}) — {emp.department || 'General'}
                  </option>
                ))}
                <option value="custom">-- Enter Custom / Other Employee --</option>
              </select>
            </div>
          )}

          {/* Employee Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Employee Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Manas Kumar"
                value={formData.employeeName}
                onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                HRMS Employee Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. OG1001"
                value={formData.employeeCode}
                onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Department & Biometric User ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Department
              </label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Engineering"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Biometric Device User ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Fingerprint size={14} className="absolute left-3 top-2.5 text-blue-600" />
                <input
                  type="text"
                  placeholder="e.g. 101 or 1002"
                  value={formData.biometricUserId}
                  onChange={(e) => setFormData({ ...formData, biometricUserId: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-blue-50/50 border border-blue-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-blue-900"
                />
              </div>
            </div>
          </div>

          {/* Device Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Assigned Biometric Machine <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Server size={14} className="absolute left-3 top-3 text-slate-400" />
              <select
                value={formData.deviceId}
                onChange={(e) => handleDeviceSelect(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">-- Choose Machine --</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.brand} {d.model} - {d.location})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mapping Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Enrollment Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Active', 'Pending Enrollment', 'Inactive'].map(st => (
                <button
                  type="button"
                  key={st}
                  onClick={() => setFormData({ ...formData, status: st })}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition-all ${
                    formData.status === st
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold shadow-md shadow-slate-900/10 transition-all flex items-center gap-1.5"
            >
              <Check size={14} />
              Save Mapping
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeMappingModal;
