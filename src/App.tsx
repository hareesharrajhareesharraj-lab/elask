import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Video,
  VideoOff,
  Sliders,
  History,
  Terminal,
  ShieldAlert,
  Volume2,
  VolumeX,
  Keyboard,
  Globe,
  Monitor,
  ExternalLink,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Play,
  RotateCcw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  AssistantState,
  LanguageMode,
  ChatMessage,
  ActionPayload,
  ApprovedApp,
  ActivityLogItem,
  OwnerVoiceProfile,
  CompanionState,
} from './types';
import { sendChatMessage, generateSpeechAudio } from './services/geminiService';
import {
  checkCompanionStatus,
  executeCompanionAction,
  DEFAULT_APPROVED_APPS,
} from './services/companionService';
import {
  SpeechListener,
  speakAloud,
  stopAllSpeech,
  soundFX,
  SpeechRecognitionResultPayload,
} from './services/speechService';
import { HudOrb } from './components/HudOrb';
import { TelemetryBar } from './components/TelemetryBar';
import { AudioVisualizer } from './components/AudioVisualizer';
import { TranscriptFeed } from './components/TranscriptFeed';
import { ActionConfirmModal } from './components/ActionConfirmModal';
import { GestureDetector } from './components/GestureDetector';
import { WhatsAppCard } from './components/WhatsAppCard';
import { VoiceEnrollmentModal } from './components/VoiceEnrollmentModal';
import { SettingsModal } from './components/SettingsModal';
import { ActivityLogDrawer } from './components/ActivityLogDrawer';
import { CompanionHelpModal } from './components/CompanionHelpModal';

