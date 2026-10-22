import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  X,
  Play,
  Lock,
  ExternalLink,
  MessageSquare,
  Monitor,
  ZoomIn,
} from 'lucide-react';
import { ActionPayload } from '../types';

interface ActionConfirmModalProps {
  action: ActionPayload | null;
  isOpen: boolean;
  onConfirm: (pin?: string) => void;
  onCancel: () => void;
  pinRequired: boolean;
  correctPin: string;
  isCompanionOnline: boolean;
}

export const ActionConfirmModal: React.FC<ActionConfirmModalProps> = ({
  action,
  isOpen,
  onConfirm,
  onCancel,
  pinRequired,
  correctPin,
  isCompanionOnline,
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(8);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setPinError('');
      setCountdown(8);
      setIsPaused(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isPaused || pinRequired) return;

    if (countdown <= 0) {
      onConfirm();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isOpen, countdown, isPaused, pinRequired, onConfirm]);

  if (!isOpen || !action) return null;

  const handleManualConfirm = () => {
    if (pinRequired) {
      if (pinInput !== correctPin) {
        setPinError('Incorrect Owner PIN. Please enter the security PIN.');
        return;
      }
    }
    onConfirm(pinInput);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-rajdhani">
      <div className="relative w-full max-w-lg bg-[#020b1c] border-2 border-cyan-400 p-6 rounded-lg shadow-[0_0_40px_rgba(0,240,255,0.35)] text-slate-100">
        {/* Hologram Corner Accents */}
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h2 className="font-orbitron font-bold text-base tracking-wider text-cyan-200">
              OWNER ACTION AUTHORIZATION
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Details Box */}
        <div className="mt-4 p-4 rounded bg-cyan-950/40 border border-cyan-500/30 space-y-3 font-mono-tech text-xs">
          <div className="flex items-center justify-between text-cyan-400 text-sm">
            <span className="font-bold flex items-center gap-1.5 uppercase">
              {action.type === 'LAUNCH_APP' && <Monitor className="w-4 h-4" />}
              {action.type === 'OPEN_URL' && <ExternalLink className="w-4 h-4" />}
              {action.type === 'WHATSAPP_MESSAGE' && <MessageSquare className="w-4 h-4" />}
              {action.type === 'ZOOM' && <ZoomIn className="w-4 h-4" />}
              ACTION: {action.type}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                isCompanionOnline
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                  : 'bg-orange-950 text-orange-300 border border-orange-500/40'
              }`}
            >
              {isCompanionOnline ? 'COMPANION LINKED' : 'REQUIRES COMPANION'}
            </span>
          </div>

          {action.appName && (
            <div className="flex justify-between py-1 border-b border-cyan-500/10">
              <span className="text-cyan-300">Target Application:</span>
              <span className="font-bold text-white text-sm">{action.appName}</span>
            </div>
          )}

          {action.url && (
            <div className="flex flex-col gap-1 py-1 border-b border-cyan-500/10">
              <span className="text-cyan-300">Destination URL (Edge):</span>
              <span className="text-cyan-200 underline break-all">{action.url}</span>
            </div>
          )}

          {action.recipient && (
            <div className="flex justify-between py-1 border-b border-cyan-500/10">
              <span className="text-cyan-300">WhatsApp Recipient:</span>
              <span className="font-bold text-white text-sm">{action.recipient}</span>
            </div>
          )}

          {action.message && (
            <div className="py-1">
              <span className="text-cyan-300 block mb-1">Message Content to Send:</span>
              <div className="p-2.5 rounded bg-black/60 border border-cyan-500/30 text-white italic font-rajdhani text-sm">
                "{action.message}"
              </div>
              <p className="text-[10px] text-amber-300/80 mt-1">
                Notice: Will open in WhatsApp with text prefilled for your review. ELASK will not claim sent until you click send.
              </p>
            </div>
          )}

          {action.zoomDirection && (
            <div className="flex justify-between py-1 border-b border-cyan-500/10">
              <span className="text-cyan-300">Zoom Adjustment:</span>
              <span className="font-bold text-white uppercase text-sm">
                {action.zoomDirection} ({action.targetWindow || 'Active Window'})
              </span>
            </div>
          )}

          {action.explanation && (
            <div className="text-slate-400 text-[11px] pt-1">
              {action.explanation}
            </div>
          )}
        </div>

        {/* PIN Security input if owner enabled PIN requirement */}
        {pinRequired && (
          <div className="mt-4 p-3 rounded bg-amber-950/30 border border-amber-500/40">
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-mono-tech mb-2">
              <Lock className="w-3.5 h-3.5" />
              <span>OWNER PIN REQUIRED (Security Guard):</span>
            </div>
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError('');
              }}
              placeholder="Enter 4-digit PIN (default: 1234)"
              className="w-full px-3 py-2 bg-black/70 border border-amber-500/50 rounded text-center text-lg tracking-widest text-amber-200 focus:outline-none focus:border-amber-300 font-mono-tech"
            />
            {pinError && (
              <p className="text-xs text-red-400 mt-1 font-mono-tech">{pinError}</p>
            )}
          </div>
        )}

        {/* Countdown notice when PIN not required */}
        {!pinRequired && (
          <div className="mt-3 flex items-center justify-between text-xs font-mono-tech text-cyan-400/80">
            <span>
              Auto-executing in <strong className="text-cyan-200">{countdown}s</strong>
            </span>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="text-cyan-300 hover:underline"
            >
              {isPaused ? 'RESUME TIMER' : 'PAUSE TIMER'}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-cyan-500/30">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded border border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white hover:border-slate-500 font-rajdhani font-semibold text-sm transition-all"
          >
            CANCEL / REJECT
          </button>
          <button
            onClick={handleManualConfirm}
            className="px-5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-rajdhani font-bold text-sm shadow-[0_0_15px_rgba(0,240,255,0.4)] flex items-center gap-2 active:scale-95 transition-all"
          >
            <CheckCircle className="w-4 h-4" />
            <span>CONFIRM & EXECUTE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
