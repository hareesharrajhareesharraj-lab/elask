import React, { useState } from 'react';
import {
  Mic,
  ShieldCheck,
  AlertTriangle,
  Monitor,
  Zap,
  CheckCircle,
  Volume2,
  X,
  ExternalLink,
} from 'lucide-react';

interface AutoWakeSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnableAutoWake: () => Promise<boolean>;
  isCompanionOnline: boolean;
}

export const AutoWakeSetupModal: React.FC<AutoWakeSetupModalProps> = ({
  isOpen,
  onClose,
  onEnableAutoWake,
  isCompanionOnline,
}) => {
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleGrant = async () => {
    setIsRequesting(true);
    setErrorMessage('');
    try {
      const success = await onEnableAutoWake();
      if (success) {
        onClose();
      } else {
        setErrorMessage(
          'Microphone permission was denied or not detected. Please click the camera/mic icon in your browser address bar to allow microphone access.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initialize microphone access.');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in font-rajdhani select-none">
      <div className="relative w-full max-w-lg bg-[#02091d] border-2 border-cyan-400/80 rounded-xl shadow-[0_0_50px_rgba(0,240,255,0.35)] overflow-hidden text-slate-100 flex flex-col">
        {/* Hologram Accent Lines */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-600" />
        <div className="hud-corner-tl !border-cyan-300" />
        <div className="hud-corner-tr !border-cyan-300" />
        <div className="hud-corner-bl !border-cyan-300" />
        <div className="hud-corner-br !border-cyan-300" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-cyan-500/25 bg-[#03102c]/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <Mic className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <h2 className="font-orbitron font-bold text-base sm:text-lg text-cyan-100 tracking-wider">
                ENABLE AUTO LISTEN
              </h2>
              <p className="text-xs text-cyan-400/80 font-mono-tech">
                HANDS-FREE WAKE ENGINE: "ELASK" (ஏலாஸ்க்)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-cyan-400/70 hover:text-white hover:bg-cyan-950/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-sm">
          {/* Privacy & Architecture Guarantee */}
          <div className="p-3.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase font-orbitron">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              100% Local Processing & Privacy Architecture
            </div>
            <p className="text-xs text-cyan-200/90 leading-relaxed font-chakra">
              While waiting for the wake word, audio is processed entirely on your local machine.
              <strong className="text-white"> Zero idle microphone audio is sent to Gemini.</strong> Network requests are only initiated after "ELASK" or "ஏலாஸ்க்" is detected locally.
            </p>
          </div>

          {/* Key Features List */}
          <div className="space-y-2.5 text-xs font-chakra">
            <div className="flex items-start gap-2.5 text-slate-300">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Always-On Hands-Free Loop:</strong> Automatically starts listening whenever you open ELASK. Say "ELASK open Edge" or just "ELASK" to begin.
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-slate-300">
              <Volume2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Echo & Self-Trigger Prevention:</strong> Microphone input is automatically muted while ELASK is speaking plus a cooldown buffer, so ELASK never triggers itself.
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-slate-300">
              <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Low-Latency Gemini Live:</strong> Short audio commands stream directly into Gemini's low-latency engine with automatic fallback handling.
              </div>
            </div>
          </div>

          {/* Browser Suspension vs Companion Notice */}
          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/40 text-xs space-y-1.5 font-chakra">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold font-orbitron text-[11px] uppercase">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              Browser Tab vs Background Companion Behavior
            </div>
            <p className="text-amber-200/90 leading-relaxed">
              <strong>In-Browser Listening:</strong> Runs while this tab is active. If the tab is minimized or suspended by your browser, audio listening may pause.
            </p>
            <p className="text-amber-200/80 leading-relaxed">
              <strong>Background Listening:</strong> To listen 24/7 even when this browser tab is closed, run the Windows Companion (<code className="text-amber-100 bg-amber-900/50 px-1 py-0.5 rounded">start-companion.bat</code>). It provides an offline native listener with a clear OFF switch.
            </p>
            <div className="text-[11px] font-mono-tech text-amber-400/90 pt-1">
              Windows Companion Status: {isCompanionOnline ? '🟢 ONLINE & SYNCED' : '🟠 OFFLINE (Browser mode active)'}
            </div>
          </div>

          {/* Error Message if Denied */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-500 text-xs text-red-200 font-chakra flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Microphone Access Error:</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-cyan-500/25 bg-[#03102c]/60 flex flex-col sm:flex-row gap-2.5 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/40 font-semibold text-xs tracking-wider transition-all"
          >
            KEEP MANUAL PUSH-TO-TALK
          </button>

          <button
            onClick={handleGrant}
            disabled={isRequesting}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-orbitron font-bold text-xs tracking-wider shadow-[0_0_20px_rgba(0,240,255,0.5)] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Mic className="w-4 h-4" />
            <span>{isRequesting ? 'REQUESTING PERMISSION...' : 'ENABLE AUTO LISTEN'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
