import React, { useEffect, useState, useCallback } from 'react';
import {
  Smartphone,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Unlock,
  RotateCcw,
  Trash2,
  User,
  Calendar,
  Clock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
  Loader2,
  AlertCircle,
  Activity,
  History,
  Info
} from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout';
import QrAttendanceTabs from '../components/qr/QrAttendanceTabs';
import api from '../services/api';
import toast from 'react-hot-toast';

const SummaryCard = ({ title, count, subtext, color = 'emerald' }) => {
  const colorMap = {
    emerald: 'border-emerald-200 bg-emerald-50/50 text-emerald-700',
    blue: 'border-blue-200 bg-blue-50/50 text-blue-700',
    rose: 'border-rose-200 bg-rose-50/50 text-rose-700',
    amber: 'border-amber-200 bg-amber-50/50 text-amber-700'
  };

  return (
    <div className={`p-4 rounded-2xl border ${colorMap[color]} shadow-xs`}>
      <p className="text-[10px] font-black uppercase tracking-wider opacity-75">{title}</p>
      <p className="text-2xl font-black mt-0.5 tracking-tight">{count}</p>
      {subtext && <p className="text-[11px] font-medium opacity-80 mt-0.5">{subtext}</p>}
    </div>
  );
};

const AdminRegisteredDevices = () => {
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, blocked: 0, unregistered: 0 });

  // Search & Filters
  const [search, setSearch] = useState('');
  const [filterOs, setFilterOs] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Side Panel Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deviceDetail, setDeviceDetail] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterOs !== 'All') params.append('os', filterOs);
      if (filterStatus !== 'All') params.append('status', filterStatus);

      const res = await api.get(`/qr-attendance/admin/devices?${params.toString()}`);
      if (res.data.success) {
        setDevices(res.data.data);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      toast.error('Failed to load registered devices');
    } finally {
      setLoading(false);
    }
  }, [search, filterOs, filterStatus]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Open Device Management Side Panel
  const handleOpenDetail = async (item) => {
    setSelectedItem(item);
    setDetailLoading(true);
    setDeviceDetail(null);
    try {
      const res = await api.get(`/qr-attendance/admin/devices/${item.employeeId}`);
      if (res.data.success) {
        setDeviceDetail(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load detailed device history');
    } finally {
      setDetailLoading(false);
    }
  };

  // Admin Actions: Block Device
  const handleBlockDevice = async () => {
    if (!selectedItem?._id && !deviceDetail?.device?._id) return;
    const targetId = deviceDetail?.device?._id || selectedItem._id;
    if (!window.confirm(`Are you sure you want to BLOCK this device for ${selectedItem.employeeName}? They will not be able to record QR attendance.`)) return;

    try {
      setActionLoading(true);
      const res = await api.post(`/qr-attendance/admin/devices/${targetId}/block`, {
        reason: 'Admin blocked from management console'
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Device blocked successfully');
        handleOpenDetail(selectedItem);
        fetchDevices();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to block device');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin Actions: Unblock Device
  const handleUnblockDevice = async () => {
    if (!selectedItem?._id && !deviceDetail?.device?._id) return;
    const targetId = deviceDetail?.device?._id || selectedItem._id;
    try {
      setActionLoading(true);
      const res = await api.post(`/qr-attendance/admin/devices/${targetId}/unblock`);
      if (res.data.success) {
        toast.success(res.data.message || 'Device unblocked successfully');
        handleOpenDetail(selectedItem);
        fetchDevices();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unblock device');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin Actions: Reset Device (Allows Re-Registration)
  const handleResetDevice = async () => {
    if (!selectedItem?._id && !deviceDetail?.device?._id) return;
    const targetId = deviceDetail?.device?._id || selectedItem._id;
    if (!window.confirm(`Reset device binding for ${selectedItem.employeeName}? The employee will be prompted to log in and register their new phone on next scan.`)) return;

    try {
      setActionLoading(true);
      const res = await api.post(`/qr-attendance/admin/devices/${targetId}/reset`);
      if (res.data.success) {
        toast.success(res.data.message || 'Device reset successfully');
        handleOpenDetail(selectedItem);
        fetchDevices();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset device');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin Actions: Remove Device Registration Permanently
  const handleRemoveDevice = async () => {
    if (!selectedItem?._id && !deviceDetail?.device?._id) return;
    const targetId = deviceDetail?.device?._id || selectedItem._id;
    if (!window.confirm(`PERMANENT ACTION: Completely remove registered device record for ${selectedItem.employeeName}?`)) return;

    try {
      setActionLoading(true);
      const res = await api.delete(`/qr-attendance/admin/devices/${targetId}`);
      if (res.data.success) {
        toast.success(res.data.message || 'Device registration removed');
        setSelectedItem(null);
        fetchDevices();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove device');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout
      title="QR Attendance"
      subtitle="Smart QR attendance terminal, mobile device authorizations, and live activity feed"
    >
      <div className="space-y-6">
        {/* Navigation Tabs to Switch Views */}
        <QrAttendanceTabs activeTab="devices" />

        {/* Dashboard Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Employees"
            count={summary.total}
            subtext="In active directory"
            color="blue"
          />
          <SummaryCard
            title="Active Devices"
            count={summary.active}
            subtext="Authorized for daily scan"
            color="emerald"
          />
          <SummaryCard
            title="Blocked Devices"
            count={summary.blocked}
            subtext="Denied QR access"
            color="rose"
          />
          <SummaryCard
            title="Unregistered"
            count={summary.unregistered}
            subtext="First-time setup pending"
            color="amber"
          />
        </div>

        {/* Search & Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by employee name, ID, or device model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] font-black uppercase text-slate-400">OS:</span>
              <select
                value={filterOs}
                onChange={(e) => setFilterOs(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 border-none focus:ring-0 p-0 cursor-pointer"
              >
                <option value="All">All OS</option>
                <option value="Android">Android</option>
                <option value="iOS">iOS</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] font-black uppercase text-slate-400">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 border-none focus:ring-0 p-0 cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Blocked">Blocked</option>
                <option value="Unregistered">Unregistered</option>
              </select>
            </div>
          </div>
        </div>

        {/* Devices Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Employee Name</th>
                  <th className="py-3.5 px-4">Employee ID</th>
                  <th className="py-3.5 px-4">Mobile Device Model</th>
                  <th className="py-3.5 px-4">OS</th>
                  <th className="py-3.5 px-4">Browser</th>
                  <th className="py-3.5 px-4">Registration Date</th>
                  <th className="py-3.5 px-4">Last Used</th>
                  <th className="py-3.5 px-4">Device Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {devices.map((item) => (
                  <tr key={item.employeeId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 font-bold flex items-center justify-center overflow-hidden shrink-0">
                          {item.profileImage ? (
                            <img src={item.profileImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={16} />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{item.employeeName}</p>
                          <p className="text-[10px] text-slate-400">{item.department || 'General'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                      {item.empCode}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {item.deviceModel}
                    </td>

                    <td className="py-3.5 px-4">
                      {item.os !== '—' ? (
                        <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                          {item.os}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-500">
                      {item.browser}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {item.registrationDate ? new Date(item.registrationDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {item.lastUsedDate ? (
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Clock size={11} className="text-slate-400" />
                          <span>{new Date(item.lastUsedDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        </div>
                      ) : '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      {item.status === 'Active' && (
                        <span className="inline-flex items-center gap-1 font-black text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                          <CheckCircle2 size={11} />
                          <span>Active</span>
                        </span>
                      )}
                      {item.status === 'Blocked' && (
                        <span className="inline-flex items-center gap-1 font-black text-[10px] text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                          <Lock size={11} />
                          <span>Blocked</span>
                        </span>
                      )}
                      {item.status === 'Unregistered' && (
                        <span className="inline-flex items-center font-bold text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          Unregistered
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(item)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary transition-all cursor-pointer"
                      >
                        Manage Device
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && devices.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              No devices found matching your criteria.
            </div>
          )}
        </div>

      </div>

      {/* Side Panel Modal for Device Management */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">

            {/* Panel Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-800">Manage Mobile Device</h3>
                  <p className="text-xs font-medium text-slate-400">{selectedItem.employeeName} ({selectedItem.empCode})</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-slate-200/50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Panel Body */}
            <div className="p-6 flex-1 space-y-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-20 text-slate-400">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Employee Info Card */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center overflow-hidden shrink-0 font-bold">
                      {selectedItem.profileImage ? (
                        <img src={selectedItem.profileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{selectedItem.employeeName}</p>
                      <p className="text-xs font-bold text-slate-500 font-mono mt-0.5">ID: {selectedItem.empCode}</p>
                      <p className="text-[11px] font-medium text-slate-400 mt-0.5">{selectedItem.email} • {selectedItem.department || 'General'}</p>
                    </div>
                  </div>

                  {/* Device Status & Metadata Card */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Device Specifications</h4>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Device Model</span>
                        <span className="font-black text-slate-800 mt-0.5 block">{selectedItem.deviceModel}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Operating System</span>
                        <span className="font-black text-slate-800 mt-0.5 block">{selectedItem.os}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Browser</span>
                        <span className="font-black text-slate-800 mt-0.5 block">{selectedItem.browser}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Device Status</span>
                        <span className={`font-black text-[11px] mt-0.5 inline-block ${
                          selectedItem.status === 'Active' ? 'text-emerald-600' : selectedItem.status === 'Blocked' ? 'text-rose-600' : 'text-slate-500'
                        }`}>
                          {selectedItem.status}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Registration Date</span>
                        <span className="font-semibold text-slate-700 mt-0.5 block">
                          {selectedItem.registrationDate ? new Date(selectedItem.registrationDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Last IP Address</span>
                        <span className="font-mono font-bold text-slate-600 mt-0.5 block truncate">
                          {selectedItem.lastIpAddress || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Actions Box */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Device Security Controls</h4>

                    {selectedItem.status === 'Active' && (
                      <button
                        onClick={handleBlockDevice}
                        disabled={actionLoading}
                        className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Lock size={14} />
                        <span>Block This Device (Deny QR Attendance)</span>
                      </button>
                    )}

                    {selectedItem.status === 'Blocked' && (
                      <button
                        onClick={handleUnblockDevice}
                        disabled={actionLoading}
                        className="w-full py-2.5 px-4 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Unlock size={14} />
                        <span>Unblock Device (Restore Access)</span>
                      </button>
                    )}

                    {selectedItem.status !== 'Unregistered' && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={handleResetDevice}
                          disabled={actionLoading}
                          className="py-2.5 px-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          title="Allow employee to register a new phone"
                        >
                          <RotateCcw size={13} />
                          <span>Reset Device</span>
                        </button>

                        <button
                          onClick={handleRemoveDevice}
                          disabled={actionLoading}
                          className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Trash2 size={13} className="text-rose-500" />
                          <span>Remove</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Scan History Feed */}
                  <div className="space-y-3 pt-3">
                    <div className="flex items-center gap-2">
                      <History size={16} className="text-slate-400" />
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Device Scan History</h4>
                    </div>

                    {deviceDetail?.scanHistory && deviceDetail.scanHistory.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-1">
                        {deviceDetail.scanHistory.map((sh, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-800">{sh.action}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{sh.remarks || 'QR terminal scan'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-[10px] text-slate-600 font-bold">
                                {new Date(sh.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(sh.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs text-slate-400">
                        No scan history recorded on this device yet.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Panel Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminRegisteredDevices;
