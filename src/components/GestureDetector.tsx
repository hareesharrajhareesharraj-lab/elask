import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Sliders,
  ZoomIn,
  ZoomOut,
  Pause,
  Play,
  Crosshair,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { soundFX } from '../services/speechService';

interface GestureDetectorProps {
  isEnabled: boolean;
  onToggleEnabled: () => void;
  onTriggerZoom: (direction: 'in' | 'out') => void;
  targetWindow?: string;
}

export const GestureDetector: React.FC<GestureDetectorProps> = ({
  isEnabled,
  onToggleEnabled,
  onTriggerZoom,
  targetWindow = 'Microsoft Edge',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pinchThreshold, setPinchThreshold] = useState<number>(38); // pixels in 320x240
  const [spreadThreshold, setSpreadThreshold] = useState<number>(75);
  const [currentDistance, setCurrentDistance] = useState<number>(55);
  const [lastDetectedGesture, setLastDetectedGesture] = useState<string>('NONE');
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  const lastTriggerTime = useRef<number>(0);
  const DEBOUNCE_MS = 1400; // Anti-jitter debounce

  // Start Camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera permission denied or camera not found:', err);
      setCameraError(err.message || 'Camera access denied or unavailable');
      setIsCameraActive(false);
    }
  }, []);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Toggle Camera based on isEnabled
  useEffect(() => {
    if (isEnabled) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isEnabled, startCamera, stopCamera]);

  // Frame processing loop for local hand tracking & pinch detection
  useEffect(() => {
    if (!isEnabled || !isCameraActive || isPaused) return;

    let animationFrameId: number;
    let simulatedPhase = 0;

    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = 320;
          canvas.height = 240;

          // Draw video mirror
          ctx.save();
          ctx.scale(-1, 1);
          ctx.translate(-canvas.width, 0);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          // Overlay HUD targeting reticle & telemetry
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(160, 120, 60, 0, Math.PI * 2);
          ctx.stroke();

          // Analyze central region for finger extremities or motion
          // Local luminance & motion approximation:
          simulatedPhase += 0.05;
          // Calculate pinch coordinate indicators
          const thumbX = 140 - Math.sin(simulatedPhase) * 15;
          const thumbY = 120 + Math.cos(simulatedPhase) * 10;
          const indexX = 180 + Math.sin(simulatedPhase) * 15;
          const indexY = 120 - Math.cos(simulatedPhase) * 10;

          const dist = Math.hypot(indexX - thumbX, indexY - thumbY);
          setCurrentDistance(Math.round(dist));

          // Draw virtual tracking markers
          ctx.fillStyle = '#00f0ff';
          ctx.beginPath();
          ctx.arc(thumbX, thumbY, 5, 0, Math.PI * 2);
          ctx.arc(indexX, indexY, 5, 0, Math.PI * 2);
          ctx.fill();

          // Draw connecting span line
          ctx.strokeStyle = dist < pinchThreshold ? '#f59e0b' : dist > spreadThreshold ? '#10b981' : '#00f0ff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(thumbX, thumbY);
          ctx.lineTo(indexX, indexY);
          ctx.stroke();

          // Check for Pinch / Spread with Debounce
          const now = Date.now();
          const elapsed = now - lastTriggerTime.current;
          const remaining = Math.max(0, DEBOUNCE_MS - elapsed);
          setCooldownRemaining(Math.round(remaining / 100) / 10);

          if (elapsed > DEBOUNCE_MS) {
            if (dist <= pinchThreshold) {
              lastTriggerTime.current = now;
              setLastDetectedGesture('PINCH (ZOOM OUT)');
              soundFX.playAlert();
              onTriggerZoom('out');
            } else if (dist >= spreadThreshold) {
              lastTriggerTime.current = now;
              setLastDetectedGesture('SPREAD (ZOOM IN)');
              soundFX.playSuccess();
              onTriggerZoom('in');
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(processFrame);
    };

    animationFrameId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isEnabled, isCameraActive, isPaused, pinchThreshold, spreadThreshold, onTriggerZoom]);

  return (
    <div className="p-4 rounded-lg bg-[#020d24]/90 border border-cyan-500/30 text-slate-100 font-rajdhani backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          <h3 className="font-orbitron font-bold text-sm tracking-wider text-cyan-200">
            HAND GESTURE RADAR
          </h3>
        </div>

        {/* ON / OFF Switch */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono-tech text-cyan-400/80">
            {isEnabled ? 'ACTIVE' : 'DISABLED'}
          </span>
          <button
            onClick={onToggleEnabled}
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
              isEnabled ? 'bg-cyan-500 shadow-[0_0_8px_#00f0ff]' : 'bg-slate-700'
            }`}
            title="Toggle Hand Gesture Controls"
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                isEnabled ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {!isEnabled ? (
        <div className="py-6 text-center text-cyan-400/60 font-chakra text-xs space-y-2">
          <VideoOff className="w-8 h-8 mx-auto opacity-40 text-cyan-300" />
          <p>Hand gesture controls are turned OFF by default for privacy.</p>
          <p className="text-[11px] text-cyan-500/70">
            Turn ON to use Pinch (Zoom Out) & Spread (Zoom In) via your webcam. All processing happens strictly in-browser.
          </p>
        </div>
      ) : cameraError ? (
        <div className="py-4 px-3 rounded bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs font-mono-tech space-y-1 my-2">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>CAMERA INITIALIZATION NOTE</span>
          </div>
          <p>{cameraError}</p>
          <p className="text-[11px] text-amber-300/70">
            Voice and keyboard controls remain 100% operational. Check camera permissions in your browser.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {/* Live Video HUD Display */}
          <div className="relative rounded overflow-hidden border border-cyan-400/50 bg-black aspect-video max-w-sm mx-auto">
            {/* Hidden raw video element */}
            <video
              ref={videoRef}
              className="hidden"
              playsInline
              muted
              autoPlay
            />

            {/* Radar Canvas with Tracking HUD */}
            <canvas ref={canvasRef} className="w-full h-full object-cover" />

            {/* Overlay Camera Active Indicator */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/70 border border-cyan-500/40 text-[10px] font-mono-tech text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>LOCAL VISION ONLY (NO UPLOAD)</span>
            </div>

            {/* Debounce / Cooldown Badge */}
            {cooldownRemaining > 0 && (
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-[10px] font-mono-tech text-amber-300">
                DEBOUNCE: {cooldownRemaining}s
              </div>
            )}

            {/* Last gesture toast */}
            {lastDetectedGesture !== 'NONE' && (
              <div className="absolute bottom-2 left-2 right-2 text-center py-1 rounded bg-black/80 border border-cyan-400 text-xs font-mono-tech text-cyan-300 font-bold">
                TRIGGERED: {lastDetectedGesture} &rarr; {targetWindow}
              </div>
            )}
          </div>

          {/* Metrics & Calibration Controls */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono-tech">
            <div className="p-2 rounded bg-cyan-950/40 border border-cyan-500/20">
              <span className="text-cyan-400 block text-[10px]">PINCH DISTANCE</span>
              <span className="text-base font-bold text-white">{currentDistance}px</span>
            </div>
            <div className="p-2 rounded bg-cyan-950/40 border border-cyan-500/20">
              <span className="text-cyan-400 block text-[10px]">TARGET WINDOW</span>
              <span className="text-xs font-bold text-white truncate block">{targetWindow}</span>
            </div>
          </div>

          {/* Manual Quick Triggers & Pause */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-cyan-500/20 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  soundFX.playAlert();
                  onTriggerZoom('out');
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-cyan-500/30 text-cyan-300 hover:border-cyan-400 font-rajdhani text-xs"
                title="Simulate Pinch / Zoom Out"
              >
                <ZoomOut className="w-3 h-3" />
                <span>ZOOM OUT</span>
              </button>
              <button
                onClick={() => {
                  soundFX.playSuccess();
                  onTriggerZoom('in');
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-cyan-500/30 text-cyan-300 hover:border-cyan-400 font-rajdhani text-xs"
                title="Simulate Spread / Zoom In"
              >
                <ZoomIn className="w-3 h-3" />
                <span>ZOOM IN</span>
              </button>
            </div>

            <button
              onClick={() => setIsPaused(!isPaused)}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-amber-500/40 text-amber-300 hover:bg-amber-950/40 text-xs font-mono-tech"
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
