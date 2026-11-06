import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { 
  Fingerprint, Server, Wifi, WifiOff, Users, Clock, 
  RefreshCw, Plus, Search, Filter, Download, CheckCircle2, 
  AlertTriangle, AlertOctagon, Eye, Edit2, Trash2, ShieldCheck, 
  Sparkles, ArrowRight, ArrowUpRight, Activity, Calendar, Cpu,
  Layers, Check, ExternalLink, HelpCircle
} from 'lucide-react';
import biometricService from '../../services/biometricService';
import api from '../../services/api';

// Modals
import DeviceFormModal from '../../components/Biometric/DeviceFormModal';
import DeviceDetailsModal from '../../components/Biometric/DeviceDetailsModal';
import EmployeeMappingModal from '../../components/Biometric/EmployeeMappingModal';
import SyncDetailsModal from '../../components/Biometric/SyncDetailsModal';
import SimulateScanModal from '../../components/Biometric/SimulateScanModal';

const BiometricDashboard = () => {
  const { tab: urlTab } = useParams();
  const navigate = useNavigate();

  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState(urlTab || 'overview'); // 'overview' | 'devices' | 'mapping' | 'logs' | 'sync'

  useEffect(() => {
    if (urlTab && ['overview', 'devices', 'mapping', 'logs', 'sync'].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    navigate(`/admin/biometric/${newTab}`, { replace: true });
  };

  // Data states
  const [devices, setDevices] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [logs, setLogs] = useState([]);
  const [syncHistory, setSyncHistory] = useState([]);
  const [stats, setStats] = useState({
    totalDevices: 0,
    connectedDevices: 0,
    disconnectedDevices: 0,
    totalMapped: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    lastSyncTime: null
  });
  const [employees, setEmployees] = useState([]);

  // Modals state
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [selectedDeviceForEdit, setSelectedDeviceForEdit] = useState(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDeviceForView, setSelectedDeviceForView] = useState(null);

  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [selectedMappingForEdit, setSelectedMappingForEdit] = useState(null);

  const [isSyncDetailsOpen, setIsSyncDetailsOpen] = useState(false);
  const [selectedSyncRecord, setSelectedSyncRecord] = useState(null);

  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);

  // Quick Action Feedback / Toast
  const [toastMessage, setToastMessage] = useState(null);
  const [isGlobalSyncing, setIsGlobalSyncing] = useState(false);

  // Filters for Devices
  const [deviceSearch, setDeviceSearch] = useState('');
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('All');

  // Filters for Mapping
  const [mappingSearch, setMappingSearch] = useState('');
  const [mappingDeptFilter, setMappingDeptFilter] = useState('All');
  const [mappingDeviceFilter, setMappingDeviceFilter] = useState('All');

  // Filters for Attendance Logs
  const [logSearch, setLogSearch] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState('All');
  const [logDeviceFilter, setLogDeviceFilter] = useState('All');
  const [logStatusFilter, setLogStatusFilter] = useState('All');
  const [logDateFilter, setLogDateFilter] = useState('');

  // Initial Data Load
  const reloadData = () => {
    const devs = biometricService.getDevices();
    const maps = biometricService.getMappings();
    const rawLogs = biometricService.getAttendanceLogs();
    const history = biometricService.getSyncHistory();
    const st = biometricService.getStats();

    setDevices(devs);
    setMappings(maps);
    setLogs(rawLogs);
    setSyncHistory(history);
    setStats(st);
  };

  const fetchExistingEmployees = async () => {
    try {
      const res = await api.get('/admin/employees');
      if (res.data && res.data.success && Array.isArray(res.data.employees) && res.data.employees.length > 0) {
        setEmployees(res.data.employees);
      } else {
        // Fallback demo employees
        setEmployees([
          { fullName: 'Manas Kumar Gumansingh', empCode: 'OG1001', department: 'Engineering' },
          { fullName: 'Priya Sharma', empCode: 'OG1002', department: 'Human Resources' },
          { fullName: 'Rahul Verma', empCode: 'OG1003', department: 'Software Development' },
          { fullName: 'Sneha Patel', empCode: 'OG1004', department: 'Quality Assurance' },
          { fullName: 'Amit Saxena', empCode: 'OG1005', department: 'Logistics' },
          { fullName: 'Ananya Roy', empCode: 'OG1006', department: 'Marketing' },
          { fullName: 'Karan Mehra', empCode: 'OG1007', department: 'Operations' }
        ]);
      }
    } catch {
      setEmployees([
        { fullName: 'Manas Kumar Gumansingh', empCode: 'OG1001', department: 'Engineering' },
        { fullName: 'Priya Sharma', empCode: 'OG1002', department: 'Human Resources' },
        { fullName: 'Rahul Verma', empCode: 'OG1003', department: 'Software Development' },
        { fullName: 'Sneha Patel', empCode: 'OG1004', department: 'Quality Assurance' },
        { fullName: 'Amit Saxena', empCode: 'OG1005', department: 'Logistics' }
      ]);
    }
  };

  useEffect(() => {
    reloadData();
    fetchExistingEmployees();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Device actions
  const handleSaveDevice = (deviceData) => {
    biometricService.saveDevice(deviceData);
    reloadData();
    showToast(deviceData.id ? 'Device settings updated successfully' : 'New biometric device registered');
  };

  const handleDeleteDevice = (id, name) => {
    if (window.confirm(`Are you sure you want to delete biometric device "${name}"?`)) {
      biometricService.deleteDevice(id);
      reloadData();
      showToast('Device removed from registry', 'info');
    }
  };

  const handleTestDeviceDirect = async (device) => {
    showToast(`Testing LAN connection to ${device.ip}:${device.port}...`, 'info');
    const res = await biometricService.testConnection(device);
    if (res.success) {
      showToast(`Connected to ${device.name}! Latency: ${res.latency} (Simulated)`, 'success');
    } else {
      showToast(`Connection failed to ${device.name}: ${res.message}`, 'error');
    }
  };

  const handleToggleDevice = async (device) => {
    try {
      const res = await biometricService.toggleDeviceConnection(device.id);
      reloadData();
      showToast(res.message, res.device.status === 'Connected' ? 'success' : 'info');
    } catch (err) {
      showToast(err.message || 'Failed to toggle device connection', 'error');
    }
  };

  // Mapping actions
  const handleDeleteMapping = (id, empName) => {
    if (window.confirm(`Remove biometric mapping for employee "${empName}"?`)) {
      biometricService.deleteMapping(id);
      reloadData();
      showToast('Biometric mapping removed', 'info');
    }
  };

  // Global Sync Now
  const handleTriggerGlobalSync = async () => {
    setIsGlobalSyncing(true);
    try {
      const res = await biometricService.triggerSync('all');
      reloadData();
      showToast(res.message, 'success');
    } catch {
      showToast('Synchronization error occurred', 'error');
    } finally {
      setIsGlobalSyncing(false);
    }
  };

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(deviceSearch.toLowerCase()) ||
        d.ip.toLowerCase().includes(deviceSearch.toLowerCase()) ||
        d.brand.toLowerCase().includes(deviceSearch.toLowerCase()) ||
        d.location.toLowerCase().includes(deviceSearch.toLowerCase());
      const matchesStatus = deviceStatusFilter === 'All' || d.status === deviceStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [devices, deviceSearch, deviceStatusFilter]);

  // Filtered mappings
  const filteredMappings = useMemo(() => {
    return mappings.filter(m => {
      const matchesSearch = m.employeeName.toLowerCase().includes(mappingSearch.toLowerCase()) ||
        m.employeeCode.toLowerCase().includes(mappingSearch.toLowerCase()) ||
        m.biometricUserId.toString().toLowerCase().includes(mappingSearch.toLowerCase());
      const matchesDept = mappingDeptFilter === 'All' || m.department === mappingDeptFilter;
      const matchesDev = mappingDeviceFilter === 'All' || m.deviceId === mappingDeviceFilter;
      return matchesSearch && matchesDept && matchesDev;
    });
  }, [mappings, mappingSearch, mappingDeptFilter, mappingDeviceFilter]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchesSearch = (l.employeeName || '').toLowerCase().includes(logSearch.toLowerCase()) ||
        (l.employeeCode || '').toLowerCase().includes(logSearch.toLowerCase()) ||
        (l.biometricUserId || '').toString().toLowerCase().includes(logSearch.toLowerCase());
      const matchesType = logTypeFilter === 'All' || l.scanType === logTypeFilter;
      const matchesDev = logDeviceFilter === 'All' || l.deviceId === logDeviceFilter;
      const matchesStatus = logStatusFilter === 'All' || l.syncStatus === logStatusFilter;
      const matchesDate = !logDateFilter || l.scanDate === logDateFilter;
      return matchesSearch && matchesType && matchesDev && matchesStatus && matchesDate;
    });
  }, [logs, logSearch, logTypeFilter, logDeviceFilter, logStatusFilter, logDateFilter]);

  // Unique departments for mapping filter
  const departmentsList = useMemo(() => {
    const set = new Set();
    mappings.forEach(m => m.department && set.add(m.department));
    return Array.from(set);
  }, [mappings]);

  return (
    <AdminLayout
      title="Biometric Device Management"
      subtitle="Local Area Network Biometric Machines & Real-Time Attendance Synchronization"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Notification Toast */}
        {toastMessage && (
          <div className={`p-4 rounded-2xl shadow-lg border flex items-center justify-between text-xs font-bold transition-all animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : toastMessage.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <div className="flex items-center gap-2.5">
              {toastMessage.type === 'error' ? (
                <AlertOctagon size={16} className="text-rose-600 flex-shrink-0" />
              ) : toastMessage.type === 'info' ? (
                <Activity size={16} className="text-blue-600 flex-shrink-0" />
              ) : (
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
              )}
              <span>{toastMessage.msg}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}

        {/* Demo Mode Notice Banner */}
        <div className="p-4 rounded-[22px] bg-gradient-to-r from-blue-900/90 via-slate-900 to-[#0f172a] text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-blue-500/20">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0 text-blue-300">
              <Fingerprint size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-white">Biometric Hardware Module</h3>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/40">
                  Demo Mode
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Frontend UI with simulated LAN handshakes (ZKTeco, eSSL, Matrix, Mantra). Physical machine communication will be attached in the next development phase.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-end md:self-center">
            <button
              onClick={() => setIsSimulateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Fingerprint size={15} />
              Live Punch Test
            </button>
            <button
              onClick={handleTriggerGlobalSync}
              disabled={isGlobalSyncing}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-60"
            >
              <RefreshCw size={14} className={isGlobalSyncing ? 'animate-spin' : ''} />
              {isGlobalSyncing ? 'Synchronizing LAN...' : 'Sync All Machines'}
            </button>
            <button
              onClick={() => {
                setSelectedDeviceForEdit(null);
                setIsDeviceModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus size={15} />
              Add Device
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'overview', label: 'Dashboard Overview', icon: <Layers size={16} /> },
            { id: 'devices', label: `Devices (${devices.length})`, icon: <Server size={16} /> },
            { id: 'mapping', label: `Employee Mapping (${mappings.length})`, icon: <Users size={16} /> },
            { id: 'logs', label: `Attendance Logs (${logs.length})`, icon: <Fingerprint size={16} /> },
            { id: 'sync', label: 'Sync History', icon: <RefreshCw size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW & DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 4 Summary Cards (Section 2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Devices */}
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-800"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Devices</span>
                  <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700">
                    <Server size={18} />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-slate-800 mt-2">{stats.totalDevices}</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Configured on office network</p>
              </div>

              {/* Card 2: Connected Devices */}
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Connected</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Wifi size={18} />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-emerald-700 mt-2">{stats.connectedDevices}</h3>
                <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Online & responding to socket ping
                </p>
              </div>

              {/* Card 3: Disconnected Devices */}
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Disconnected</span>
                  <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                    <WifiOff size={18} />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-rose-700 mt-2">{stats.disconnectedDevices}</h3>
                <p className="text-xs text-rose-500 font-medium mt-1">Check cable or machine power</p>
              </div>

              {/* Card 4: Total Employees Mapped */}
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Mapped Employees</span>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Users size={18} />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-blue-700 mt-2">{stats.totalMapped}</h3>
                <p className="text-xs text-blue-600 font-medium mt-1">Biometric IDs bound to HRMS</p>
              </div>
            </div>

            {/* Sync Telemetry & Connection Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Connection Overview & Quick Status */}
              <div className="lg:col-span-2 bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">LAN Hardware Connection Status</h3>
                    <p className="text-xs text-slate-500">Live ping status across configured office subnets</p>
                  </div>
                  <button
                    onClick={() => handleTabChange('devices')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    View All <ArrowRight size={13} />
                  </button>
                </div>

                <div className="space-y-3">
                  {devices.map(device => {
                    const isConn = device.status === 'Connected';
                    return (
                      <div
                        key={device.id}
                        className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-4 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${isConn ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-800">{device.name}</h4>
                              <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                {device.ip}:{device.port}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{device.brand} {device.model} • {device.location}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            isConn
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {device.status}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedDeviceForView(device);
                              setIsDetailsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-all"
                            title="View Device"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sync telemetry bar */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 rounded-xl bg-slate-50">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Last Sync Time</p>
                    <p className="font-bold text-slate-800 mt-1">
                      {stats.lastSyncTime ? new Date(stats.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/50">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Successful Syncs</p>
                    <p className="font-bold text-emerald-700 mt-1">{stats.successfulSyncs} batches</p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50/50">
                    <p className="text-[10px] text-rose-600 font-bold uppercase">Failed Syncs</p>
                    <p className="font-bold text-rose-700 mt-1">{stats.failedSyncs} batches</p>
                  </div>
                </div>
              </div>

              {/* Recent Biometric Activity Stream */}
              <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Activity size={18} className="text-blue-600" />
                      Recent Scan Activity
                    </h3>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Live Feed</span>
                  </div>

                  <div className="space-y-3">
                    {logs.slice(0, 5).map(log => (
                      <div key={log.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-start justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{log.employeeName}</span>
                            <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.2 rounded border">
                              ID: {log.biometricUserId}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {log.deviceName} • {log.scanTime}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          log.scanType === 'IN' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : log.scanType === 'OUT' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {log.scanType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => setIsSimulateModalOpen(true)}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Fingerprint size={14} />
                    Live Punch Test
                  </button>
                  <button
                    onClick={() => handleTabChange('logs')}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    View Logs
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEVICE MANAGEMENT (Section 3 & 4) */}
        {activeTab === 'devices' && (
          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm space-y-5">
            {/* Action & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by device name, IP, brand or location..."
                    value={deviceSearch}
                    onChange={(e) => setDeviceSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <select
                  value={deviceStatusFilter}
                  onChange={(e) => setDeviceStatusFilter(e.target.value)}
                  className="px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Connected">Connected</option>
                  <option value="Disconnected">Disconnected</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setSelectedDeviceForEdit(null);
                  setIsDeviceModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold transition-all shadow-md shadow-slate-900/10 flex items-center justify-center gap-1.5"
              >
                <Plus size={15} />
                Add New Device
              </button>
            </div>

            {/* Devices Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4">Device Name</th>
                    <th className="py-3.5 px-4">Brand & Model</th>
                    <th className="py-3.5 px-4">IP Address & Port</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Connection Status</th>
                    <th className="py-3.5 px-4">Last Sync</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                        No biometric devices found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredDevices.map(device => {
                      const isConn = device.status === 'Connected';
                      return (
                        <tr key={device.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {device.name}
                            <span className="block text-[10px] font-normal text-slate-400">
                              {device.mappedUsers || 0} mapped employees
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800">{device.brand}</span>
                            <span className="block text-[11px] text-slate-500">{device.model}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-blue-700 border border-slate-200">
                              {device.ip}:{device.port}
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">LAN TCP/IP</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-medium">{device.location}</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              isConn
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isConn ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                              {device.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {device.lastSync ? new Date(device.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleToggleDevice(device)}
                                title={isConn ? "Disconnect LAN Device" : "Connect LAN Device"}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                                  isConn 
                                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200' 
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 shadow-sm'
                                }`}
                              >
                                {isConn ? 'Disconnect' : 'Connect'}
                              </button>
                              <button
                                onClick={() => handleTestDeviceDirect(device)}
                                title="Test LAN Connection"
                                className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[11px] font-bold transition-all border border-blue-200"
                              >
                                Test
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedDeviceForView(device);
                                  setIsDetailsModalOpen(true);
                                }}
                                title="View Details"
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedDeviceForEdit(device);
                                  setIsDeviceModalOpen(true);
                                }}
                                title="Edit Device"
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteDevice(device.id, device.name)}
                                title="Delete Device"
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: EMPLOYEE MAPPING (Section 5) */}
        {activeTab === 'mapping' && (
          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm space-y-5">
            {/* Header info & Filter bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative min-w-[200px] flex-1">
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, code or biometric ID..."
                    value={mappingSearch}
                    onChange={(e) => setMappingSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <select
                  value={mappingDeptFilter}
                  onChange={(e) => setMappingDeptFilter(e.target.value)}
                  className="px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                >
                  <option value="All">All Departments</option>
                  {departmentsList.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <select
                  value={mappingDeviceFilter}
                  onChange={(e) => setMappingDeviceFilter(e.target.value)}
                  className="px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                >
                  <option value="All">All Machines</option>
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setSelectedMappingForEdit(null);
                  setIsMappingModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold transition-all shadow-md shadow-slate-900/10 flex items-center justify-center gap-1.5"
              >
                <Plus size={15} />
                Map Employee
              </button>
            </div>

            {/* Mappings Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4">Employee Name</th>
                    <th className="py-3.5 px-4">HRMS Employee Code</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Biometric User ID</th>
                    <th className="py-3.5 px-4">Assigned Machine</th>
                    <th className="py-3.5 px-4">Mapping Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredMappings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                        No employee mappings found. Click "Map Employee" to associate an employee with a biometric ID.
                      </td>
                    </tr>
                  ) : (
                    filteredMappings.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{m.employeeName}</td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">{m.employeeCode}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">{m.department}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                            #{m.biometricUserId}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">{m.deviceName}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            m.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : m.status === 'Pending Enrollment'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedMappingForEdit(m);
                                setIsMappingModalOpen(true);
                              }}
                              title="Edit Mapping"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteMapping(m.id, m.employeeName)}
                              title="Remove Mapping"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: BIOMETRIC ATTENDANCE LOGS (Section 6) */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm space-y-5">
            {/* Header info & Filter bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative min-w-[200px] flex-1">
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search employee, emp code or user ID..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <select
                  value={logTypeFilter}
                  onChange={(e) => setLogTypeFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                >
                  <option value="All">All Types (IN / OUT)</option>
                  <option value="IN">Punch IN</option>
                  <option value="OUT">Punch OUT</option>
                  <option value="Unknown">Unknown</option>
                </select>

                <select
                  value={logDeviceFilter}
                  onChange={(e) => setLogDeviceFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                >
                  <option value="All">All Machines</option>
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>

                <select
                  value={logStatusFilter}
                  onChange={(e) => setLogStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                >
                  <option value="All">All Sync Status</option>
                  <option value="Synced">Synced</option>
                  <option value="Duplicate">Duplicate</option>
                  <option value="Failed">Failed</option>
                </select>

                <input
                  type="date"
                  value={logDateFilter}
                  onChange={(e) => setLogDateFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />

                {logDateFilter && (
                  <button
                    onClick={() => setLogDateFilter('')}
                    className="text-xs text-rose-500 font-bold hover:underline"
                  >
                    Clear Date
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 self-start lg:self-auto">
                <button
                  onClick={() => setIsSimulateModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Fingerprint size={14} />
                  Live Punch Test
                </button>
                <button
                  onClick={() => biometricService.exportLogsToCSV(filteredLogs)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Download size={14} className="text-blue-600" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Attendance Logs Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4">Scan Date & Time</th>
                    <th className="py-3.5 px-4">Employee Name</th>
                    <th className="py-3.5 px-4">Employee Code</th>
                    <th className="py-3.5 px-4">Device User ID</th>
                    <th className="py-3.5 px-4">Scan Type</th>
                    <th className="py-3.5 px-4">Machine Source</th>
                    <th className="py-3.5 px-4">Sync Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                        No biometric scan records matching filter parameters.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono">
                          <span className="font-bold text-slate-800">{log.scanTime}</span>
                          <span className="block text-[10px] text-slate-400">{log.scanDate}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{log.employeeName}</td>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{log.employeeCode}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            #{log.biometricUserId}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            log.scanType === 'IN'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : log.scanType === 'OUT'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {log.scanType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">{log.deviceName}</td>
                        <td className="py-3.5 px-4">
                          {log.syncStatus === 'Synced' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 size={12} />
                              Synced
                            </span>
                          )}
                          {log.syncStatus === 'Duplicate' && (
                            <span 
                              title={log.duplicateReason || 'Duplicate scan within debounce threshold'}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 cursor-help"
                            >
                              <AlertTriangle size={12} />
                              Duplicate
                            </span>
                          )}
                          {log.syncStatus === 'Failed' && (
                            <span 
                              title={log.failureReason || 'Failed to match HRMS employee profile'}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 cursor-help"
                            >
                              <AlertOctagon size={12} />
                              Failed
                            </span>
                          )}
                          {log.syncStatus === 'Pending' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              <Clock size={12} />
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: SYNCHRONIZATION HISTORY (Section 7) */}
        {activeTab === 'sync' && (
          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm space-y-6">
            {/* Top Stat Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Last Sync</p>
                <h4 className="text-base font-bold text-slate-800 mt-1">
                  {stats.lastSyncTime ? new Date(stats.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                </h4>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Fetched</p>
                <h4 className="text-xl font-black text-slate-800 mt-1">
                  {syncHistory.reduce((acc, c) => acc + (c.recordsFetched || 0), 0)}
                </h4>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Successfully Synced</p>
                <h4 className="text-xl font-black text-emerald-700 mt-1">
                  {syncHistory.reduce((acc, c) => acc + (c.recordsSynced || 0), 0)}
                </h4>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                <p className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Duplicates</p>
                <h4 className="text-xl font-black text-amber-700 mt-1">
                  {syncHistory.reduce((acc, c) => acc + (c.recordsDuplicate || 0), 0)}
                </h4>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100">
                <p className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Failed Records</p>
                <h4 className="text-xl font-black text-rose-700 mt-1">
                  {syncHistory.reduce((acc, c) => acc + (c.recordsFailed || 0), 0)}
                </h4>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
                <p className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Pending</p>
                <h4 className="text-xl font-black text-blue-700 mt-1">0</h4>
              </div>
            </div>

            {/* Sync Now & Refresh Bar */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <h3 className="text-base font-bold text-slate-800">Synchronization Audit Log</h3>
                <p className="text-xs text-slate-500">Historical records of automated and manual biometric pull jobs</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={reloadData}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className="text-slate-500" />
                  Refresh
                </button>
                <button
                  onClick={handleTriggerGlobalSync}
                  disabled={isGlobalSyncing}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-60"
                >
                  <RefreshCw size={13} className={isGlobalSyncing ? 'animate-spin' : ''} />
                  {isGlobalSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>

            {/* Sync History Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4">Sync Timestamp</th>
                    <th className="py-3.5 px-4">Machine Source</th>
                    <th className="py-3.5 px-4">Records Fetched</th>
                    <th className="py-3.5 px-4">Synced</th>
                    <th className="py-3.5 px-4">Duplicates</th>
                    <th className="py-3.5 px-4">Failed</th>
                    <th className="py-3.5 px-4">Triggered By</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {syncHistory.map(sync => (
                    <tr key={sync.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {new Date(sync.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{sync.deviceName}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{sync.recordsFetched}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">{sync.recordsSynced}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-amber-600">{sync.recordsDuplicate || 0}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-rose-600">{sync.recordsFailed || 0}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{sync.triggeredBy}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          sync.status === 'Success'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : sync.status === 'Partial'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {sync.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedSyncRecord(sync);
                            setIsSyncDetailsOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODALS */}
        <DeviceFormModal
          isOpen={isDeviceModalOpen}
          onClose={() => setIsDeviceModalOpen(false)}
          device={selectedDeviceForEdit}
          onSave={handleSaveDevice}
        />

        <DeviceDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          device={selectedDeviceForView}
          onEdit={(dev) => {
            setSelectedDeviceForEdit(dev);
            setIsDeviceModalOpen(true);
          }}
          onDeviceUpdated={reloadData}
        />

        <EmployeeMappingModal
          isOpen={isMappingModalOpen}
          onClose={() => setIsMappingModalOpen(false)}
          mapping={selectedMappingForEdit}
          devices={devices}
          employees={employees}
          onSaved={() => {
            reloadData();
            showToast('Employee biometric mapping saved successfully');
          }}
        />

        <SyncDetailsModal
          isOpen={isSyncDetailsOpen}
          onClose={() => setIsSyncDetailsOpen(false)}
          syncRecord={selectedSyncRecord}
        />

        <SimulateScanModal
          isOpen={isSimulateModalOpen}
          onClose={() => setIsSimulateModalOpen(false)}
          devices={devices}
          mappings={mappings}
          onScanRecorded={(newLog) => {
            reloadData();
            showToast(`Fingerprint scan recorded for ${newLog.employeeName} (${newLog.scanType}) on ${newLog.deviceName}!`, 'success');
          }}
        />
      </div>
    </AdminLayout>
  );
};

export default BiometricDashboard;
