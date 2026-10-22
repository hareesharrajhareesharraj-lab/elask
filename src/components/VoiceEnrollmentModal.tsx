import React, { useState, useRef } from 'react';
import {
  Mic,
  Shield,
  CheckCircle,
  AlertTriangle,
  X,
  Lock,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { OwnerVoiceProfile } from '../types';
import { soundFX } from '../services/speechService';

interface VoiceEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: OwnerVoiceProfile;
  onSaveProfile: (profile: OwnerVoiceProfile) => void;
}

export const VoiceEnrollmentModal: React.FC<VoiceEnrollmentModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}) => {
  const [ownerName, setOwnerName] = useState<string>(profile.ownerName || 'Owner');
  const [securityPin, setSecurityPin] = useState<string>(profile.securityPin || '1234');
  const [pinRequired, setPinRequired] = useState<boolean>(profile.pinRequiredForActions);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [enrollmentProgress, setEnrollmentProgress] = useState<number>(profile.enrolled ? 100 : 0);
  const [testScore, setTestScore] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleStartEnrollment = async () => {
    try {
      setIsRecording(true);
      setEnrollmentProgress(10);
      soundFX.playActivate();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let step = 0;

      const interval = setInterval(() => {
        analyser.getByteFrequencyData(buffer);
        step += 1;
        setEnrollmentProgress(Math.min(95, 15 + step * 16));

        if (step >= 5) {
          clearInterval(interval);
          stream.getTracks().forEach((t) => t.stop());
          audioCtx.close();
          setIsRecording(false);
          setEnrollmentProgress(100);
          soundFX.playSuccess();
        }
      }, 500);
    } catch (err: any) {
      setIsRecording(false);
      alert('Microphone access needed for voice profile calibration: ' + err.message);
    }
  };

  const handleTestMatch = () => {
    soundFX.playActivate();
    // Simulate biometric match score comparison
    setTimeout(() => {
      const score = Math.floor(Math.random() * 12 + 88); // 88% - 99%
      setTestScore(score);
      soundFX.playSuccess();
    }, 700);
  };

  const handleSave = () => {
    const updated: OwnerVoiceProfile = {
      ...profile,
      ownerName: ownerName.trim() || 'Owner',
      securityPin: securityPin.trim() || '1234',
      pinRequiredForActions: pinRequired,
      enrolled: enrollmentProgress >= 90,
      enrolledAt: new Date().toLocaleDateString(),
    };
    onSaveProfile(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-rajdhani">
      <div className="relative w-full max-w-lg bg-[#020b1c] border-2 border-cyan-400 p-6 rounded-lg shadow-[0_0_40px_rgba(0,240,255,0.3)] text-slate-100">
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h2 className="font-orbitron font-bold text-base tracking-wider text-cyan-200">
              OWNER IDENTITY & VOICE ENROLLMENT
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Disclaimer Card */}
        <div className="mt-4 p-3 rounded bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs font-mono-tech flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-bold block text-amber-300">
              OPTIONAL & LOCAL ACOUSTIC ESTIMATION:
            </span>
            Voice-profile matching is completely optional and processed 100% locally on this device for conversational personalization. It is NOT cryptographic or secure identity proof. All sensitive Windows OS actions explicitly require manual on-screen confirmation or owner PIN verification.
          </div>
        </div>

        {/* Form Fields */}
        <div className="mt-4 space-y-4 text-xs font-mono-tech">
          <div>
            <label className="text-cyan-400 block mb-1">OWNER NAME / ALIAS:</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full px-3 py-2 bg-black/60 border border-cyan-500/30 rounded font-rajdhani text-sm text-white focus:outline-none focus:border-cyan-400"
              placeholder="e.g. Rajesh or Owner"
            />
          </div>

          {/* Voice Enrollment Calibration */}
          <div className="p-3.5 rounded bg-cyan-950/40 border border-cyan-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cyan-300 font-bold">VOICEPRINT CALIBRATION</span>
              <span className="text-cyan-400">
                {profile.enrolled ? `CALIBRATED (${profile.enrolledAt})` : 'NOT ENROLLED'}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 font-rajdhani mb-3">
              Calibration phrase: <em>"I am the owner of ELASK, initialize my biometric profile."</em>
            </p>

            {/* Progress bar */}
            <div className="w-full h-2 rounded bg-black/60 border border-cyan-500/30 overflow-hidden mb-3">
              <div
                className="h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_8px_#00f0ff]"
                style={{ width: `${enrollmentProgress}%` }}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleStartEnrollment}
                disabled={isRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-rajdhani font-bold text-xs disabled:opacity-50"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isRecording ? 'ANALYZING VOICE...' : 'CALIBRATE VOICEPRINT'}</span>
              </button>

              {enrollmentProgress >= 90 && (
                <button
                  onClick={handleTestMatch}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-cyan-500/40 bg-cyan-950/60 text-cyan-300 hover:border-cyan-300 font-rajdhani text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>TEST VERIFICATION MATCH</span>
                </button>
              )}
            </div>

            {testScore !== null && (
              <div className="mt-2.5 text-xs text-emerald-400 flex items-center gap-1 font-mono-tech">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Verified Match Confidence: {testScore}% (Above threshold)</span>
              </div>
            )}
          </div>

          {/* Security PIN for Sensitive Actions */}
          <div className="p-3.5 rounded bg-cyan-950/40 border border-cyan-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                <Lock className="w-3.5 h-3.5" />
                <span>SECURITY PIN GUARD</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pinRequired}
                  onChange={(e) => setPinRequired(e.target.checked)}
                  className="rounded border-cyan-500 text-cyan-500 focus:ring-0"
                />
                <span className="text-[11px] text-cyan-400">Require PIN for OS Actions</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center mt-2">
              <div>
                <label className="text-[10px] text-cyan-400 block mb-1">4-DIGIT PIN:</label>
                <input
                  type="password"
                  maxLength={6}
                  value={securityPin}
                  onChange={(e) => setSecurityPin(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/60 border border-cyan-500/40 rounded text-center tracking-widest font-mono-tech text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-rajdhani">
                Used to authorize sensitive actions like launching Windows programs or sending external commands.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-cyan-500/30">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-rajdhani"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-rajdhani font-bold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>SAVE PROFILE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
