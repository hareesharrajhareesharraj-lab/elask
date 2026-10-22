import React, { useState, useEffect } from 'react';
import {
  Sliders,
  X,
  Monitor,
  Mic,
  Volume2,
  Radio,
  Sparkles,
  ShieldCheck,
  Check,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { ApprovedApp, CompanionState } from '../types';
import {
  getStoredCompanionToken,
  setStoredCompanionToken,
  getCompanionPairingStatus,
} from '../services/companionService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  approvedApps: ApprovedApp[];
  onUpdateApprovedApps: (apps: ApprovedApp[]) => void;
  wakeWordMode: boolean;
  onToggleWakeWordMode: (enabled: boolean) => void;
  autoWakeEnabled?: boolean;
  onToggleAutoWake?: (enabled: boolean) => void;
  companionState: CompanionState;
  onUpdateCompanion: (state: Partial<CompanionState>) => void;
  onToggleCompanionWake?: () => void;
  ttsVoice: string;
  onChangeTtsVoice: (voice: string) => void;
  enableSearchGrounding: boolean;
  onToggleSearchGrounding: (enabled: boolean) => void;
  onOpenVoiceEnrollment: () => void;
  silenceTimeoutMs?: number;
  onChangeSilenceTimeout?: (ms: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  approvedApps,
  onUpdateApprovedApps,
  wakeWordMode,
  onToggleWakeWordMode,
  autoWakeEnabled = false,
  onToggleAutoWake,
  companionState,
  onUpdateCompanion,
  onToggleCompanionWake,
  ttsVoice,
  onChangeTtsVoice,
  enableSearchGrounding,
  onToggleSearchGrounding,
  onOpenVoiceEnrollment,
  silenceTimeoutMs = 1200,
  onChangeSilenceTimeout,
}) => {
  const [activeTab, setActiveTab] = useState<'apps' | 'voice' | 'companion' | 'general'>('apps');

  // Pairing Token State
  const [pairingToken, setPairingToken] = useState<string>('');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [pairingStatus, setPairingStatus] = useState<{
    tested: boolean;
    paired: boolean;
    message?: string;
  }>({ tested: false, paired: false });
  const [isTestingPairing, setIsTestingPairing] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredCompanionToken();
      setPairingToken(stored);
      if (stored && companionState.online) {
        checkPairing(stored);
      }
    }
  }, [isOpen, companionState.online]);

  const checkPairing = async (tokenToTest: string) => {
    setIsTestingPairing(true);
    const res = await getCompanionPairingStatus(companionState.port, tokenToTest);
    setIsTestingPairing(false);
    if (res && res.paired) {
      setPairingStatus({ tested: true, paired: true, message: 'Companion paired successfully!' });
    } else {
      setPairingStatus({
        tested: true,
        paired: false,
        message: 'Invalid pairing token or companion offline. Check companion/companion-config.json',
      });
    }
  };

  const handleSaveToken = () => {
    const trimmed = pairingToken.trim();
    setStoredCompanionToken(trimmed);
    onUpdateCompanion({ token: trimmed });
    checkPairing(trimmed);
  };

  const handleToggleApp = (id: string) => {
    const updated = approvedApps.map((a) =>
      a.id === id ? { ...a, enabled: a.enabled === false ? true : false } : a
    );
    onUpdateApprovedApps(updated);
  };

  if (!isOpen) return null;

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
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="font-orbitron font-bold text-base tracking-wider text-cyan-200">
              ELASK SYSTEM CONFIGURATION
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 border-b border-cyan-500/20 pb-2 text-xs font-mono-tech flex-wrap">
          <button
            onClick={() => setActiveTab('apps')}
            className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
              activeTab === 'apps'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-cyan-300 hover:bg-cyan-950/60'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>SAFE APPS CATALOG ({approvedApps.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
              activeTab === 'voice'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-cyan-300 hover:bg-cyan-950/60'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>VOICE & SPEECH</span>
          </button>
          <button
            onClick={() => setActiveTab('companion')}
            className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
              activeTab === 'companion'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-cyan-300 hover:bg-cyan-950/60'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>WINDOWS COMPANION & PAIRING</span>
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-cyan-300 hover:bg-cyan-950/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI & SEARCH</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* TAB 1: SAFE APPROVED APPS CATALOG */}
          {activeTab === 'apps' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono-tech text-cyan-300/90 space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-200 font-bold font-orbitron">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  STRICT SERVER-SIDE WHITELIST (NO CUSTOM COMMANDS)
                </div>
                <p className="text-[11px] text-slate-300 font-chakra leading-relaxed">
                  For system security, ELASK prohibits custom shell commands or arbitrary executable paths.
                  Only pre-registered, known operating system applications mapped server-side can be launched using <code>child_process.spawn</code> with <code>shell: false</code>.
                </p>
              </div>

              {/* List of fixed approved apps */}
              <div className="space-y-2">
                <span className="text-xs font-mono-tech text-cyan-400 block font-bold">
                  SERVER-SIDE APPLICATION CATALOG:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {approvedApps.map((app) => (
                    <div
                      key={app.id}
                      className="p-3 rounded bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between text-xs font-mono-tech"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-white text-sm font-rajdhani flex items-center gap-1.5">
                          <span>{app.name}</span>
                          <span className="text-[10px] text-cyan-400 font-mono-tech">
                            [{app.id}]
                          </span>
                        </div>
                        <div className="text-[10px] text-cyan-300/80 font-chakra">
                          {app.description || app.category}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono-tech">
                          ✓ Spawn with shell: false
                        </div>
                      </div>

                      {/* Enable/Disable Toggle */}
                      <button
                        onClick={() => handleToggleApp(app.id)}
                        className={`px-2.5 py-1 rounded text-[10px] font-orbitron font-bold border transition-all ${
                          app.enabled !== false
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                            : 'bg-slate-900 border-slate-700 text-slate-500'
                        }`}
                        title={app.enabled !== false ? 'Click to disable app' : 'Click to enable app'}
                      >
                        {app.enabled !== false ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VOICE & SPEECH */}
          {activeTab === 'voice' && (
            <div className="space-y-4 text-xs font-mono-tech">
              {/* Wake Word vs Push to Talk vs Auto Wake */}
              <div className="p-4 rounded bg-cyan-950/40 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300 font-bold text-sm">ACTIVATION PHRASE & MODE</span>
                  <span className="text-cyan-400 font-bold">WAKE WORD: "ELASK" (ஏலாஸ்க்)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <button
                    onClick={() => {
                      if (onToggleAutoWake) onToggleAutoWake(true);
                      onToggleWakeWordMode(true);
                    }}
                    className={`p-3 rounded border text-left transition-all ${
                      autoWakeEnabled
                        ? 'bg-cyan-900/60 border-cyan-400 text-white shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                        : 'bg-black/40 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="font-bold font-rajdhani text-sm text-cyan-200 flex items-center justify-between">
                      <span>AUTO-WAKE (HANDS-FREE)</span>
                      {autoWakeEnabled && <Check className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 font-rajdhani">
                      Starts listening automatically on app load. Listens 100% locally for "ELASK" without sending idle audio to cloud.
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      if (onToggleAutoWake) onToggleAutoWake(false);
                      onToggleWakeWordMode(false);
                    }}
                    className={`p-3 rounded border text-left transition-all ${
                      !autoWakeEnabled
                        ? 'bg-cyan-900/60 border-cyan-400 text-white shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                        : 'bg-black/40 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="font-bold font-rajdhani text-sm text-cyan-200 flex items-center justify-between">
                      <span>PUSH-TO-TALK ONLY</span>
                      {!autoWakeEnabled && <Check className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 font-rajdhani">
                      Microphone inactive until you press Spacebar or click the center orb.
                    </div>
                  </button>
                </div>

                <div className="p-2.5 rounded bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200 font-chakra mt-2">
                  <strong>Notice on Browser Tab Suspension:</strong> In-browser listening only runs while this browser tab is active. For background wake-word listening when the browser tab is closed or suspended, the Windows Companion runs offline native listening in the background.
                </div>
              </div>

              {/* End-of-Speech Silence Detection (Auto-Submit) */}
              <div className="p-4 rounded bg-cyan-950/40 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-cyan-300 font-bold text-sm block">
                      END-OF-SPEECH SILENCE DETECTION (AUTO-SUBMIT)
                    </span>
                    <span className="text-[11px] text-slate-300 font-rajdhani block">
                      Zero second clicks needed: ELASK automatically submits your prompt when you pause.
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded bg-cyan-500/20 border border-cyan-400 text-cyan-200 font-mono-tech text-xs font-bold">
                      {(silenceTimeoutMs / 1000).toFixed(1)}s DELAY
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-mono-tech text-cyan-400">
                    <span>0.7s (Brisk English)</span>
                    <span className="text-cyan-200 font-bold">
                      {silenceTimeoutMs === 1200 ? '1.2s (Recommended: Tamil & English)' : `${(silenceTimeoutMs / 1000).toFixed(1)}s`}
                    </span>
                    <span>1.8s (Deliberate Tamil Pauses)</span>
                  </div>
                  <input
                    type="range"
                    min="700"
                    max="1800"
                    step="100"
                    value={silenceTimeoutMs}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (onChangeSilenceTimeout) {
                        onChangeSilenceTimeout(val);
                      }
                    }}
                    className="w-full accent-cyan-400 cursor-pointer h-2 bg-black/60 rounded-lg appearance-none"
                  />
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-2 pt-1 text-[11px] font-mono-tech">
                  <span className="text-slate-400 shrink-0">CADENCE PRESETS:</span>
                  {[
                    { label: '0.8s (Fast)', val: 800 },
                    { label: '1.2s (Recommended)', val: 1200 },
                    { label: '1.5s (Tamil Pauses)', val: 1500 },
                    { label: '1.8s (Max Comfort)', val: 1800 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      onClick={() => onChangeSilenceTimeout && onChangeSilenceTimeout(preset.val)}
                      className={`px-2 py-0.5 rounded border text-[10px] transition-all ${
                        silenceTimeoutMs === preset.val
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-300'
                          : 'bg-black/40 border-cyan-500/20 text-cyan-300 hover:border-cyan-400'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-slate-400 font-chakra leading-relaxed pt-1 border-t border-cyan-500/15">
                  Natural spoken Tamil and Tanglish sentences often feature thoughtful pauses before verbs or noun markers. ELASK waits for continuous silence across your configured delay before final submission, avoiding premature cutoffs while guaranteeing zero duplicate triggers.
                </p>
              </div>

              {/* Voice Persona (TTS Voice) */}
              <div className="p-4 rounded bg-cyan-950/40 border border-cyan-500/30 space-y-2">
                <span className="text-cyan-300 font-bold text-sm block">GEMINI TTS VOICE PERSONA</span>
                <p className="text-[11px] text-slate-300 font-rajdhani">
                  ELASK synthesizes speech via gemini-3.8-flash-lite-tts, with automatic native Tamil voice fallback via Web Speech Synthesis.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                  {['Kore', 'Puck', 'Fenrir', 'Zephyr', 'Charon'].map((voice) => (
                    <button
                      key={voice}
                      onClick={() => onChangeTtsVoice(voice)}
                      className={`p-2 rounded border text-center transition-all ${
                        ttsVoice === voice
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-300 shadow-[0_0_8px_#00f0ff]'
                          : 'bg-black/40 border-cyan-500/20 text-cyan-300 hover:border-cyan-400'
                      }`}
                    >
                      {voice}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Enrollment Link */}
              <div className="p-3 rounded bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-cyan-200">Owner Voice Enrollment</div>
                  <div className="text-[11px] text-slate-300">
                    Optional local acoustic calibration & PIN protection.
                  </div>
                </div>
                <button
                  onClick={onOpenVoiceEnrollment}
                  className="px-3 py-1.5 rounded border border-cyan-400 bg-cyan-950 text-cyan-300 hover:bg-cyan-800 text-xs font-rajdhani font-bold"
                >
                  CALIBRATE PROFILE
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: WINDOWS COMPANION & LOCAL PAIRING */}
          {activeTab === 'companion' && (
            <div className="space-y-4 text-xs font-mono-tech">
              {/* Companion Status & Connection */}
              <div className="p-3.5 rounded bg-cyan-950/40 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300 font-bold">COMPANION BRIDGE STATUS</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-xs ${
                      companionState.online
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : 'bg-orange-950 text-orange-300 border border-orange-500/40 animate-pulse'
                    }`}
                  >
                    {companionState.online ? 'ONLINE' : 'NOT DETECTED (NEEDS COMPANION)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-rajdhani">
                  The local companion service runs exclusively on <code>http://127.0.0.1:{companionState.port}</code> to execute approved OS actions safely.
                </p>
              </div>

              {/* Local Pairing Token Form */}
              <div className="p-3.5 rounded bg-black/60 border border-cyan-500/30 space-y-3">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <Key className="w-4 h-4 text-cyan-400" />
                  <span>LOCAL COMPANION PAIRING TOKEN</span>
                </div>
                <p className="text-[11px] text-slate-300 font-chakra leading-relaxed">
                  Every companion installation generates a unique 256-bit random token in <code>companion/companion-config.json</code>.
                  Paste your token below to authorize this browser session. Secrets are never transmitted in URL query strings.
                </p>

                <div className="space-y-2">
                  <label className="text-[10px] text-cyan-400 block font-bold">
                    X-ELASK-TOKEN:
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={pairingToken}
                        onChange={(e) => setPairingToken(e.target.value)}
                        placeholder="Paste random token from companion-config.json"
                        className="w-full px-3 py-2 bg-black/80 border border-cyan-500/30 rounded text-white font-mono-tech text-xs focus:outline-none focus:border-cyan-400 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-cyan-300"
                        title={showToken ? 'Hide token' : 'Show token'}
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      onClick={handleSaveToken}
                      disabled={!pairingToken.trim() || isTestingPairing}
                      className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-orbitron text-xs shadow-[0_0_10px_rgba(0,240,255,0.4)] disabled:opacity-50"
                    >
                      {isTestingPairing ? 'TESTING...' : 'SAVE & PAIR'}
                    </button>
                  </div>

                  {pairingStatus.tested && (
                    <div
                      className={`p-2 rounded text-xs flex items-center gap-1.5 ${
                        pairingStatus.paired
                          ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300'
                          : 'bg-red-950/60 border border-red-500/50 text-red-300'
                      }`}
                    >
                      {pairingStatus.paired ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      )}
                      <span>{pairingStatus.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Allowlist & Origin policy */}
              <div className="p-3.5 rounded bg-cyan-950/20 border border-cyan-500/20 space-y-1.5 text-[11px] font-chakra text-slate-300">
                <span className="text-cyan-400 font-bold block font-orbitron text-xs">
                  STRICT CORS & LOCAL BINDING POLICY:
                </span>
                <p>• Wildcard <code>*</code> CORS is prohibited on the companion.</p>
                <p>• Only exact allowed origins (e.g. <code>http://localhost:3000</code> and authorized app URLs) can connect.</p>
                <p>• Sensitive OS actions require explicit owner confirmation.</p>
              </div>

              {/* Background Wake Word Control */}
              {onToggleCompanionWake && (
                <div className="p-3 rounded bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-cyan-200">Windows Background Wake Word</div>
                    <div className="text-[11px] text-slate-300">
                      Toggle offline native microphone listening on "ELASK".
                    </div>
                  </div>
                  <button
                    onClick={onToggleCompanionWake}
                    disabled={!companionState.online}
                    className="px-3 py-1.5 rounded border border-cyan-400 bg-cyan-950 text-cyan-300 hover:bg-cyan-800 text-xs font-rajdhani font-bold disabled:opacity-50"
                  >
                    {companionState.wakeListening ? 'TURN OFF' : 'TURN ON'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: GENERAL & SEARCH */}
          {activeTab === 'general' && (
            <div className="space-y-4 text-xs font-mono-tech">
              <div className="p-4 rounded bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <div className="font-bold text-cyan-200 text-sm">GOOGLE SEARCH GROUNDING</div>
                  <div className="text-[11px] text-slate-300 max-w-md mt-1 font-rajdhani">
                    Allow ELASK to ground queries in live web search data for current events, news, weather, and real-time facts with clickable citations.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableSearchGrounding}
                    onChange={(e) => onToggleSearchGrounding(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              <div className="p-3 rounded bg-cyan-950/30 border border-cyan-500/20 text-slate-300 text-xs font-rajdhani space-y-1">
                <span className="text-cyan-400 font-bold block">Model & Architecture Notice:</span>
                <p>
                  ELASK utilizes Gemini 3.8 Flash (gemini-3.8-flash) for reasoning, bilingual language comprehension, and tool parsing. All API calls execute server-side in Node.js.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-cyan-500/30 flex items-center justify-end">
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
