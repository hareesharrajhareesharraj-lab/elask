import React from 'react';
import { VoiceInputState } from '../types';
import { Mic, MicOff, Square, Play, ShieldAlert } from 'lucide-react';

interface HudOrbProps {
  voiceState: VoiceInputState;
  onEnableAutoListen: () => void;
  onStopListening: () => void;
  onResumeListening: () => void;
  onClick: () => void;
  audioLevel?: number; // 0 to 1
  silenceTimeoutMs?: number;
}

export const HudOrb: React.FC<HudOrbProps> = ({
  voiceState,
  onEnableAutoListen,
  onStopListening,
  onResumeListening,
  onClick,
  audioLevel = 0.2,
  silenceTimeoutMs = 1200,
}) => {
  const silenceSecs = (silenceTimeoutMs / 1000).toFixed(1);

  // Exact State Styling & Text mapping matching the 5 required states
  const getStateConfig = () => {
    switch (voiceState) {
      case 'ENABLE MICROPHONE':
        return {
          core: 'from-amber-600 via-rose-700 to-slate-950',
          glow: 'rgba(239, 68, 68, 0.45)',
          ringColor: '#ef4444',
          badgeText: '⚠️ ENABLE MICROPHONE',
          badgeBg: 'bg-red-950/90 text-red-300 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]',
          dotColor: 'bg-red-400 animate-pulse',
        };
      case 'LISTENING FOR ELASK':
        return {
          core: 'from-cyan-300 via-sky-500 to-blue-800',
          glow: 'rgba(0, 240, 255, 0.65)',
          ringColor: '#00f0ff',
          badgeText: '● LISTENING FOR ELASK',
          badgeBg: 'bg-cyan-950/90 text-cyan-200 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.4)]',
          dotColor: 'bg-cyan-400 animate-pulse',
        };
      case 'HEARING COMMAND':
        return {
          core: 'from-amber-300 via-amber-500 to-sky-800',
          glow: 'rgba(245, 158, 11, 0.75)',
          ringColor: '#f59e0b',
          badgeText: `● HEARING COMMAND // SUBMITS ON ${silenceSecs}s SILENCE`,
          badgeBg: 'bg-amber-950/90 text-amber-300 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]',
          dotColor: 'bg-amber-400 animate-ping',
        };
      case 'PROCESSING':
        return {
          core: 'from-sky-400 via-cyan-500 to-blue-900',
          glow: 'rgba(56, 189, 248, 0.65)',
          ringColor: '#38bdf8',
          badgeText: '⚙️ PROCESSING',
          badgeBg: 'bg-sky-950/90 text-sky-300 border-sky-400/80 shadow-[0_0_15px_rgba(56,189,248,0.4)]',
          dotColor: 'bg-sky-400 animate-pulse',
        };
      case 'PAUSED':
      default:
        return {
          core: 'from-amber-600 via-yellow-700 to-slate-900',
          glow: 'rgba(245, 158, 11, 0.35)',
          ringColor: '#d97706',
          badgeText: '⏸ PAUSED',
          badgeBg: 'bg-amber-950/70 text-amber-400 border-amber-600/50',
          dotColor: 'bg-amber-400',
        };
    }
  };

  const config = getStateConfig();
  const isActivelyListening = voiceState === 'LISTENING FOR ELASK' || voiceState === 'HEARING COMMAND';
  const pulseScale = isActivelyListening ? 1 + Math.min(audioLevel * 0.25, 0.25) : 1;

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-3">
      {/* Outer Hologram Container */}
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className="group relative w-[310px] h-[310px] sm:w-[380px] sm:h-[380px] md:w-[430px] md:h-[430px] flex items-center justify-center cursor-pointer focus:outline-none transition-transform duration-300 active:scale-95"
        title="ELASK Voice Core [Click or Spacebar]"
      >
        {/* Subtle Ambient Radial Backlight */}
        <div
          className="absolute inset-4 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none"
          style={{
            backgroundColor: config.glow,
            opacity: voiceState === 'HEARING COMMAND' ? 0.85 : 0.45,
          }}
        />

        {/* SVG Layer: Outer Telemetry Marks, Degree Labels, Segments */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 500 500"
        >
          {/* Degree Markers */}
          <text x="250" y="24" textAnchor="middle" fill="#00f0ff" opacity="0.6" fontSize="10" fontFamily="Orbitron">000°</text>
          <text x="480" y="254" textAnchor="middle" fill="#00f0ff" opacity="0.6" fontSize="10" fontFamily="Orbitron">090°</text>
          <text x="250" y="488" textAnchor="middle" fill="#00f0ff" opacity="0.6" fontSize="10" fontFamily="Orbitron">180°</text>
          <text x="20" y="254" textAnchor="middle" fill="#00f0ff" opacity="0.6" fontSize="10" fontFamily="Orbitron">270°</text>

          {/* Telemetry Corner Accents */}
          <text x="50" y="55" fill="#38bdf8" opacity="0.5" fontSize="9" fontFamily="Share Tech Mono">SYS.KERNEL: 3.8F</text>
          <text x="350" y="55" fill="#38bdf8" opacity="0.5" fontSize="9" fontFamily="Share Tech Mono">LOC: WIN-HOST</text>
          <text x="50" y="455" fill="#38bdf8" opacity="0.5" fontSize="9" fontFamily="Share Tech Mono">TAMIL // ENG</text>
          <text x="350" y="455" fill="#38bdf8" opacity="0.5" fontSize="9" fontFamily="Share Tech Mono">HUD.RES: 1440P</text>

          {/* Outer Thin Static Ring */}
          <circle
            cx="250"
            cy="250"
            r="230"
            fill="none"
            stroke="#00f0ff"
            strokeWidth="1"
            strokeOpacity="0.25"
          />

          {/* Outer Segmented Ticks */}
          <circle
            cx="250"
            cy="250"
            r="220"
            fill="none"
            stroke="#00f0ff"
            strokeWidth="3"
            strokeDasharray="4 16"
            strokeOpacity="0.4"
          />

          {/* Rotating Outer Ring (Clockwise) */}
          <g className="animate-spin-slow origin-center">
            <circle
              cx="250"
              cy="250"
              r="205"
              fill="none"
              stroke="#00f0ff"
              strokeWidth="2"
              strokeDasharray="90 40 180 30"
              strokeOpacity="0.6"
            />
            <circle cx="250" cy="45" r="3" fill="#00f0ff" />
            <circle cx="455" cy="250" r="3" fill="#00f0ff" />
          </g>

          {/* Rotating Middle Ring (Counter-Clockwise) */}
          <g className="animate-spin-reverse origin-center">
            <circle
              cx="250"
              cy="250"
              r="185"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="15 8 45 12"
              strokeOpacity="0.5"
            />
            <circle
              cx="250"
              cy="250"
              r="170"
              fill="none"
              stroke="#0284c7"
              strokeWidth="2"
              strokeDasharray="250 80"
              strokeOpacity="0.35"
            />
          </g>

          {/* Inner Frequency Radar Sweep Arc */}
          <g className={isActivelyListening || voiceState === 'PROCESSING' ? 'animate-radar origin-center' : 'origin-center'}>
            <path
              d="M 250 250 L 250 100 A 150 150 0 0 1 360 145 Z"
              fill="url(#radarGradient)"
              opacity="0.3"
            />
          </g>

          {/* Audio reactive inner ring */}
          <circle
            cx="250"
            cy="250"
            r={130 + (isActivelyListening ? audioLevel * 18 : 0)}
            fill="none"
            stroke={config.ringColor}
            strokeWidth={isActivelyListening ? "3" : "1.5"}
            strokeDasharray={isActivelyListening ? "6 6" : "10 15"}
            strokeOpacity="0.8"
            className="transition-all duration-100"
          />

          <defs>
            <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>

        {/* Central Assistant Orb */}
        <div
          className="relative w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60 rounded-full flex flex-col items-center justify-center p-4 backdrop-blur-md transition-all duration-500 group-hover:scale-105"
          style={{
            transform: `scale(${pulseScale})`,
            boxShadow: `0 0 45px ${config.glow}, inset 0 0 30px rgba(0, 240, 255, 0.4)`,
            border: `2px solid ${config.ringColor}`,
            background: 'radial-gradient(circle, rgba(2, 20, 45, 0.95) 0%, rgba(1, 10, 25, 0.98) 70%, rgba(0, 5, 15, 1) 100%)',
          }}
        >
          {/* Concentric inner grid rings */}
          <div className="absolute inset-3 rounded-full border border-cyan-500/20 pointer-events-none" />
          <div className="absolute inset-7 rounded-full border border-dashed border-cyan-400/30 pointer-events-none animate-spin-slow" />

          {/* Futuristic Core Glow Dot */}
          <div
            className={`w-3.5 h-3.5 rounded-full ${config.dotColor} mb-2 transition-all duration-300`}
            style={{
              boxShadow: `0 0 15px ${config.ringColor}`,
            }}
          />

          {/* Main Typography: ELASK */}
          <div className="relative text-center">
            <h1
              className="font-orbitron text-4xl sm:text-5xl md:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-200 to-cyan-500 drop-shadow-[0_0_20px_rgba(0,240,255,0.8)]"
              style={{ letterSpacing: '0.18em' }}
            >
              ELASK
            </h1>

            <div className="mt-1 font-rajdhani text-[11px] sm:text-xs font-semibold tracking-widest text-cyan-300 uppercase opacity-90">
              TAMIL &bull; ENGLISH // OS-AI
            </div>
          </div>

          {/* Action prompt inside orb */}
          <div className="absolute bottom-4 font-mono-tech text-[10px] tracking-wider text-cyan-400/80 group-hover:text-cyan-200 transition-colors">
            {voiceState === 'ENABLE MICROPHONE'
              ? 'CLICK TO ENABLE AUTO LISTEN'
              : voiceState === 'PAUSED'
              ? 'CLICK TO RESUME'
              : 'CLICK TO TALK'}
          </div>
        </div>
      </div>

      {/* State Badge & Immediate Controls Below Orb */}
      <div className="mt-3 flex flex-col items-center justify-center gap-2.5">
        {/* The 5 Canonical State Badges */}
        <div
          className={`px-4 py-1.5 rounded-full text-xs font-rajdhani font-bold tracking-widest uppercase border backdrop-blur-md flex items-center gap-2 transition-all duration-300 ${config.badgeBg}`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
          <span className="font-mono-tech">{config.badgeText}</span>
        </div>

        {/* Immediate Controls: Stop Listening, Enable Auto Listen, Resume */}
        <div className="flex items-center gap-2.5 flex-wrap justify-center">
          {/* STATE 1: ENABLE MICROPHONE -> Big Prominent "Enable Auto Listen" Setup Button */}
          {voiceState === 'ENABLE MICROPHONE' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEnableAutoListen();
              }}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-orbitron font-bold text-xs tracking-wider shadow-[0_0_20px_rgba(0,240,255,0.6)] flex items-center gap-2 transition-all active:scale-95 animate-pulse"
              title="Grant microphone permission and enable hands-free auto-listening"
            >
              <Mic className="w-4 h-4 text-slate-950" />
              <span>ENABLE AUTO LISTEN</span>
            </button>
          )}

          {/* STATES 2 & 3: LISTENING FOR ELASK or HEARING COMMAND -> Immediate "Stop Listening" Button */}
          {(voiceState === 'LISTENING FOR ELASK' || voiceState === 'HEARING COMMAND') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStopListening();
              }}
              className="px-4 py-2 rounded-lg border border-red-500/80 bg-red-950/80 text-red-200 hover:bg-red-900 text-xs font-orbitron font-bold tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              title="Stop listening immediately [ESC]"
            >
              <Square className="w-3.5 h-3.5 fill-red-400 text-red-400" />
              <span>STOP LISTENING (ESC)</span>
            </button>
          )}

          {/* STATE 4: PROCESSING -> Spinner */}
          {voiceState === 'PROCESSING' && (
            <div className="px-4 py-1.5 rounded-lg border border-sky-500/40 bg-sky-950/60 text-sky-300 text-xs font-orbitron flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
              <span>GEMINI LIVE COMPUTING...</span>
            </div>
          )}

          {/* STATE 5: PAUSED -> Large Resume Control */}
          {voiceState === 'PAUSED' && (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResumeListening();
                }}
                className="px-4 py-2 rounded-lg border border-emerald-400 bg-emerald-950/80 text-emerald-200 hover:bg-emerald-900 text-xs font-orbitron font-bold tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                title="Resume auto-listening for 'ELASK'"
              >
                <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                <span>RESUME AUTO-LISTEN</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                className="px-3.5 py-2 rounded-lg border border-cyan-500/50 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/60 text-xs font-orbitron flex items-center gap-1.5 transition-all"
                title="Click to talk one-time"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>TALK ONCE</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
