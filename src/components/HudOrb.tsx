import React from 'react';
import { AssistantState } from '../types';

interface HudOrbProps {
  state: AssistantState;
  onClick: () => void;
  isListening: boolean;
  audioLevel?: number; // 0 to 1
  wakeWordMode?: boolean;
}

export const HudOrb: React.FC<HudOrbProps> = ({
  state,
  onClick,
  isListening,
  audioLevel = 0.2,
  wakeWordMode = false,
}) => {
  // State-specific styling
  const getStateColors = () => {
    switch (state) {
      case 'LISTENING':
        return {
          core: 'from-cyan-400 via-sky-500 to-blue-700',
          glow: 'rgba(0, 240, 255, 0.7)',
          ringColor: '#00f0ff',
          badgeText: 'LISTENING // AUDIO ACTIVE',
          badgeBg: 'bg-cyan-950/80 text-cyan-300 border-cyan-400/50',
        };
      case 'THINKING':
        return {
          core: 'from-amber-300 via-cyan-500 to-blue-800',
          glow: 'rgba(245, 158, 11, 0.6)',
          ringColor: '#38bdf8',
          badgeText: 'ANALYZING // GEMINI CORE',
          badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-400/50',
        };
      case 'SPEAKING':
        return {
          core: 'from-teal-300 via-cyan-400 to-indigo-700',
          glow: 'rgba(20, 184, 166, 0.65)',
          ringColor: '#2dd4bf',
          badgeText: 'VOCALIZING // RESPONSE',
          badgeBg: 'bg-teal-950/80 text-teal-300 border-teal-400/50',
        };
      case 'EXECUTING':
        return {
          core: 'from-emerald-400 via-cyan-500 to-blue-700',
          glow: 'rgba(16, 185, 129, 0.7)',
          ringColor: '#34d399',
          badgeText: 'WINDOWS BRIDGE // EXECUTING',
          badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-400/50',
        };
      case 'PAUSED':
        return {
          core: 'from-amber-600 via-yellow-700 to-slate-900',
          glow: 'rgba(245, 158, 11, 0.35)',
          ringColor: '#d97706',
          badgeText: 'STANDBY // PAUSED',
          badgeBg: 'bg-amber-950/60 text-amber-400 border-amber-600/40',
        };
      case 'NEEDS_SETUP':
        return {
          core: 'from-orange-500 via-amber-600 to-neutral-900',
          glow: 'rgba(249, 115, 22, 0.4)',
          ringColor: '#f97316',
          badgeText: 'SETUP NEEDED // COMPANION',
          badgeBg: 'bg-orange-950/80 text-orange-300 border-orange-500/50',
        };
      case 'READY':
      default:
        return {
          core: 'from-cyan-300 via-cyan-600 to-blue-900',
          glow: 'rgba(0, 240, 255, 0.45)',
          ringColor: '#00f0ff',
          badgeText: wakeWordMode ? 'ONLINE // "ELASK" WAKE READY' : 'ONLINE // PUSH TO TALK [SPACE]',
          badgeBg: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30',
        };
    }
  };

  const colors = getStateColors();

  // Dynamic scale from audio level
  const pulseScale = isListening ? 1 + Math.min(audioLevel * 0.25, 0.25) : 1;

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-4">
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
        className="group relative w-[310px] h-[310px] sm:w-[380px] sm:h-[380px] md:w-[440px] md:h-[440px] flex items-center justify-center cursor-pointer focus:outline-none transition-transform duration-300 active:scale-95"
        title="Click to toggle ELASK Voice Input [Spacebar]"
      >
        {/* Subtle Ambient Radial Backlight */}
        <div
          className="absolute inset-4 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none"
          style={{
            backgroundColor: colors.glow,
            opacity: state === 'LISTENING' ? 0.8 : 0.4,
          }}
        />

        {/* SVG Layer: Outer Telemetry Marks, Degree Labels, Segments */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 500 500"
        >
          {/* Degree Markers 0°, 90°, 180°, 270° */}
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
            {/* Small telemetry satellite markers */}
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
          <g className={state === 'LISTENING' || state === 'THINKING' ? 'animate-radar origin-center' : 'origin-center'}>
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
            r={130 + (isListening ? audioLevel * 18 : 0)}
            fill="none"
            stroke={colors.ringColor}
            strokeWidth={isListening ? "3" : "1.5"}
            strokeDasharray={isListening ? "6 6" : "10 15"}
            strokeOpacity="0.8"
            className="transition-all duration-100"
          />

          {/* Definitions for SVG Gradients */}
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
            boxShadow: `0 0 45px ${colors.glow}, inset 0 0 30px rgba(0, 240, 255, 0.4)`,
            border: `2px solid ${colors.ringColor}`,
            background: 'radial-gradient(circle, rgba(2, 20, 45, 0.95) 0%, rgba(1, 10, 25, 0.98) 70%, rgba(0, 5, 15, 1) 100%)',
          }}
        >
          {/* Concentric subtle inner grid / ring */}
          <div className="absolute inset-3 rounded-full border border-cyan-500/20 pointer-events-none" />
          <div className="absolute inset-7 rounded-full border border-dashed border-cyan-400/30 pointer-events-none animate-spin-slow" />

          {/* Futuristic Core Glow Dot */}
          <div
            className={`w-3 h-3 rounded-full bg-cyan-300 mb-2 transition-all duration-300 ${
              isListening ? 'animate-ping' : 'animate-pulse'
            }`}
            style={{
              boxShadow: '0 0 15px #00f0ff',
            }}
          />

          {/* Main Typography: ELASK (Replacing JARVIS) */}
          <div className="relative text-center">
            <h1
              className="font-orbitron text-4xl sm:text-5xl md:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-200 to-cyan-500 drop-shadow-[0_0_20px_rgba(0,240,255,0.8)]"
              style={{ letterSpacing: '0.18em' }}
            >
              ELASK
            </h1>

            {/* Sub-label */}
            <div className="mt-1 font-rajdhani text-[11px] sm:text-xs font-semibold tracking-widest text-cyan-300 uppercase opacity-90">
              TAMIL &bull; ENGLISH // OS-AI
            </div>
          </div>

          {/* Hover hint */}
          <div className="absolute bottom-4 font-mono-tech text-[10px] tracking-wider text-cyan-400/70 opacity-0 group-hover:opacity-100 transition-opacity">
            CLICK TO TALK
          </div>
        </div>
      </div>

      {/* State Badge Below Orb */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <div
          className={`px-3 py-1 rounded-full text-xs font-rajdhani font-bold tracking-widest uppercase border backdrop-blur-md flex items-center gap-2 transition-colors duration-300 ${colors.badgeBg}`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              state === 'LISTENING'
                ? 'bg-cyan-400 animate-ping'
                : state === 'THINKING'
                ? 'bg-amber-400 animate-pulse'
                : state === 'NEEDS_SETUP'
                ? 'bg-orange-500 animate-bounce'
                : 'bg-cyan-400'
            }`}
          />
          {colors.badgeText}
        </div>
      </div>
    </div>
  );
};
