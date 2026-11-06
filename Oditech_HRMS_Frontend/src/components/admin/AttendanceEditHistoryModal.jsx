import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, User } from 'lucide-react';
import api from '../../services/api';

const AttendanceEditHistoryModal = ({ attendanceId, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/admin/attendance/${attendanceId}/edit-history`);
        if (res.data.success) {
          setHistory(res.data.history || []);
        }
      } catch (err) {
        console.error('Failed to fetch edit history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [attendanceId]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-800">Edit History</h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attendance Audit Log</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto pr-2 space-y-6 flex-1 custom-scrollbar">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-wider">
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-wider">
              No manual edits found.
            </div>
          ) : (
            history.map((record, index) => (
              <div key={record._id || index} className="relative pl-4 border-l-2 border-slate-100">
                <div className="absolute w-2 h-2 bg-red-500 rounded-full -left-[5px] top-1 ring-4 ring-white" />
                
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                    <User size={14} className="text-slate-400" />
                    {record.editedByName}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    <Calendar size={12} />
                    {new Date(record.editedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    <span className="mx-1">•</span>
                    <Clock size={12} />
                    {new Date(record.editedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {record.changes?.checkIn && (
                    <div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Check-In</span>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <span className="line-through text-slate-400">{record.changes.checkIn.oldValue || '--:--'}</span>
                        <span className="text-slate-300">→</span>
                        <span className="text-emerald-600">{record.changes.checkIn.newValue || '--:--'}</span>
                      </div>
                    </div>
                  )}
                  {record.changes?.checkOut && (
                    <div className={record.changes.checkIn ? "pt-2 border-t border-slate-200" : ""}>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Check-Out</span>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <span className="line-through text-slate-400">{record.changes.checkOut.oldValue || '--:--'}</span>
                        <span className="text-slate-300">→</span>
                        <span className="text-emerald-600">{record.changes.checkOut.newValue || '--:--'}</span>
                      </div>
                    </div>
                  )}
                  {(!record.changes?.checkIn && !record.changes?.checkOut) && (
                    <div className="text-xs text-slate-500 italic">No visible changes recorded.</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceEditHistoryModal;
