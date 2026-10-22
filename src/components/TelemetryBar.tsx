import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Radio,
  Sliders,
  History,
  Terminal,
  HelpCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CompanionState, LanguageMode, WakeWordState, VoiceInputState } from '../types';

interface TelemetryBarProps {
  companionState: CompanionState;
  onEmergencyStop: () => void;
  isMicActive: boolean;
  isCameraActive: boolean;
  isSoundMuted: boolean;
  languageMode: LanguageMode;
  autoWakeEnabled: boolean;
  wakeWordState?: WakeWordState;
  voiceState?: VoiceInputState;
  onOpenAutoWakeSetup: () => void;
  onTogglePauseWake: () => void;
  onLanguageChange: (lang: LanguageMode) => void;
  onOpenSettings: () => void;
  onOpenActivityLog: () => void;
  onOpenCompanionModal: () => void;
  onToggleSound: () => void;
  onToggleCamera: () => void;
  onToggleMic: () => void;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  companionState,
  onEmergencyStop,
  isMicActive,
  isCameraActive,
  isSoundMuted,
  languageMode,
  autoWakeEnabled,
  wakeWordState,
  voiceState,
  onOpenAutoWakeSetup,
  onTogglePauseWake,
  onLanguageChange,
  onOpenSettings,
  onOpenActivityLog,
  onOpenCompanionModal,
  onToggleSound,
  onToggleCamera,
  onToggleMic,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-[#030919]/80 border-b border-cyan-500/25 px-3 sm:px-6 py-2.5 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs font-mono-tech select-none z-30">
      {/* Left: Branding & Core Telemetry */}
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
          <span className="font-orbitron font-bold text-sm tracking-wider text-cyan-200">
            ELASK
          </span>
          <span className="text-cyan-400/60 hidden sm:inline">v3.8-HUD</span>
        </div>

        {/* Windows Companion Bridge status */}
        <button
          onClick={onOpenCompanionModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-all text-[11px] ${
            companionState.online
              ? 'bg-cyan-950/40 border-cyan-400/40 text-cyan-300 hover:border-cyan-300'
              : 'bg-orange-950/40 border-orange-500/50 text-orange-300 hover:border-orange-400 animate-pulse'
          }`}
          title="Click to view Windows Companion status and setup"
        >
          <Radio className="w-3.5 h-3.5" />
          <span>WIN-BRIDGE:</span>
          <span className="font-bold">
            {companionState.online
              ? `ONLINE (${companionState.latencyMs || 4}ms)`
              : 'NEEDS COMPANION'}
          </span>
        </button>

        {/* Auto Listen Setup Button or Canonical Status Badge */}
        {voiceState === 'ENABLE MICROPHONE' || !autoWakeEnabled ? (
          <button
            onClick={onOpenAutoWakeSetup}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-orbitron font-bold text-[11px] shadow-[0_0_12px_rgba(0,240,255,0.6)] animate-pulse transition-all active:scale-95"
            title="Setup hands-free auto-listening for 'ELASK'"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>ENABLE AUTO LISTEN</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] font-mono-tech ${
                voiceState === 'PAUSED' || wakeWordState === 'PAUSED'
                  ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
                  : voiceState === 'HEARING COMMAND' || wakeWordState === 'CAPTURING'
                  ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                  : voiceState === 'PROCESSING'
                  ? 'bg-sky-950/80 border-sky-400 text-sky-200'
                  : 'bg-cyan-950/60 border-cyan-400/60 text-cyan-200 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  voiceState === 'PAUSED' || wakeWordState === 'PAUSED'
                    ? 'bg-amber-400'
                    : voiceState === 'HEARING COMMAND' || wakeWordState === 'CAPTURING'
                    ? 'bg-amber-400 animate-ping'
                    : voiceState === 'PROCESSING'
                    ? 'bg-sky-400 animate-pulse'
                    : 'bg-cyan-400 animate-pulse'
                }`}
              />
              <span className="font-bold">
                {voiceState ||
                  (wakeWordState === 'PAUSED'
                    ? 'PAUSED'
                    : wakeWordState === 'CAPTURING'
                    ? 'HEARING COMMAND'
                    : 'LISTENING FOR ELASK')}
              </span>
            </div>

            {/* Top Bar Quick Pause/Resume or Stop button */}
            {voiceState === 'LISTENING FOR ELASK' || voiceState === 'HEARING COMMAND' ? (
              <button
                onClick={onTogglePauseWake}
                className="px-2 py-1 rounded text-[10px] font-orbitron font-bold border bg-red-950/80 border-red-500/60 text-red-300 hover:bg-red-900 transition-all"
                title="Stop listening [ESC]"
              >
                ⏹ STOP
              </button>
            ) : voiceState === 'PAUSED' ? (
              <button
                onClick={onTogglePauseWake}
                className="px-2 py-1 rounded text-[10px] font-orbitron font-bold border bg-emerald-950/80 border-emerald-400 text-emerald-300 hover:bg-emerald-900 transition-all"
                title="Resume auto-listening"
              >
                ▶ RESUME
              </button>
            ) : null}
          </div>
        )}

        {/* Real-time Clock */}
        <div className="hidden xl:flex items-center gap-1 text-cyan-300/80 tracking-widest text-[11px]">
          <span className="text-cyan-500">SYS.CLK:</span>
          <span className="font-bold">{timeStr || '00:00:00'}</span>
        </div>
      </div>

      {/* Center: Language Switcher */}
      <div className="flex items-center gap-1 bg-cyan-950/50 p-0.5 rounded border border-cyan-500/30">
        {(['auto', 'tamil', 'english', 'tanglish'] as LanguageMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onLanguageChange(mode)}
            className={`px-2 py-0.5 rounded text-[11px] font-rajdhani font-semibold transition-all uppercase ${
              languageMode === mode
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(0,240,255,0.5)]'
                : 'text-cyan-300/70 hover:text-cyan-100 hover:bg-cyan-900/40'
            }`}
          >
            {mode === 'auto'
              ? 'AUTO'
              : mode === 'tamil'
              ? 'தமிழ் (TAMIL)'
              : mode === 'tanglish'
              ? 'TANGLISH'
              : 'ENGLISH'}
          </button>
        ))}
      </div>

      {/* Right: Controls & Emergency Stop */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Mic Status & Toggle Button */}
        <button
          onClick={onToggleMic}
          className={`flex items-center gap-1 px-2 py-1 rounded border transition-all text-[11px] ${
            isMicActive
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.4)]'
              : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-cyan-300'
          }`}
          title={isMicActive ? 'Microphone Active (Local Wake Armed)' : 'Microphone Inactive'}
        >
          {isMicActive ? <Mic className="w-3.5 h-3.5 text-cyan-400" /> : <MicOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isMicActive ? 'MIC ON' : 'MIC OFF'}</span>
        </button>

        {/* Hand Gesture Camera Toggle */}
        <button
          onClick={onToggleCamera}
          className={`p-1.5 rounded border transition-all ${
            isCameraActive
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.4)]'
              : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-cyan-300'
          }`}
          title={isCameraActive ? 'Gesture Camera Active [H]' : 'Gesture Camera Off'}
        >
          {isCameraActive ? <Video className="w-3.5 h-3.5 text-cyan-400" /> : <VideoOff className="w-3.5 h-3.5" />}
        </button>

        {/* Sound Mute Toggle */}
        <button
          onClick={onToggleSound}
          className={`p-1.5 rounded border transition-all ${
            !isSoundMuted
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
              : 'bg-slate-900/60 border-slate-700 text-slate-400'
          }`}
          title={isSoundMuted ? 'Sound Muted' : 'Sound Effects & Voice Enabled [M]'}
        >
          {isSoundMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        {/* Activity Log Drawer Button */}
        <button
          onClick={onOpenActivityLog}
          className="p-1.5 rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/40 transition-all"
          title="Open Action Activity Log"
        >
          <History className="w-3.5 h-3.5" />
        </button>

        {/* Settings Drawer Button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/40 transition-all"
          title="Open ELASK Settings & Approved Apps"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>

        {/* Companion Setup Guide */}
        <button
          onClick={onOpenCompanionModal}
          className="p-1.5 rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/40 transition-all"
          title="Windows Companion Setup & Instructions"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>

        {/* EMERGENCY STOP BUTTON */}
        <button
          onClick={onEmergencyStop}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-red-950/80 border border-red-500/80 text-red-200 font-bold hover:bg-red-900 hover:border-red-400 transition-all shadow-[0_0_12px_rgba(239,68,68,0.4)] active:scale-95"
          title="Immediate Emergency Halt: stops all voice, cancels pending actions [Esc]"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span className="font-orbitron tracking-wider text-[11px]">STOP [ESC]</span>
        </button>
      </div>
    </header>
  );
};