export default function App() {
  // Assistant Status
  const [state, setState] = useState<AssistantState>('READY');
  const [languageMode, setLanguageMode] = useState<LanguageMode>('auto');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0.1);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const [ttsVoice, setTtsVoice] = useState<string>('Kore');
  const [wakeWordMode, setWakeWordMode] = useState<boolean>(false);
  const [enableSearchGrounding, setEnableSearchGrounding] = useState<boolean>(true);

  // Active Modals & Panels
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState<boolean>(false);
  const [isCompanionModalOpen, setIsCompanionModalOpen] = useState<boolean>(false);
  const [isVoiceEnrollmentOpen, setIsVoiceEnrollmentOpen] = useState<boolean>(false);
  const [isHandControlsActive, setIsHandControlsActive] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [activeCenterTab, setActiveCenterTab] = useState<'hud' | 'whatsapp' | 'gestures'>('hud');

  // Action Confirmation Modal
  const [pendingAction, setPendingAction] = useState<ActionPayload | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState<boolean>(false);

  // Activity Log
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);

  // Approved Apps List
  const [approvedApps, setApprovedApps] = useState<ApprovedApp[]>(DEFAULT_APPROVED_APPS);

  // Companion state
  const [companionState, setCompanionState] = useState<CompanionState>({
    online: false,
    lastChecked: new Date().toLocaleTimeString(),
    port: 9123,
    token: 'ELASK-LOCAL-DEV-TOKEN',
  });

  // Owner Voice & Security Profile
  const [ownerProfile, setOwnerProfile] = useState<OwnerVoiceProfile>({
    enrolled: false,
    ownerName: 'Owner',
    confidenceThreshold: 0.85,
    pinRequiredForActions: false,
    securityPin: '1234',
  });

  const speechListenerRef = useRef<SpeechListener | null>(null);

  // Log activity helper
  const logActivity = useCallback((action: string, status: ActivityLogItem['status'], details: any) => {
    const item: ActivityLogItem = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toLocaleTimeString(),
      action,
      status,
      details,
    };
    setActivityLogs((prev) => [item, ...prev.slice(0, 49)]);
  }, []);

  // Initialize SpeechListener & Probe Companion on mount
  useEffect(() => {
    speechListenerRef.current = new SpeechListener();

    // Probe Companion
    const probe = async () => {
      const res = await checkCompanionStatus(companionState.port);
      setCompanionState((prev) => ({
        ...prev,
        online: res.online,
        latencyMs: res.latencyMs,
        lastChecked: new Date().toLocaleTimeString(),
      }));
    };
    probe();
    const interval = setInterval(probe, 8000);

    return () => {
      clearInterval(interval);
      speechListenerRef.current?.stop();
      stopAllSpeech();
    };
  }, [companionState.port]);

  // Emergency Stop Handler
  const handleEmergencyStop = useCallback(() => {
    stopAllSpeech();
    speechListenerRef.current?.stop();
    setIsListening(false);
    setInterimTranscript('');
    setPendingAction(null);
    setIsActionModalOpen(false);
    setState('READY');
    logActivity('EMERGENCY_STOP', 'SUCCESS', { triggeredBy: 'Owner / ESC' });
  }, [logActivity]);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Emergency Stop on ESC
      if (e.key === 'Escape') {
        handleEmergencyStop();
        return;
      }

      // If user is currently typing in an input or textarea, don't trigger single-key hotkeys
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') {
        return;
      }

      // Spacebar: Toggle Voice Push-to-Talk
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleToggleListening();
        return;
      }

      // 'h' or 'H': Toggle Hand Controls
      if (e.key === 'h' || e.key === 'H') {
        setIsHandControlsActive((prev) => !prev);
        return;
      }

      // 'm' or 'M': Toggle Sound Mute
      if (e.key === 'm' || e.key === 'M') {
        setIsSoundMuted((prev) => {
          const next = !prev;
          soundFX.enabled = !next;
          if (next) stopAllSpeech();
          return next;
        });
        return;
      }

      // '?': Toggle shortcuts
      if (e.key === '?') {
        setShowShortcutsModal((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEmergencyStop]);

  // Execute Action via Companion or Web Fallback
  const handleExecuteAction = useCallback(async (action: ActionPayload, pin?: string) => {
    setState('EXECUTING');
    setIsActionModalOpen(false);
    setPendingAction(null);

    // If action is WHATSAPP_MESSAGE
    if (action.type === 'WHATSAPP_MESSAGE') {
      const cleanPhone = (action.recipient || '').replace(/[^0-9]/g, '');
      const encoded = encodeURIComponent(action.message || '');
      const url = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encoded}`
        : `https://web.whatsapp.com/send?text=${encoded}`;

      window.open(url, '_blank', 'noopener,noreferrer');
      logActivity('WHATSAPP_MESSAGE', 'SUCCESS', {
        recipient: action.recipient,
        openedUrl: url,
        note: 'Prefilled in WhatsApp for owner review & send',
      });

      const confirmMsg: ChatMessage = {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        text: `Opened WhatsApp chat for ${action.recipient || 'recipient'} with your message prefilled. Please review and press Send.`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, confirmMsg]);
      setState('READY');
      return;
    }

    // Try Windows Companion
    logActivity(action.type, 'PENDING', action);
    const result = await executeCompanionAction(action, companionState.token, companionState.port);

    if (result.success) {
      soundFX.playSuccess();
      logActivity(action.type, result.simulated ? 'SIMULATED' : 'SUCCESS', {
        action,
        message: result.message,
      });

      const successMsg: ChatMessage = {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        text: result.message || `Action ${action.type} executed successfully on Windows.`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, successMsg]);

      // Vocalize confirmation if sound not muted
      if (!isSoundMuted) {
        speakAloud(successMsg.text, undefined, languageMode === 'tamil' ? 'tamil' : 'english');
      }
    } else {
      soundFX.playAlert();
      logActivity(action.type, 'DENIED', {
        error: result.error,
        companionOnline: companionState.online,
      });

      const errorMsg: ChatMessage = {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        text: result.error || 'Action could not be executed on Windows companion.',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }

    setState('READY');
  }, [companionState.token, companionState.port, companionState.online, isSoundMuted, languageMode, logActivity]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [micStatusMessage, setMicStatusMessage] = useState<string>('');

  // Process user text / query through Gemini server-side endpoint
  const processQuery = useCallback(async (query: string, isVoice: boolean = false) => {
    if (!query.trim() || isLoading) return;

    const trimmedQuery = query.trim();

    // Add user message to transcript
    const userMsg: ChatMessage = {
      id: 'msg_u_' + Date.now(),
      role: 'user',
      text: trimmedQuery,
      timestamp: new Date().toLocaleTimeString(),
      isVoiceInput: isVoice,
    };
    setMessages((prev) => [...prev, userMsg]);
    setTextInput('');
    setIsLoading(true);
    setState('THINKING');

    try {
      // Call backend Gemini API
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const response = await sendChatMessage(
        trimmedQuery,
        historyPayload,
        languageMode,
        ownerProfile.ownerName,
        enableSearchGrounding
      );

      // Detect language returned for badge
      const containsTamil = /[\u0B80-\u0BFF]/.test(response.text);
      const languageDetected = containsTamil ? 'TAMIL' : 'ENGLISH';

      // Generate TTS audio if sound is active
      let ttsAudioBase64: string | undefined;
      if (!isSoundMuted) {
        try {
          const ttsRes = await generateSpeechAudio(response.text, ttsVoice);
          ttsAudioBase64 = ttsRes.audio;
        } catch (_ttsErr) {
          // fallback WebSpeech
        }
      }

      // Add assistant message with real model name
      const assistantMsg: ChatMessage = {
        id: 'msg_a_' + Date.now(),
        role: 'assistant',
        text: response.text,
        timestamp: new Date().toLocaleTimeString(),
        languageDetected,
        action: response.action || undefined,
        sources: response.sources,
        audioUrl: ttsAudioBase64,
        modelUsed: response.model,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Speak aloud if sound not muted
      if (!isSoundMuted) {
        setState('SPEAKING');
        speakAloud(
          response.text,
          ttsAudioBase64,
          languageDetected === 'TAMIL' ? 'tamil' : 'english',
          () => {
            setState('READY');
          }
        );
      } else {
        setState('READY');
      }

      // If Gemini identified an actionable command
      if (response.action) {
        setPendingAction(response.action);
        setIsActionModalOpen(true);
      }
    } catch (err: any) {
      console.error('ProcessQuery error:', err);
      soundFX.playAlert();
      const isUnavailable =
        Boolean(err?.isUnavailable) ||
        err?.status === 503 ||
        (typeof err?.message === 'string' &&
          (err.message.includes('503') ||
            err.message.includes('UNAVAILABLE') ||
            err.message.includes('high demand') ||
            err.message.includes('temporarily')));

      const errorMsg: ChatMessage = {
        id: 'msg_err_' + Date.now(),
        role: 'assistant',
        text: isUnavailable
          ? 'All Gemini models are temporarily experiencing high demand (503 UNAVAILABLE). Your conversation history is preserved. Please tap Retry.'
          : `Request error: ${err.message || 'Gemini API call failed'}.`,
        timestamp: new Date().toLocaleTimeString(),
        isError: true,
        isUnavailable,
        retryablePrompt: trimmedQuery,
      };
      setMessages((prev) => [...prev, errorMsg]);
      setState('READY');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, languageMode, ownerProfile.ownerName, enableSearchGrounding, isSoundMuted, ttsVoice]);

  // Voice Push-to-Talk Toggle
  const handleToggleListening = useCallback(() => {
    if (isListening) {
      speechListenerRef.current?.stop();
      setIsListening(false);
      setState('READY');
      if (interimTranscript.trim()) {
        processQuery(interimTranscript.trim(), true);
        setInterimTranscript('');
      }
    } else {
      stopAllSpeech();
      // Determine speech recognition language
      const lang =
        languageMode === 'tamil'
          ? 'ta-IN'
          : languageMode === 'english'
          ? 'en-US'
          : 'en-US'; // browser handles mixed phonetics well in en-US or ta-IN

      setState('LISTENING');
      setIsListening(true);
      setInterimTranscript('');

      speechListenerRef.current?.start(
        lang,
        (res: SpeechRecognitionResultPayload) => {
          setInterimTranscript(res.transcript);

          // Check for emergency stop phrase
          if (res.containsEmergencyStop) {
            handleEmergencyStop();
            return;
          }

          // If final transcript detected
          if (res.isFinal && res.transcript.trim()) {
            speechListenerRef.current?.stop();
            setIsListening(false);
            setInterimTranscript('');

            // Strip wake-word if present
            let cleanPrompt = res.transcript;
            if (res.containsWakeWord) {
              cleanPrompt = cleanPrompt.replace(/elask/gi, '').replace(/இலாஸ்க்/gi, '').trim();
            }
            if (cleanPrompt) {
              processQuery(cleanPrompt, true);
            }
          }
        },
        (error) => {
          console.warn('Speech error:', error);
          setIsListening(false);
          setState('READY');
          if (error === 'not-allowed') {
            setMicStatusMessage('Microphone access was blocked or denied in this browser. Text chat is 100% active and usable below!');
          } else {
            setMicStatusMessage(`Microphone: ${error}. Text chat is 100% active and ready.`);
          }
        },
        () => {
          setIsListening(false);
          setState((prev) => (prev === 'LISTENING' ? 'READY' : prev));
        }
      );
    }
  }, [isListening, interimTranscript, languageMode, handleEmergencyStop, processQuery]);

  // Replay message audio
  const handleReplayAudio = (text: string, audioUrl?: string) => {
    if (isSoundMuted) return;
    setState('SPEAKING');
    speakAloud(text, audioUrl, languageMode === 'tamil' ? 'tamil' : 'english', () => {
      setState('READY');
    });
  };

  // Zoom Trigger from Gestures or Buttons
  const handleTriggerZoom = (direction: 'in' | 'out') => {
    const action: ActionPayload = {
      type: 'ZOOM',
      zoomDirection: direction,
      targetWindow: 'Microsoft Edge',
      explanation: `Hand gesture ${direction === 'in' ? 'Spread' : 'Pinch'} triggered zoom ${direction}.`,
    };
    handleExecuteAction(action);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#020611] text-slate-100 flex flex-col overflow-hidden font-rajdhani hud-grid-pattern selection:bg-cyan-500 selection:text-black">
      {/* Scanline CRT overlay effect */}
      <div className="absolute inset-0 scanlines pointer-events-none opacity-40 z-10" />

      {/* Top Futuristic Telemetry Bar */}
      <TelemetryBar
        companionState={companionState}
        onEmergencyStop={handleEmergencyStop}
        isMicActive={isListening}
        isCameraActive={isHandControlsActive}
        isSoundMuted={isSoundMuted}
        languageMode={languageMode}
        onLanguageChange={setLanguageMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenActivityLog={() => setIsActivityLogOpen(true)}
        onOpenCompanionModal={() => setIsCompanionModalOpen(true)}
        onToggleSound={() => {
          setIsSoundMuted(!isSoundMuted);
          soundFX.enabled = isSoundMuted;
          if (!isSoundMuted) stopAllSpeech();
        }}
        onToggleCamera={() => setIsHandControlsActive(!isHandControlsActive)}
        onToggleMic={handleToggleListening}
      />

      {/* Main Responsive Grid Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 flex flex-col lg:flex-row gap-4 items-stretch z-20">
        {/* Left Column: Quick Launchers, WhatsApp, Gesture Module */}
        <section className="w-full lg:w-80 flex flex-col gap-3 order-2 lg:order-1">
          {/* Module Selector Tabs */}
          <div className="flex items-center gap-1 bg-[#020b1c] p-1 rounded-lg border border-cyan-500/30 text-xs font-mono-tech">
            <button
              onClick={() => setActiveCenterTab('hud')}
              className={`flex-1 py-1.5 rounded transition-all text-center ${
                activeCenterTab === 'hud'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_#00f0ff]'
                  : 'text-cyan-300/80 hover:text-white'
              }`}
            >
              LAUNCHER
            </button>
            <button
              onClick={() => setActiveCenterTab('whatsapp')}
              className={`flex-1 py-1.5 rounded transition-all text-center ${
                activeCenterTab === 'whatsapp'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_#00f0ff]'
                  : 'text-cyan-300/80 hover:text-white'
              }`}
            >
              WHATSAPP
            </button>
            <button
              onClick={() => setActiveCenterTab('gestures')}
              className={`flex-1 py-1.5 rounded transition-all text-center ${
                activeCenterTab === 'gestures'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_#00f0ff]'
                  : 'text-cyan-300/80 hover:text-white'
              }`}
            >
              GESTURES
            </button>
          </div>

          {/* Module Tab Content */}
          {activeCenterTab === 'hud' && (
            <div className="p-4 rounded-lg bg-[#020d24]/90 border border-cyan-500/30 backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
                <span className="font-orbitron font-bold text-xs tracking-wider text-cyan-200 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                  APPROVED APPS ({approvedApps.length})
                </span>
                <span className="text-[10px] font-mono-tech text-cyan-400/80">
                  {companionState.online ? 'BRIDGE ONLINE' : 'NEEDS COMPANION'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono-tech">
                {approvedApps.slice(0, 6).map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      const act: ActionPayload = {
                        type: 'LAUNCH_APP',
                        appName: app.name,
                        explanation: `Owner clicked launcher shortcut for ${app.name}.`,
                      };
                      setPendingAction(act);
                      setIsActionModalOpen(true);
                    }}
                    className="p-2.5 rounded bg-cyan-950/40 border border-cyan-500/20 hover:border-cyan-400 hover:bg-cyan-900/40 transition-all text-left group"
                  >
                    <div className="font-bold text-cyan-200 group-hover:text-white truncate">
                      {app.name}
                    </div>
                    <div className="text-[10px] text-cyan-500 truncate">{app.command}</div>
                  </button>
                ))}
              </div>

              {/* Edge Quick Search */}
              <div className="pt-2 border-t border-cyan-500/20">
                <span className="text-[10px] font-mono-tech text-cyan-400 block mb-1">
                  OPEN WEBSITE IN EDGE:
                </span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    id="quickEdgeUrl"
                    placeholder="e.g. github.com"
                    className="flex-1 px-2.5 py-1 bg-black/60 border border-cyan-500/30 rounded text-xs text-white focus:outline-none focus:border-cyan-400 font-mono-tech"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        if (val) {
                          setPendingAction({
                            type: 'OPEN_URL',
                            url: val,
                            explanation: `Open ${val} in Microsoft Edge`,
                          });
                          setIsActionModalOpen(true);
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const el = document.getElementById('quickEdgeUrl') as HTMLInputElement;
                      if (el && el.value) {
                        setPendingAction({
                          type: 'OPEN_URL',
                          url: el.value,
                          explanation: `Open ${el.value} in Microsoft Edge`,
                        });
                        setIsActionModalOpen(true);
                      }
                    }}
                    className="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono-tech flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeCenterTab === 'whatsapp' && (
            <WhatsAppCard
              onDraftSent={(recipient, message, url) => {
                logActivity('WHATSAPP_DRAFT', 'SUCCESS', { recipient, message, url });
              }}
            />
          )}

          {activeCenterTab === 'gestures' && (
            <GestureDetector
              isEnabled={isHandControlsActive}
              onToggleEnabled={() => setIsHandControlsActive(!isHandControlsActive)}
              onTriggerZoom={handleTriggerZoom}
              targetWindow="Microsoft Edge"
            />
          )}

          {/* Quick HUD Diagnostic card */}
          <div className="p-3 rounded-lg bg-[#020d24]/60 border border-cyan-500/20 text-xs font-mono-tech text-cyan-300/80 space-y-1">
            <div className="flex justify-between">
              <span>VOICE BIOMETRIC:</span>
              <span className={ownerProfile.enrolled ? 'text-cyan-400' : 'text-slate-500'}>
                {ownerProfile.enrolled ? 'CALIBRATED' : 'NOT CONFIGURED'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>SEARCH GROUNDING:</span>
              <span className={enableSearchGrounding ? 'text-emerald-400' : 'text-slate-500'}>
                {enableSearchGrounding ? 'ENABLED (LIVE)' : 'OFF'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>INTERACTION MODE:</span>
              <span className="text-cyan-200">
                {wakeWordMode ? 'WAKE-WORD ("ELASK")' : 'PUSH-TO-TALK [SPACE]'}
              </span>
            </div>
          </div>
        </section>

        {/* Center / Right Column: The Core Visual Orb & Transcript Feed */}
        <section className="flex-1 flex flex-col gap-3 order-1 lg:order-2">
          {/* Main Visual Centerpiece Container matching jarvis.jpg */}
          <div className="relative rounded-xl bg-[#01091a]/80 border border-cyan-500/30 p-4 sm:p-6 backdrop-blur-md flex flex-col items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.15)] overflow-hidden min-h-[380px] sm:min-h-[440px]">
            {/* Hologram Corner Accents */}
            <div className="hud-corner-tl !border-cyan-400/60" />
            <div className="hud-corner-tr !border-cyan-400/60" />
            <div className="hud-corner-bl !border-cyan-400/60" />
            <div className="hud-corner-br !border-cyan-400/60" />

            {/* Glowing Centerpiece Orb with Rotating Rings & "ELASK" Typography */}
            <HudOrb
              state={state}
              onClick={handleToggleListening}
              isListening={isListening}
              audioLevel={audioLevel}
              wakeWordMode={wakeWordMode}
            />

            {/* Audio Waveform Spectrum Reactive Bars */}
            <div className="w-full max-w-sm mt-2">
              <AudioVisualizer
                isActive={state === 'LISTENING' || state === 'SPEAKING'}
                color={
                  state === 'SPEAKING'
                    ? '#2dd4bf'
                    : state === 'THINKING'
                    ? '#f59e0b'
                    : '#00f0ff'
                }
              />
            </div>

            {/* Quick Status / Instruction Banner */}
            <div className="text-center font-chakra text-xs text-cyan-300/70 mt-1 max-w-md">
              {state === 'LISTENING' ? (
                <span className="text-cyan-200 font-bold animate-pulse">
                  Listening for spoken Tamil, English, or Tanglish... (Click to stop)
                </span>
              ) : state === 'THINKING' ? (
                <span className="text-amber-300 font-bold animate-pulse">
                  Reasoning with Gemini 3.8 Flash...
                </span>
              ) : state === 'SPEAKING' ? (
                <span className="text-teal-300 font-bold">
                  Speaking response aloud... Press [ESC] to stop.
                </span>
              ) : (
                <span>
                  Press <kbd className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-200 font-mono-tech">SPACE</kbd> or click orb to speak &bull; Says "ELASK"
                </span>
              )}
            </div>
          </div>

          {/* Conversation Transcript & Response Feed */}
          <div className="flex-1 min-h-[280px] rounded-xl bg-[#01091a]/80 border border-cyan-500/30 backdrop-blur-md flex flex-col overflow-hidden shadow-[0_0_20px_rgba(0,240,255,0.1)]">
            {/* Feed Header */}
            <div className="px-4 py-2.5 border-b border-cyan-500/20 bg-cyan-950/30 flex items-center justify-between text-xs font-mono-tech">
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                CONVERSATION & COMMAND LOG
              </span>
              <div className="flex items-center gap-3 text-cyan-400/70">
                <span>{messages.length} ENTRIES</span>
                <button
                  onClick={() => setMessages([])}
                  className="hover:text-cyan-200 transition-colors"
                  title="Clear transcript"
                >
                  CLEAR
                </button>
              </div>
            </div>

            {/* Messages Feed */}
            <TranscriptFeed
              messages={messages}
              interimTranscript={interimTranscript}
              isLoading={isLoading}
              onReplayAudio={handleReplayAudio}
              onExecuteAction={(action) => {
                setPendingAction(action);
                setIsActionModalOpen(true);
              }}
              isCompanionOnline={companionState.online}
              onQuickPrompt={(prompt) => processQuery(prompt, false)}
              onRetryPrompt={(prompt) => processQuery(prompt, false)}
            />

            {/* Quick Test Prompt Chips */}
            <div className="px-3 py-1.5 bg-[#010b1e]/90 border-t border-cyan-500/15 flex items-center gap-1.5 overflow-x-auto text-xs font-mono-tech select-none">
              <span className="text-[10px] text-cyan-500 uppercase shrink-0 font-bold">
                TEST PROMPTS:
              </span>
              {[
                { label: 'வணக்கம் ELASK (தமிழ்)', prompt: 'வணக்கம் ELASK! நீங்கள் யார்?' },
                { label: 'Edge Open (Tanglish)', prompt: 'Edge browser open பண்ணுங்க' },
                { label: 'Who created you? (Eng)', prompt: 'Who created you and what can you do?' },
                { label: 'Tech News (Search)', prompt: 'What are the top headlines in technology today?' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  disabled={isLoading}
                  onClick={() => processQuery(chip.prompt, false)}
                  className="px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:border-cyan-300 hover:bg-cyan-900/60 text-[11px] whitespace-nowrap transition-all disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Mic status alert banner if mic has error */}
            {micStatusMessage && (
              <div className="px-3 py-1.5 bg-amber-950/50 border-t border-amber-500/30 text-[11px] font-mono-tech text-amber-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  {micStatusMessage}
                </span>
                <button
                  onClick={() => setMicStatusMessage('')}
                  className="text-amber-400 hover:text-white ml-2 text-[10px] uppercase font-bold"
                >
                  DISMISS
                </button>
              </div>
            )}

            {/* Hybrid Input Box (Voice & Keyboard) */}
            <div className="p-3 border-t border-cyan-500/20 bg-[#020a1c] flex items-center gap-2">
              <button
                onClick={handleToggleListening}
                disabled={isLoading}
                className={`p-2.5 rounded-lg border transition-all ${
                  isListening
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_15px_#00f0ff]'
                    : 'bg-cyan-950/50 border-cyan-500/30 text-cyan-300 hover:border-cyan-400 disabled:opacity-50'
                }`}
                title={isListening ? 'Listening... click to stop' : 'Click to Speak [Spacebar]'}
              >
                {isListening ? (
                  <Mic className="w-4 h-4 animate-bounce text-slate-950" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              <input
                type="text"
                value={textInput}
                disabled={isLoading}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && textInput.trim() && !isLoading) {
                    processQuery(textInput.trim(), false);
                  }
                }}
                placeholder={
                  isLoading
                    ? 'ELASK is thinking... please wait.'
                    : 'Ask in Tamil, English or Tanglish (e.g. வணக்கம், Edge open pannu, Weather)...'
                }
                className="flex-1 px-3.5 py-2 rounded-lg bg-black/60 border border-cyan-500/30 text-sm font-rajdhani text-white placeholder-cyan-500/40 focus:outline-none focus:border-cyan-400 disabled:opacity-60"
              />

              <button
                onClick={() => {
                  if (textInput.trim() && !isLoading) {
                    processQuery(textInput.trim(), false);
                  }
                }}
                disabled={!textInput.trim() || isLoading}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-rajdhani font-bold text-sm shadow-[0_0_12px_rgba(0,240,255,0.3)] flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>THINKING</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">SEND</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Action Confirmation Modal */}
      <ActionConfirmModal
        action={pendingAction}
        isOpen={isActionModalOpen}
        onConfirm={(pin) => {
          if (pendingAction) handleExecuteAction(pendingAction, pin);
        }}
        onCancel={() => {
          setIsActionModalOpen(false);
          setPendingAction(null);
          logActivity(pendingAction?.type || 'ACTION', 'CANCELLED', { cancelledBy: 'Owner' });
        }}
        pinRequired={ownerProfile.pinRequiredForActions}
        correctPin={ownerProfile.securityPin}
        isCompanionOnline={companionState.online}
      />

      {/* Voice Enrollment & Identity Modal */}
      <VoiceEnrollmentModal
        isOpen={isVoiceEnrollmentOpen}
        onClose={() => setIsVoiceEnrollmentOpen(false)}
        profile={ownerProfile}
        onSaveProfile={(prof) => {
          setOwnerProfile(prof);
          logActivity('PROFILE_UPDATE', 'SUCCESS', { ownerName: prof.ownerName });
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        approvedApps={approvedApps}
        onUpdateApprovedApps={setApprovedApps}
        wakeWordMode={wakeWordMode}
        onToggleWakeWordMode={setWakeWordMode}
        companionState={companionState}
        onUpdateCompanion={(partial) => setCompanionState((prev) => ({ ...prev, ...partial }))}
        ttsVoice={ttsVoice}
        onChangeTtsVoice={setTtsVoice}
        enableSearchGrounding={enableSearchGrounding}
        onToggleSearchGrounding={setEnableSearchGrounding}
        onOpenVoiceEnrollment={() => {
          setIsSettingsOpen(false);
          setIsVoiceEnrollmentOpen(true);
        }}
      />

      {/* Activity Log Drawer */}
      <ActivityLogDrawer
        isOpen={isActivityLogOpen}
        onClose={() => setIsActivityLogOpen(false)}
        logs={activityLogs}
        onClearLogs={() => setActivityLogs([])}
      />

      {/* Windows Companion Guide Modal */}
      <CompanionHelpModal
        isOpen={isCompanionModalOpen}
        onClose={() => setIsCompanionModalOpen(false)}
        companionState={companionState}
        onTestConnection={async () => {
          const res = await checkCompanionStatus(companionState.port);
          setCompanionState((prev) => ({
            ...prev,
            online: res.online,
            latencyMs: res.latencyMs,
            lastChecked: new Date().toLocaleTimeString(),
          }));
        }}
      />

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-rajdhani">
          <div className="relative w-full max-w-md bg-[#020b1c] border-2 border-cyan-400 p-5 rounded-lg shadow-[0_0_35px_rgba(0,240,255,0.3)] text-white">
            <div className="flex items-center justify-between pb-2 border-b border-cyan-500/30 mb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-cyan-400" />
                <h3 className="font-orbitron font-bold text-sm text-cyan-200">
                  KEYBOARD SHORTCUTS
                </h3>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono-tech">
              <div className="flex justify-between py-1 border-b border-cyan-500/10">
                <kbd className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-200 font-bold">Space</kbd>
                <span>Toggle Push-to-Talk Voice Input</span>
              </div>
              <div className="flex justify-between py-1 border-b border-cyan-500/10">
                <kbd className="px-2 py-0.5 rounded bg-red-950 border border-red-500/40 text-red-200 font-bold">Esc</kbd>
                <span>Immediate Emergency Stop (Halt Voice & Actions)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-cyan-500/10">
                <kbd className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-200 font-bold">H</kbd>
                <span>Toggle Hand Gesture Camera Radar</span>
              </div>
              <div className="flex justify-between py-1 border-b border-cyan-500/10">
                <kbd className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-200 font-bold">M</kbd>
                <span>Toggle Mute Voice & Sound Effects</span>
              </div>
              <div className="flex justify-between py-1 border-b border-cyan-500/10">
                <kbd className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-200 font-bold">?</kbd>
                <span>View Shortcuts Cheat-Sheet</span>
              </div>
            </div>

            <div className="mt-4 text-right">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-1.5 rounded bg-cyan-500 text-slate-950 font-bold text-xs"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
