import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Users,
  RefreshCw,
  ExternalLink,
  Clock,
  ArrowUpRight,
  User,
  Activity
} from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout';
import QrAttendanceTabs from '../components/qr/QrAttendanceTabs';
import api from '../services/api';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, subtext, icon, color = 'emerald' }) => {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100'
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-start justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">{title}</p>
        <p className="text-2xl font-black text-slate-800 tracking-tight">{value}</p>
        {subtext && <p className="text-xs font-medium text-slate-500 mt-1">{subtext}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${colorMap[color] || colorMap.emerald}`}>
        {icon}
      </div>
    </div>
  );
};

const AdminQrDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    today: '',
    qrCheckIns: 0,
    qrCheckOuts: 0,
    totalRegisteredDevices: 0,
    activeDevicesCount: 0,
    blockedDevicesCount: 0,
    unregisteredEmployeesCount: 0,
    totalEmployeesCount: 0,
    recentScans: []
  });

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/qr-attendance/admin/dashboard-stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load QR dashboard stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <AdminLayout
      title="QR Attendance"
      subtitle="Smart QR attendance terminal, mobile device authorizations, and live activity feed"
    >
      <div className="space-y-6">
        {/* Navigation Tabs to Switch Views */}
        <QrAttendanceTabs activeTab="dashboard" />

        {/* Top Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Live System Status</p>
              <p className="text-sm font-black text-slate-800">Smart QR Terminal: Active & Operating</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-primary' : ''} />
              <span>Refresh</span>
            </button>

            <Link
              to="/admin/qr-attendance/code"
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <QrCode size={15} />
              <span>Display Office QR Code</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's QR Check-Ins"
            value={stats.qrCheckIns}
            subtext="First daily scans today"
            icon={<CheckCircle2 size={24} />}
            color="emerald"
          />

          <StatCard
            title="Today's QR Check-Outs"
            value={stats.qrCheckOuts}
            subtext="Second daily scans today"
            icon={<LogOut size={24} />}
            color="blue"
          />

          <StatCard
            title="Active Mobile Devices"
            value={stats.activeDevicesCount}
            subtext={`Out of ${stats.totalRegisteredDevices} bound devices`}
            icon={<Smartphone size={24} />}
            color="purple"
          />

          <StatCard
            title="Unregistered Employees"
            value={stats.unregisteredEmployeesCount}
            subtext="Eligible for first-time login scan"
            icon={<Users size={24} />}
            color={stats.unregisteredEmployeesCount > 0 ? 'amber' : 'emerald'}
          />
        </div>

        {/* Quick Management Links Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/admin/qr-attendance/code"
            className="group p-5 bg-gradient-to-br from-slate-900 to-[#0f172a] rounded-2xl text-white shadow-sm border border-slate-800 flex items-center justify-between hover:border-emerald-500/50 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-105 transition-transform">
                <QrCode size={24} />
              </div>
              <div>
                <h3 className="font-black text-sm text-white group-hover:text-emerald-400 transition-colors">
                  Office QR Code Generator
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Launch the live rotating signed QR code for display, download, or poster printing
                </p>
              </div>
            </div>
            <ArrowUpRight size={20} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </Link>

          <Link
            to="/admin/qr-attendance/devices"
            className="group p-5 bg-white rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between hover:border-primary/50 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                <Smartphone size={24} />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-800 group-hover:text-primary transition-colors">
                  Registered Devices Management
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  View, filter, block, reset or unlink employee mobile devices ({stats.blockedDevicesCount} currently blocked)
                </p>
              </div>
            </div>
            <ArrowUpRight size={20} className="text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </Link>
        </div>

        {/* Live Attendance Activity Table */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800">Recent QR Attendance Scans</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Real-time audit log of mobile camera scans</p>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
              Auto-refreshes every 30s
            </span>
          </div>

          {stats.recentScans.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pr-4">Employee</th>
                    <th className="pb-3 pr-4">Action</th>
                    <th className="pb-3 pr-4">Scan Time</th>
                    <th className="pb-3 pr-4">Mobile Device</th>
                    <th className="pb-3 pr-4">OS</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.recentScans.map((scan, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold overflow-hidden shrink-0">
                            {scan.profileImage ? (
                              <img src={scan.profileImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User size={14} />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{scan.employeeName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{scan.empCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-black text-[10px] ${
                          scan.action === 'CHECK-IN'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : scan.action === 'CHECK-OUT'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {scan.action}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono font-bold text-slate-600">
                        {new Date(scan.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                      </td>
                      <td className="py-3 pr-4 font-medium text-slate-600 truncate max-w-[150px]">
                        {scan.deviceModel}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                          {scan.os}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                          <CheckCircle2 size={13} />
                          <span>{scan.status || 'Success'}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs font-medium">
              No QR scans recorded yet today.
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminQrDashboard;
