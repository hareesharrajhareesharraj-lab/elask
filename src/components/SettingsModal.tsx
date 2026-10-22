import React, { useState } from 'react';
import {
  Sliders,
  X,
  Plus,
  Trash2,
  Monitor,
  Mic,
  Volume2,
  Radio,
  Sparkles,
  ShieldCheck,
  Check,
  Globe,
} from 'lucide-react';
import { ApprovedApp, CompanionState, LanguageMode } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  approvedApps: ApprovedApp[];
  onUpdateApprovedApps: (apps: ApprovedApp[]) => void;
  wakeWordMode: boolean;
  onToggleWakeWordMode: (enabled: boolean) => void;
  companionState: CompanionState;
  onUpdateCompanion: (state: Partial<CompanionState>) => void;
  ttsVoice: string;
  onChangeTtsVoice: (voice: string) => void;
  enableSearchGrounding: boolean;
  onToggleSearchGrounding: (enabled: boolean) => void;
  onOpenVoiceEnrollment: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  approvedApps,
  onUpdateApprovedApps,
  wakeWordMode,
  onToggleWakeWordMode,
  companionState,
  onUpdateCompanion,
  ttsVoice,
  onChangeTtsVoice,
  enableSearchGrounding,
  onToggleSearchGrounding,
  onOpenVoiceEnrollment,
}) => {
  const [activeTab, setActiveTab] = useState<'apps' | 'voice' | 'companion' | 'general'>('apps');

  // New App Form State
  const [newAppName, setNewAppName] = useState<string>('');
  const [newAppCommand, setNewAppCommand] = useState<string>('');
  const [newAppAliases, setNewAppAliases] = useState<string>('');
  const [appError, setAppError] = useState<string>('');

  if (!isOpen) return null;

  const handleAddApp = () => {
    if (!newAppName.trim() || !newAppCommand.trim()) {
      setAppError('App Name and Executable/Command are required.');
      return;
    }

    // Security check: reject arbitrary dangerous command strings
    if (
      newAppCommand.includes('rm -rf') ||
      newAppCommand.includes('format') ||
      newAppCommand.includes('del /f') ||
      newAppCommand.includes('curl') ||
      newAppCommand.includes('powershell -e')
    ) {
      setAppError('Command prohibited: dangerous or script-injection patterns detected.');
      return;
    }

    const aliases = newAppAliases
      .split(',')
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);

    const newApp: ApprovedApp = {
      id: 'app_' + Date.now(),
      name: newAppName.trim(),
      command: newAppCommand.trim(),
      aliases: aliases.length > 0 ? aliases : [newAppName.trim().toLowerCase()],
      category: 'Owner Approved',
    };

    onUpdateApprovedApps([...approvedApps, newApp]);
    setNewAppName('');
    setNewAppCommand('');
    setNewAppAliases('');
    setAppError('');
  };

  const handleDeleteApp = (id: string) => {
    onUpdateApprovedApps(approvedApps.filter((a) => a.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-rajdhani">
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
        <div className="flex items-center gap-2 mt-4 border-b border-cyan-500/20 pb-2 text-xs font-mono-tech">
          <button
            onClick={() => setActiveTab('apps')}
            className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
              activeTab === 'apps'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-cyan-300 hover:bg-cyan-950/60'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>APPROVED APPS ({approvedApps.length})</span>
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
            <span>WINDOWS COMPANION</span>
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
          {/* TAB 1: APPROVED APPS */}
          {activeTab === 'apps' && (
            <div className="space-y-4">
              <div className="p-3 rounded bg-cyan-950/40 border border-cyan-500/20 text-xs font-mono-tech text-cyan-300/90">
                <p>
                  <strong>Owner Whitelist Security:</strong> ELASK and its Windows Companion can only launch applications explicitly approved here. Arbitrary shell commands are blocked.
                </p>
              </div>

              {/* Add New App Section */}
              <div className="p-3.5 rounded bg-black/50 border border-cyan-500/30 text-xs font-mono-tech space-y-3">
                <span className="text-cyan-300 font-bold block">ADD APPROVED APPLICATION:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-cyan-400 block mb-1">APP DISPLAY NAME:</label>
                    <input
                      type="text"
                      value={newAppName}
                      onChange={(e) => setNewAppName(e.target.value)}
                      placeholder="e.g. Visual Studio Code"
                      className="w-full px-2.5 py-1.5 bg-cyan-950/50 border border-cyan-500/30 rounded text-white focus:outline-none focus:border-cyan-400 text-xs font-rajdhani"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-cyan-400 block mb-1">WINDOWS EXECUTABLE / COMMAND:</label>
                    <input
                      type="text"
                      value={newAppCommand}
                      onChange={(e) => setNewAppCommand(e.target.value)}
                      placeholder="e.g. code or C:\path\app.exe"
                      className="w-full px-2.5 py-1.5 bg-cyan-950/50 border border-cyan-500/30 rounded text-white focus:outline-none focus:border-cyan-400 text-xs font-mono-tech"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-cyan-400 block mb-1">
                    VOICE ALIASES (COMMA SEPARATED):
                  </label>
                  <input
                    type="text"
                    value={newAppAliases}
                    onChange={(e) => setNewAppAliases(e.target.value)}
                    placeholder="e.g. vscode, code, editor"
                    className="w-full px-2.5 py-1.5 bg-cyan-950/50 border border-cyan-500/30 rounded text-white focus:outline-none focus:border-cyan-400 text-xs font-rajdhani"
                  />
                </div>

                {appError && <p className="text-xs text-red-400">{appError}</p>}

                <div className="text-right">
                  <button
                    onClick={handleAddApp}
                    className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-rajdhani font-bold text-xs flex items-center gap-1.5 ml-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ADD TO APPROVED WHITELIST</span>
                  </button>
                </div>
              </div>

              {/* List of current approved apps */}
              <div className="space-y-2">
                <span className="text-xs font-mono-tech text-cyan-400 block">CURRENT WHITELIST:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {approvedApps.map((app) => (
                    <div
                      key={app.id}
                      className="p-3 rounded bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between text-xs font-mono-tech"
                    >
                      <div>
                        <div className="font-bold text-white text-sm font-rajdhani">{app.name}</div>
                        <div className="text-[11px] text-cyan-400 font-mono-tech truncate max-w-[200px]">
                          {app.command}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Aliases: {app.aliases.join(', ')}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteApp(app.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                        title="Remove approved app"
                      >
                        <Trash2 className="w-4 h-4" />
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
              {/* Wake Word vs Push to Talk */}
              <div className="p-4 rounded bg-cyan-950/40 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300 font-bold text-sm">ACTIVATION PHRASE & MODE</span>
                  <span className="text-cyan-400 font-bold">WAKE WORD: "ELASK"</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <button
                    onClick={() => onToggleWakeWordMode(false)}
                    className={`p-3 rounded border text-left transition-all ${
                      !wakeWordMode
                        ? 'bg-cyan-900/60 border-cyan-400 text-white shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                        : 'bg-black/40 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="font-bold font-rajdhani text-sm text-cyan-200">
                      PUSH-TO-TALK [RECOMMENDED]
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 font-rajdhani">
                      Hold or press Spacebar / click center orb while app is open.
                    </div>
                  </button>

                  <button
                    onClick={() => onToggleWakeWordMode(true)}
                    className={`p-3 rounded border text-left transition-all ${
                      wakeWordMode
                        ? 'bg-cyan-900/60 border-cyan-400 text-white shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                        : 'bg-black/40 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="font-bold font-rajdhani text-sm text-cyan-200">
                      WAKE-WORD LISTENING
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 font-rajdhani">
                      Listens for "ELASK". True background listening when tab closed requires Windows Companion service.
                    </div>
                  </button>
                </div>
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
                    Calibrate your local voice profile & configure PIN protection.
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

          {/* TAB 3: WINDOWS COMPANION */}
          {activeTab === 'companion' && (
            <div className="space-y-4 text-xs font-mono-tech">
              <div className="p-3.5 rounded bg-cyan-950/40 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300 font-bold">COMPANION BRIDGE CONFIG</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold ${
                      companionState.online
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : 'bg-orange-950 text-orange-300 border border-orange-500/40'
                    }`}
                  >
                    {companionState.online ? 'ONLINE' : 'NEEDS COMPANION'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-rajdhani">
                  The local companion service runs on your Windows machine at 127.0.0.1:9123 to safely execute approved actions.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[10px] text-cyan-400 block mb-1">LOCAL PORT:</label>
                    <input
                      type="number"
                      value={companionState.port}
                      onChange={(e) =>
                        onUpdateCompanion({ port: parseInt(e.target.value, 10) || 9123 })
                      }
                      className="w-full px-2.5 py-1.5 bg-black/60 border border-cyan-500/30 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-cyan-400 block mb-1">AUTH TOKEN:</label>
                    <input
                      type="text"
                      value={companionState.token}
                      onChange={(e) => onUpdateCompanion({ token: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-black/60 border border-cyan-500/30 rounded text-white"
                    />
                  </div>
                </div>
              </div>
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
            CLOSE SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
};
