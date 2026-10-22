import React from 'react';
import {
  History,
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Trash2,
  Play,
  RotateCcw,
} from 'lucide-react';
import { ActivityLogItem } from '../types';

interface ActivityLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ActivityLogItem[];
  onClearLogs: () => void;
  onCancelAction?: (id: string) => void;
}

export const ActivityLogDrawer: React.FC<ActivityLogDrawerProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  onCancelAction,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-fade-in font-rajdhani">
      <div className="relative w-full max-w-md h-full bg-[#020b1c] border-l-2 border-cyan-400 p-5 shadow-[-10px_0_30px_rgba(0,240,255,0.2)] text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <h2 className="font-orbitron font-bold text-base tracking-wider text-cyan-200">
              AUDIT & ACTIVITY LOG
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Log List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 font-mono-tech text-xs">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-cyan-400/50 space-y-2">
              <Clock className="w-8 h-8 mx-auto opacity-40 text-cyan-400" />
              <p>No actions logged yet in this session.</p>
            </div>
          ) : (
            logs.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded bg-cyan-950/40 border border-cyan-500/20 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white font-rajdhani text-sm">
                    {item.action}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      item.status === 'SUCCESS'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : item.status === 'CANCELLED'
                        ? 'bg-slate-800 text-slate-300'
                        : item.status === 'DENIED'
                        ? 'bg-red-950 text-red-300 border border-red-500/40'
                        : item.status === 'SIMULATED'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                        : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="text-[11px] text-cyan-300/80 truncate">
                  {typeof item.details === 'object'
                    ? JSON.stringify(item.details)
                    : item.details}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-cyan-500/10 text-[10px] text-slate-400">
                  <span>{item.timestamp}</span>
                  {item.status === 'PENDING' && onCancelAction && (
                    <button
                      onClick={() => onCancelAction(item.id)}
                      className="text-red-400 hover:underline"
                    >
                      CANCEL ACTION
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-cyan-500/30 flex items-center justify-between">
          <button
            onClick={onClearLogs}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>CLEAR LOG</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-rajdhani font-bold text-xs"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
