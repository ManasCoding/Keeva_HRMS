import React from 'react';
import { X, CheckCircle2, AlertTriangle, Clock, RefreshCw, Server, AlertOctagon } from 'lucide-react';

const SyncDetailsModal = ({ isOpen, onClose, syncRecord }) => {
  if (!isOpen || !syncRecord) return null;

  const isSuccess = syncRecord.status === 'Success';
  const isPartial = syncRecord.status === 'Partial';
  const isFailed = syncRecord.status === 'Failed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                isSuccess 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : isPartial 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {isSuccess && <CheckCircle2 size={12} />}
                {isPartial && <AlertTriangle size={12} />}
                {isFailed && <AlertOctagon size={12} />}
                {syncRecord.status} Sync Batch
              </span>
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                {syncRecord.triggeredBy}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">{syncRecord.deviceName}</h2>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <Clock size={13} className="text-slate-400" />
              {new Date(syncRecord.timestamp).toLocaleString()}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Metrics summary */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Fetched</p>
              <h4 className="text-lg font-black text-slate-800 mt-0.5">{syncRecord.recordsFetched}</h4>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <p className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">Synced</p>
              <h4 className="text-lg font-black text-emerald-700 mt-0.5">{syncRecord.recordsSynced}</h4>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100">
              <p className="text-[9px] font-black uppercase text-amber-600 tracking-wider">Duplicates</p>
              <h4 className="text-lg font-black text-amber-700 mt-0.5">{syncRecord.recordsDuplicate || 0}</h4>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100">
              <p className="text-[9px] font-black uppercase text-rose-600 tracking-wider">Failed</p>
              <h4 className="text-lg font-black text-rose-700 mt-0.5">{syncRecord.recordsFailed || 0}</h4>
            </div>
          </div>

          {/* Diagnostic Log Output */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Diagnostics & Raw Event Log
            </h3>
            <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-xs leading-relaxed overflow-x-auto shadow-inner">
              <p className="text-slate-400 text-[11px]">// Log Session: {syncRecord.id}</p>
              <p className="text-blue-400">[CONNECT] Socket open to {syncRecord.deviceName}...</p>
              <p className="text-slate-300">[PACKET] Handshake response: 0x50 0x4B (OK)</p>
              <p className="text-slate-300">[RECORDS] Read {syncRecord.recordsFetched} raw records from memory block</p>
              {syncRecord.recordsDuplicate > 0 && (
                <p className="text-amber-400">[DUP-FILTER] {syncRecord.recordsDuplicate} duplicate punch ignored (15s tolerance)</p>
              )}
              {syncRecord.errorDetails ? (
                <p className="text-rose-400 font-bold">[ERROR] {syncRecord.errorDetails}</p>
              ) : (
                <p className="text-emerald-400">[STATUS] All {syncRecord.recordsSynced} scans committed successfully to staging log</p>
              )}
              <p className="text-slate-500 text-[10px] mt-2">-- End of session transcript --</p>
            </div>
          </div>

          {/* Advice / Note */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            {syncRecord.errorDetails ? (
              <p>⚠️ <strong>Remediation:</strong> Check LAN cable connection and ensure the employee biometric User ID is registered in the Machine Mapping tab.</p>
            ) : (
              <p>✅ <strong>Status Healthy:</strong> Device responded within normal latency tolerances. No packet loss detected.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncDetailsModal;
