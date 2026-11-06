import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Smartphone, QrCode } from 'lucide-react';

const QrAttendanceTabs = ({ activeTab }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard Overview',
      icon: <LayoutDashboard size={16} />,
      path: '/admin/qr-attendance'
    },
    {
      id: 'devices',
      label: 'Registered Devices',
      icon: <Smartphone size={16} />,
      path: '/admin/qr-attendance/devices'
    },
    {
      id: 'code',
      label: 'QR Code Management',
      icon: <QrCode size={16} />,
      path: '/admin/qr-attendance/code'
    }
  ];

  const currentTab = activeTab || (
    location.pathname.startsWith('/admin/qr-attendance/devices')
      ? 'devices'
      : location.pathname.startsWith('/admin/qr-attendance/code')
      ? 'code'
      : 'dashboard'
  );

  return (
    <div className="flex items-center gap-2 border-b border-slate-200/80 overflow-x-auto no-scrollbar pb-1 mb-6">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigate(tab.path)}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-t-xl text-xs font-bold transition-all whitespace-nowrap border-b-2 -mb-1 cursor-pointer ${
              isActive
                ? 'border-emerald-500 text-emerald-600 bg-emerald-50/70 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <span className={isActive ? 'text-emerald-600' : 'text-slate-400'}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default QrAttendanceTabs;
