import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Calendar, Clock, Hourglass, ArrowRight, User, CheckCircle } from 'lucide-react';

const CheckOutSuccessPopup = ({
  isOpen = true,
  onClose,
  employee = {},
  attendance = {},
  greeting = 'GOOD EVENING',
  autoCloseSeconds = 10
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(autoCloseSeconds);

  // Auto-close countdown timer
  useEffect(() => {
    if (!isOpen) return;
    setSecondsRemaining(autoCloseSeconds);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onClose) onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, autoCloseSeconds, onClose]);

  if (!isOpen) return null;

  const checkOutTimeDisplay = attendance.checkOutTime || (attendance.checkOut ? new Date(attendance.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--');
  const dateDisplay = attendance.date || new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const workHours = attendance.workHours || '0h 0m';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-blue-100 overflow-hidden text-slate-800"
        >
          {/* Top Decorative Banner */}
          <div className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 pt-8 text-white text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full blur-xl -ml-10 -mb-10 pointer-events-none" />

            {/* Oditech HRMS Tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[11px] font-black uppercase tracking-widest text-blue-100 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-ping" />
              Oditech Global HRMS
            </div>

            {/* Greeting Header */}
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xs font-black tracking-widest uppercase text-blue-200"
            >
              {greeting}!
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-2xl font-black tracking-tight text-white mt-0.5"
            >
              Have a Great Evening, {employee.fullName || 'Employee'}! 👋
            </motion.h2>

            <p className="text-xs font-medium text-blue-100/90 mt-1">
              Your check-out has been successfully recorded.
            </p>

            {/* Animated Center Check-out Icon */}
            <div className="mt-5 flex justify-center">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                className="w-16 h-16 rounded-2xl bg-white text-blue-600 shadow-xl flex items-center justify-center border-4 border-blue-400/40"
              >
                <LogOut size={32} className="text-blue-600 stroke-[2.5]" />
              </motion.div>
            </div>
          </div>

          {/* Employee & Attendance Details */}
          <div className="p-6 space-y-4">
            {/* Employee ID & Photo Card */}
            <div className="flex items-center gap-3.5 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                {employee.profileImage ? (
                  <img src={employee.profileImage} alt={employee.fullName} className="w-full h-full object-cover" />
                ) : (
                  <User size={24} className="text-blue-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-800 truncate">{employee.fullName || 'Employee'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold text-slate-500 tracking-wide font-mono">
                    ID: {employee.empCode || '—'}
                  </span>
                  {employee.department && (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-md">
                      {employee.department}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Attendance Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</p>
                  <p className="text-xs font-black text-slate-700">{dateDisplay}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Check-Out</p>
                  <p className="text-xs font-black text-slate-800">{checkOutTimeDisplay}</p>
                </div>
              </div>
            </div>

            {/* Work Duration & Status Banner */}
            <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100/80">
              <div className="flex items-center gap-2">
                <Hourglass size={18} className="text-blue-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Hours</p>
                  <p className="text-sm font-black text-blue-900">{workHours}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 border-l border-blue-200/60 pl-3">
                <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Day Status</p>
                  <p className="text-xs font-black text-emerald-700 uppercase">{attendance.status || 'Completed'}</p>
                </div>
              </div>
            </div>

            {/* Motivational message */}
            <p className="text-center text-xs font-medium text-slate-500 italic pt-1">
              "Thank you for your hard work today. Have a safe journey home!"
            </p>

            {/* Continue Button & Auto-close Bar */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>CONTINUE</span>
                <ArrowRight size={16} />
              </button>

              <div className="flex items-center justify-between mt-2.5 px-1 text-[11px] text-slate-400 font-medium">
                <span>Closing automatically</span>
                <span className="font-bold text-blue-600">{secondsRemaining}s</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-blue-500 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${(secondsRemaining / autoCloseSeconds) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CheckOutSuccessPopup;
