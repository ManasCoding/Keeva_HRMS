import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Users,
  Clock,
  ClipboardList,
  Calendar,
  FileSignature,
  FileText,
  ShieldCheck,
  LogOut,
  Bell,
  Menu,
  X
} from 'lucide-react';

const EmployeeLayout = ({ children, title, subtitle, hideHeader = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [user, setUser] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {
        name: 'Employee',
        email: 'employee@company.com',
        slug: ''
      };
    } catch (e) {
      return { name: 'Employee', email: 'employee@company.com', slug: '' };
    }
  });

  const slug = user?.slug || '';

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', icon: <LayoutDashboard size={18} />, path: `/employee/${slug}/dashboard` },
    { name: 'Profile', icon: <User size={18} />, path: `/employee/${slug}/profile` },
    { name: 'Directory', icon: <Users size={18} />, path: `/employee/${slug}/directory` },
    { name: 'Hourly Report', icon: <Clock size={18} />, path: `/employee/${slug}/schedule` },
    { name: 'Attendance', icon: <ClipboardList size={18} />, path: `/employee/${slug}/attendance` },
    { name: 'Leave', icon: <Calendar size={18} />, path: `/employee/${slug}/apply-leave` },
    { name: 'Resignation', icon: <FileSignature size={18} />, path: `/employee/${slug}/resignation` },
    { name: 'Payslip', icon: <FileText size={18} />, path: `/employee/${slug}/payslip` },
    { name: 'Company Policy', icon: <ShieldCheck size={18} />, path: `/employee/${slug}/policy` },
    { name: 'Site Visits', icon: <ClipboardList size={18} />, path: `/employee/${slug}/site-visits` },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0f172a] text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden">
            <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold tracking-tight">Oditech</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar - Fixed on both desktop and mobile, exact like Admin */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#0f172a] text-white p-6 flex flex-col transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="hidden md:flex flex-col items-center gap-4 mb-10 px-2 text-center mt-2">
          <div className="w-20 h-20 bg-black rounded-[1.25rem] flex items-center justify-center overflow-hidden shadow-lg shadow-black/20">
            <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-cover p-1" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white mb-1">Oditech Global</h2>
            <p className="text-[11px] text-[#3b82f6] font-bold uppercase tracking-[0.15em]">Employee Portal</p>
            <p className="text-[12px] text-[#64748b] font-medium truncate mt-1.5">{user?.email || 'employee@oditechglobal.com'}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar pt-16 md:pt-0">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path || (link.path !== `/employee/${slug}` && location.pathname.startsWith(link.path + '/'));
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                  ? 'bg-white text-primary shadow-lg shadow-white/5 font-semibold'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
              >
                {link.icon}
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-400 hover:text-white hover:bg-rose-500/10 transition-all mb-4"
          >
            <LogOut size={18} />
            Logout
          </button>

          {/* Developer Credit */}
          <div className="px-4 py-2 border-t border-white/5 mt-2">
            <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.1em] leading-relaxed">
              Designed & Developed by <br />
              <span className="text-white/40">Manas Kumar Gumansingh</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content — offset by sidebar width on desktop */}
      <main className={`flex-1 h-screen overflow-y-auto bg-[#f8fafc] md:ml-64 ${hideHeader ? 'p-4 md:p-6 lg:p-6 pt-20 md:pt-4' : 'p-4 md:p-8 lg:p-10 pt-20 md:pt-8 lg:pt-10'}`}>
        {!hideHeader && title && (
          <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 md:mb-10 gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-text-main leading-tight">{title}</h1>
              {subtitle && <p className="text-text-muted text-sm mt-1">{subtitle}</p>}
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-4 sm:pt-0 border-border">
              <button className="p-2.5 bg-surface text-text-muted rounded-xl border border-border hover:bg-slate-50 transition-all shadow-sm">
                <Bell size={20} />
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-border">
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-bold text-text-main">{user?.name || 'Employee'}</p>
                  <p className="text-xs text-text-muted">Employee</p>
                </div>
                <div className="w-10 h-10 bg-slate-200 rounded-full border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                  <img
                    src={user?.profileImage || "/logo.jpeg"}
                    alt={user?.name || "User"}
                    className="w-full h-full object-cover p-0.5 bg-white"
                    onError={(e) => { e.target.src = "/logo.jpeg"; }}
                  />
                </div>
              </div>
            </div>
          </header>
        )}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>

        {/* Footer Credit */}
        <footer className="mt-20 pb-10 border-t border-slate-200 pt-8 text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
            Designed & Developed by <span className="text-slate-400">Manas Kumar Gumansingh</span>
          </p>
        </footer>
        <div className="py-6 text-center">
          <p className="text-[11px] font-medium text-slate-400">© 2026 Oditech Global. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
};

export default EmployeeLayout;
