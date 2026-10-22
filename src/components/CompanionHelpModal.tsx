import React, { useState } from 'react';
import {
  Terminal,
  Radio,
  CheckCircle,
  AlertCircle,
  X,
  Copy,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { CompanionState } from '../types';

interface CompanionHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  companionState: CompanionState;
  onTestConnection: () => Promise<void>;
}

export const CompanionHelpModal: React.FC<CompanionHelpModalProps> = ({
  isOpen,
  onClose,
  companionState,
  onTestConnection,
}) => {
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    await onTestConnection();
    setIsTesting(false);
  };

  const copyCommand = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-rajdhani">
      <div className="relative w-full max-w-2xl bg-[#020b1c] border-2 border-cyan-400 p-6 rounded-lg shadow-[0_0_40px_rgba(0,240,255,0.3)] text-slate-100 flex flex-col max-h-[90vh]">
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h2 className="font-orbitron font-bold text-base tracking-wider text-cyan-200">
              WINDOWS COMPANION INTEGRATION BRIDGE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs font-mono-tech">
          {/* Status Box */}
          <div className="p-4 rounded bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    companionState.online
                      ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                      : 'bg-orange-500 animate-pulse'
                  }`}
                />
                <span className="font-bold text-sm font-rajdhani text-white">
                  STATUS:{' '}
                  {companionState.online
                    ? `ONLINE (Latency: ${companionState.latencyMs || 4}ms)`
                    : 'OFFLINE / NOT DETECTED'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Listening address: <code>http://127.0.0.1:{companionState.port}</code>
              </p>
            </div>

            <button
              onClick={handleTest}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-rajdhani font-bold text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>TEST BRIDGE</span>
            </button>
          </div>

          {/* Architecture Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded bg-cyan-950/30 border border-cyan-500/20">
              <span className="text-cyan-400 font-bold block mb-1.5">
                RUNS IN BROWSER (NO COMPANION):
              </span>
              <ul className="space-y-1 text-slate-300 text-[11px] font-rajdhani list-disc list-inside">
                <li>Bilingual Tamil, English, Tanglish conversation</li>
                <li>Gemini 3.8 Flash reasoning & Google Search grounding</li>
                <li>Speech recognition & Gemini TTS voice output</li>
                <li>Local webcam hand gesture radar & pinch detection</li>
                <li>WhatsApp click-to-chat draft prefilling</li>
                <li>Push-to-talk voice commands</li>
              </ul>
            </div>

            <div className="p-3 rounded bg-cyan-950/30 border border-cyan-500/20">
              <span className="text-cyan-400 font-bold block mb-1.5">
                REQUIRES WINDOWS COMPANION:
              </span>
              <ul className="space-y-1 text-slate-300 text-[11px] font-rajdhani list-disc list-inside">
                <li>Launching desktop apps (Edge, Notepad, Calc, VS Code)</li>
                <li>Opening URLs directly in Microsoft Edge</li>
                <li>Simulating OS Zoom shortcuts (Ctrl+Plus / Ctrl+Minus)</li>
                <li>True background wake-word listening when tab is closed</li>
              </ul>
            </div>
          </div>

          {/* Quick Setup Instructions */}
          <div className="p-4 rounded bg-black/50 border border-cyan-500/30 space-y-3">
            <span className="text-cyan-300 font-bold block">
              QUICK START INSTRUCTIONS (ON YOUR WINDOWS MACHINE):
            </span>
            <ol className="space-y-2 text-slate-300 text-xs font-rajdhani list-decimal list-inside">
              <li>
                Open a PowerShell / Command Prompt terminal in the <code>companion/</code> folder of this project:
                <div className="mt-1 p-2 rounded bg-black/80 border border-cyan-500/30 flex items-center justify-between font-mono-tech text-cyan-300 text-[11px]">
                  <code>cd companion && node server.js</code>
                  <button
                    onClick={() => copyCommand('cd companion && node server.js')}
                    className="p-1 hover:text-white"
                    title="Copy command"
                  >
                    {copiedCmd ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </li>
              <li>
                Or double-click <code>start-companion.bat</code> inside <code>companion/</code>.
              </li>
              <li>
                Click <strong>"TEST BRIDGE"</strong> above. Once verified, all approved Windows actions execute instantly!
              </li>
            </ol>
          </div>

          {/* Security & Whitelist policy */}
          <div className="p-3 rounded bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-xs font-mono-tech flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <span className="font-bold block text-emerald-300">
                SECURITY & PRIVACY GUARANTEE:
              </span>
              The companion binds strictly to <code>127.0.0.1</code> (localhost) and validates every incoming request with your <code>X-ELASK-TOKEN</code>. Arbitrary shell commands are strictly prohibited.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-cyan-500/30 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-rajdhani font-bold text-xs"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};
