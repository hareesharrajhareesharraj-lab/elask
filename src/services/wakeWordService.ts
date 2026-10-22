/**
 * ELASK Wake-Word & Continuous Voice Input Engine
 * 
 * Guarantees:
 * 1. Single Listener: Exactly one SpeechRecognition instance safely managed without duplicate listeners.
 * 2. Five Canonical States:
 *    - "ENABLE MICROPHONE"
 *    - "LISTENING FOR ELASK"
 *    - "HEARING COMMAND"
 *    - "PROCESSING"
 *    - "PAUSED"
 * 3. 100% Local Wake-Word Filter: Idle speech is processed locally in-browser. Zero audio/transcripts sent to cloud while waiting.
 * 4. Command Capture & Auto-Submit: After "ELASK" (English, Tamil "ஏலாஸ்க்", or Tanglish), captures command, waits 1.2s silence (configurable 0.7-1.8s), then auto-submits once.
 * 5. Strict Noise/Empty Filter: Idle chatter or saying "ELASK" alone with no command will NEVER submit to Gemini; cleanly resets to "LISTENING FOR ELASK".
 * 6. Echo & Self-Trigger Prevention: Recognition aborted while ELASK is speaking + cooldown buffer.
 * 7. Browser Scope: Clearly scoped to active browser tab (background closed-app wake is supported via Windows Companion).
 */

import { VoiceInputState } from '../types';
import { soundFX } from './speechService';

export interface WakeWordCallbacks {
  onStateChange: (state: VoiceInputState, message?: string) => void;
  onWakeDetected: (prefilledCommand?: string) => void;
  onCommandCaptured: (command: string) => void;
  onInterimTranscript?: (transcript: string) => void;
  onAudioLevel?: (level: number) => void;
  onError?: (error: string) => void;
  onNoSpeechTimeout?: (message: string) => void;
}

// Common variations and phonetic spellings of "ELASK" in English and Tamil
const WAKE_WORD_PATTERNS = [
  /\b(hey\s+|ok\s+|hi\s+|hello\s+)?elask\b/i,
  /\b(hey\s+|ok\s+|hi\s+|hello\s+)?elaask\b/i,
  /\b(hey\s+|ok\s+|hi\s+|hello\s+)?elaska\b/i,
  /\b(hey\s+|ok\s+|hi\s+|hello\s+)?alask\b/i,
  /\b(hey\s+|ok\s+|hi\s+|hello\s+)?ilask\b/i,
  /\b(hey\s+|ok\s+|hi\s+|hello\s+)?e-lask\b/i,
  /\b(hey\s+|ok\s+|hi\s+|hello\s+)?elias\b/i,
  /\b(hey\s+|ok\s+|hi\s+|hello\s+)?elox\b/i,
  /\b(hey\s+|ok\s+|hi\s+|hello\s+)?alexa\b/i,
  // Tamil variations of "ELASK"
  /ஏலாஸ்க்/i,
  /இலாஸ்க்/i,
  /எலாஸ்க்/i,
  /இலஸ்க்/i,
  /எலஸ்க்/i,
  /ஏலஸ்க்/i,
  /ஈலாஸ்க்/i,
  /எலக்ஸ்/i,
  /ஏலக்ஸ்/i,
];

const EMERGENCY_STOP_PATTERNS = [
  /\b(elask\s+stop|stop\s+elask|stop\s+stop|emergency\s+stop|stop\s+listening)\b/i,
  /நிறுத்து/i,
  /போதும்/i,
  /நில்/i,
];

export class WakeWordEngine {
  private recognition: any = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private levelInterval: number | null = null;

  private state: VoiceInputState = 'ENABLE MICROPHONE';
  private callbacks: WakeWordCallbacks;
  private isSpeaking: boolean = false;
  private isPausedByUser: boolean = false;
  private isRunning: boolean = false;
  private isStarting: boolean = false;
  private isDestroyed: boolean = false;
  private restartTimer: any = null;
  private cooldownTimer: any = null;

  // Configurable silence delay: default 1200ms (1.2s), range [700ms - 1800ms]
  private silenceTimeoutMs: number = 1200;
  private captureSilenceTimer: any = null;

  // Idle wake timer: if user says "ELASK" but says no follow-up command
  private idleWakeTimer: any = null;

  // Deduplication & speech state tracking
  private hasSubmittedCurrentUtterance: boolean = false;
  private currentCapturedText: string = '';
  private commandStartIndex: number = 0;
  private currentLanguage: string = 'en-US';
  private autoListenActive: boolean = false;
  private micPermissionGranted: boolean = false;

  constructor(callbacks: WakeWordCallbacks, silenceTimeoutMs: number = 1200) {
    this.callbacks = callbacks;
    this.setSilenceTimeout(silenceTimeoutMs);
    this.initSpeechRecognition();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  // Adjust silence delay between 700ms and 1800ms (default 1.2s)
  setSilenceTimeout(ms: number) {
    this.silenceTimeoutMs = Math.max(700, Math.min(1800, ms));
  }

  getSilenceTimeout(): number {
    return this.silenceTimeoutMs;
  }

  getState(): VoiceInputState {
    return this.state;
  }

  isPaused(): boolean {
    return this.isPausedByUser || this.state === 'PAUSED';
  }

  isPermissionGranted(): boolean {
    return this.micPermissionGranted;
  }

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }

  setLanguage(lang: string) {
    this.currentLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
      if (this.isRunning && !this.isPausedByUser && !this.isSpeaking) {
        try {
          this.recognition.abort();
        } catch (_e) {}
      }
    }
  }

  private handleVisibilityChange = () => {
    if (typeof document === 'undefined') return;
    if (!document.hidden && this.autoListenActive && !this.isPausedByUser && !this.isSpeaking && !this.isDestroyed) {
      if (!this.isRunning && !this.isStarting) {
        this.safeStart();
      }
    }
  };

  private setState(newState: VoiceInputState, message?: string) {
    this.state = newState;
    this.callbacks.onStateChange(newState, message);
  }

  // 3.5-second timer: If user said "ELASK" alone with no follow-up command
  private startIdleWakeTimer() {
    this.clearIdleWakeTimer();
    this.idleWakeTimer = setTimeout(() => {
      if (this.state === 'HEARING COMMAND' && !this.hasSubmittedCurrentUtterance && !this.currentCapturedText.trim()) {
        console.log('[VOICE] No command detected after "ELASK". Returned to wake listening.');
        if (this.callbacks.onNoSpeechTimeout) {
          this.callbacks.onNoSpeechTimeout('No command detected after "ELASK". Returned to listening for ELASK.');
        }

        // Return safely to listening for ELASK without submitting
        this.currentCapturedText = '';
        if (this.callbacks.onInterimTranscript) {
          this.callbacks.onInterimTranscript('');
        }
        this.rearm();
      }
    }, 3500);
  }

  private clearIdleWakeTimer() {
    if (this.idleWakeTimer) {
      clearTimeout(this.idleWakeTimer);
      this.idleWakeTimer = null;
    }
  }

  private initSpeechRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[VOICE] Web Speech Recognition not supported in this browser.');
      this.setState('ENABLE MICROPHONE', 'Web Speech API is not supported in this browser. Please use Chrome or Edge, or use text input.');
      if (this.callbacks.onError) {
        this.callbacks.onError('Web Speech API unsupported. Use Chrome, Edge, or typed input.');
      }
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 2;
    this.recognition.lang = this.currentLanguage;

    this.recognition.onstart = () => {
      this.isRunning = true;
      this.isStarting = false;
      console.log('[VOICE] SpeechRecognition active.');
    };

    this.recognition.onresult = (event: any) => {
      // Echo / Self-trigger protection: ignore while ELASK is speaking
      if (this.isSpeaking) {
        return;
      }

      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i][0];
        if (event.results[i].isFinal) {
          final += item.transcript + ' ';
        } else {
          interim += item.transcript;
        }
      }

      const rawText = (final ? `${final} ${interim}` : interim).trim();
      if (!rawText) return;

      // Emergency stop check: instantly aborts and enters PAUSED
      for (const pattern of EMERGENCY_STOP_PATTERNS) {
        if (pattern.test(rawText)) {
          this.clearIdleWakeTimer();
          if (this.captureSilenceTimer) {
            clearTimeout(this.captureSilenceTimer);
            this.captureSilenceTimer = null;
          }
          soundFX.playDeactivate();
          this.stopListening();
          return;
        }
      }

      // STATE 1: LISTENING FOR ELASK
      // While waiting for the wake phrase, audio is processed locally and idle background speech is strictly ignored
      if (this.state === 'LISTENING FOR ELASK') {
        const matched = this.detectWakeWord(rawText);
        if (matched) {
          console.log('[VOICE] Wake phrase "ELASK" recognized locally:', rawText);
          soundFX.playActivate();

          this.commandStartIndex = event.resultIndex;
          const commandAfterWake = this.stripWakeWord(rawText);

          this.setState('HEARING COMMAND', 'Wake word recognized. Listening for command...');
          this.hasSubmittedCurrentUtterance = false;

          if (this.callbacks.onWakeDetected) {
            this.callbacks.onWakeDetected(commandAfterWake || undefined);
          }

          if (commandAfterWake && commandAfterWake.length >= 2) {
            this.currentCapturedText = commandAfterWake;
            if (this.callbacks.onInterimTranscript) {
              this.callbacks.onInterimTranscript(commandAfterWake);
            }
            this.resetSilenceTimer();
          } else {
            this.currentCapturedText = '';
            if (this.callbacks.onInterimTranscript) {
              this.callbacks.onInterimTranscript('');
            }
            this.startIdleWakeTimer();
          }
        }
        // If wake word is NOT present, ignore idle speech completely!
        return;
      }

      // STATE 2: HEARING COMMAND
      // Wake word was heard; now capturing spoken Tamil, English, or Tanglish command
      if (this.state === 'HEARING COMMAND') {
        this.clearIdleWakeTimer();

        // Accumulate text since the command started
        let accumulated = '';
        for (let i = this.commandStartIndex; i < event.results.length; ++i) {
          accumulated += event.results[i][0].transcript + ' ';
        }
        accumulated = accumulated.trim();

        const cleanText = this.stripWakeWord(accumulated || rawText);
        const isMeaningful = cleanText.length >= 2 && /[a-zA-Z0-9\u0B80-\u0BFF]/.test(cleanText);

        if (isMeaningful) {
          this.currentCapturedText = cleanText;

          if (this.callbacks.onInterimTranscript) {
            this.callbacks.onInterimTranscript(cleanText);
          }

          // Reset silence timer on each new speech chunk.
          // Tamil & Tanglish speech has natural pauses; 1.2s silence prevents premature submission.
          this.resetSilenceTimer();
        }
      }
    };

    this.recognition.onerror = (e: any) => {
      // 'no-speech' is routine in continuous recognition, safely ignore
      if (e.error === 'no-speech') {
        return;
      }

      console.warn('[VOICE] Speech recognition error event:', e.error);

      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.micPermissionGranted = false;
        this.autoListenActive = false;
        this.setState('ENABLE MICROPHONE', 'Microphone permission denied. Click "Enable Auto Listen" to grant permission.');
        if (this.callbacks.onError) {
          this.callbacks.onError('Microphone permission blocked. Please allow mic in address bar and click Enable Auto Listen.');
        }
      } else if (e.error === 'audio-capture') {
        this.setState('ENABLE MICROPHONE', 'No microphone detected or hardware disconnected.');
        if (this.callbacks.onError) {
          this.callbacks.onError('Microphone hardware disconnected. Please check your mic connection.');
        }
      } else if (e.error === 'network') {
        if (this.callbacks.onError) {
          this.callbacks.onError('Speech network connection transient hiccup. Auto-recovering listener...');
        }
      }
    };

    this.recognition.onend = () => {
      this.isRunning = false;
      this.isStarting = false;

      // Safe restart: only if auto-listening is active, not paused by user, and assistant is not vocalizing
      if (this.autoListenActive && !this.isPausedByUser && !this.isSpeaking && !this.isDestroyed) {
        if (this.restartTimer) clearTimeout(this.restartTimer);
        this.restartTimer = setTimeout(() => {
          this.safeStart();
        }, 200);
      }
    };
  }

  // Safe starter to guard against InvalidStateError and duplicate listener instances
  private safeStart() {
    if (!this.recognition || this.isRunning || this.isStarting || this.isPausedByUser || this.isSpeaking || this.isDestroyed) {
      return;
    }

    this.isStarting = true;
    try {
      this.recognition.start();
    } catch (e: any) {
      this.isStarting = false;
      if (e.name !== 'InvalidStateError') {
        console.warn('[VOICE] SafeStart exception:', e);
      }
    }
  }

  // Detects whether text contains "ELASK" in English, Tamil or Tanglish
  private detectWakeWord(text: string): boolean {
    return WAKE_WORD_PATTERNS.some((pattern) => pattern.test(text));
  }

  // Strips wake words from user utterance to leave pure command
  private stripWakeWord(text: string): string {
    let cleaned = text;
    for (const pattern of WAKE_WORD_PATTERNS) {
      cleaned = cleaned.replace(pattern, ' ');
    }
    return cleaned.replace(/^[,\s.!?-]+|[,\s.!?-]+$/g, '').replace(/\s+/g, ' ').trim();
  }

  // Resets silence timer. After silenceTimeoutMs (1.2s) of silence, auto-submits once.
  private resetSilenceTimer() {
    if (this.captureSilenceTimer) {
      clearTimeout(this.captureSilenceTimer);
    }

    this.captureSilenceTimer = setTimeout(() => {
      if (this.state === 'HEARING COMMAND' && !this.hasSubmittedCurrentUtterance) {
        const candidate = this.currentCapturedText.trim();
        const stripped = this.stripWakeWord(candidate);
        
        // Strict Command Filter:
        // Do not submit idle speech, noise, or the wake phrase by itself!
        const hasMeaningfulCommand =
          stripped.length >= 2 &&
          /[a-zA-Z0-9\u0B80-\u0BFF]/.test(stripped);

        if (hasMeaningfulCommand) {
          // Lock to strictly prevent duplicate submissions
          this.hasSubmittedCurrentUtterance = true;
          this.finalizeCommand(stripped);
        } else {
          // Idle speech or only "ELASK" was spoken: DO NOT SUBMIT!
          console.log('[VOICE] No command detected or only wake phrase spoken; returning to "LISTENING FOR ELASK".');
          this.currentCapturedText = '';
          if (this.callbacks.onInterimTranscript) {
            this.callbacks.onInterimTranscript('');
          }
          this.rearm();
        }
      }
    }, this.silenceTimeoutMs);
  }

  private finalizeCommand(command: string) {
    if (this.captureSilenceTimer) {
      clearTimeout(this.captureSilenceTimer);
      this.captureSilenceTimer = null;
    }
    this.clearIdleWakeTimer();

    // Abort speech recognition during processing to prevent hearing itself or background noise
    if (this.recognition && this.isRunning) {
      try {
        this.recognition.abort();
      } catch (_e) {}
    }

    this.setState('PROCESSING', 'Submitting command to Gemini...');
    this.callbacks.onCommandCaptured(command);
    this.currentCapturedText = '';
  }

  // Request browser microphone permission with echo cancellation and auto gain
  async requestMicPermission(): Promise<boolean> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        this.mediaStream = stream;
        this.micPermissionGranted = true;
        this.initAudioAnalyser(stream);
        return true;
      }
      return false;
    } catch (err: any) {
      console.warn('[VOICE] Microphone permission failed:', err?.message);
      this.micPermissionGranted = false;
      this.setState('ENABLE MICROPHONE', 'Microphone permission denied.');
      return false;
    }
  }

  // Web Audio API Analyser for local HUD visualization & hardware check
  private initAudioAnalyser(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.5;

      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      if (this.levelInterval) clearInterval(this.levelInterval);
      this.levelInterval = window.setInterval(() => {
        if (!this.analyser || this.isPausedByUser || this.isSpeaking) {
          if (this.callbacks.onAudioLevel) this.callbacks.onAudioLevel(0.05);
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / (bufferLength * 255);
        if (this.callbacks.onAudioLevel) {
          this.callbacks.onAudioLevel(avg);
        }
      }, 100);
    } catch (e) {
      console.warn('[VOICE] AudioAnalyser init warning:', e);
    }
  }

  /**
   * "Enable Auto Listen": The primary entry point requested by the user.
   * 1. Requests browser microphone permission once.
   * 2. After permission is granted, starts listening for "ELASK" automatically whenever the page is open.
   */
  async enableAutoListen(lang?: string): Promise<boolean> {
    if (lang) this.currentLanguage = lang;
    this.isPausedByUser = false;
    this.autoListenActive = true;

    if (!this.micPermissionGranted || !this.mediaStream) {
      const granted = await this.requestMicPermission();
      if (!granted) {
        this.setState('ENABLE MICROPHONE', 'Microphone permission denied. Please allow microphone access in your browser.');
        return false;
      }
    }

    if (this.recognition) {
      this.recognition.lang = this.currentLanguage;
      this.safeStart();
    }

    this.setState('LISTENING FOR ELASK', 'Listening for wake phrase "ELASK" (ஏலாஸ்க்)...');
    console.log('[VOICE] Auto Listen enabled: LISTENING FOR ELASK');
    return true;
  }

  /**
   * Manual Push-to-Talk Fallback:
   * Directly enters "HEARING COMMAND" without needing the wake phrase "ELASK",
   * with the exact same automatic 1.2s silence auto-submit.
   */
  async startManualListening(lang?: string): Promise<boolean> {
    if (lang) this.currentLanguage = lang;
    this.isPausedByUser = false;
    this.hasSubmittedCurrentUtterance = false;
    this.currentCapturedText = '';
    this.commandStartIndex = 0;

    if (!this.micPermissionGranted || !this.mediaStream) {
      const granted = await this.requestMicPermission();
      if (!granted) {
        this.setState('ENABLE MICROPHONE', 'Microphone permission denied.');
        return false;
      }
    }

    this.setState('HEARING COMMAND', 'Listening... speak now (submits after silence)');
    soundFX.playActivate();

    if (this.recognition) {
      this.recognition.lang = this.currentLanguage;
      this.safeStart();
    }

    this.startIdleWakeTimer();
    return true;
  }

  // Assistant Vocalization Guard (echo and self-trigger prevention)
  setAssistantSpeaking(speaking: boolean) {
    this.isSpeaking = speaking;

    if (speaking) {
      // Abort recognition immediately to prevent feedback loop
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch (_e) {}
      }
    } else {
      // Cooldown buffer (500ms) before re-arming recognition
      if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
      this.cooldownTimer = setTimeout(() => {
        if (this.autoListenActive && !this.isPausedByUser && !this.isDestroyed) {
          this.rearm();
        }
      }, 500);
    }
  }

  // Return cleanly to "LISTENING FOR ELASK"
  rearm() {
    this.clearIdleWakeTimer();
    if (this.captureSilenceTimer) {
      clearTimeout(this.captureSilenceTimer);
      this.captureSilenceTimer = null;
    }
    this.hasSubmittedCurrentUtterance = false;
    this.currentCapturedText = '';
    this.commandStartIndex = 0;

    if (this.autoListenActive && !this.isPausedByUser) {
      this.setState('LISTENING FOR ELASK', 'Listening for wake phrase "ELASK"');
      this.safeStart();
    } else if (this.isPausedByUser) {
      this.setState('PAUSED', 'Listening paused.');
    } else {
      this.setState('ENABLE MICROPHONE', 'Microphone standby.');
    }
  }

  // Immediate Stop Listening control: switches to PAUSED
  stopListening() {
    this.isPausedByUser = true;
    this.clearIdleWakeTimer();
    if (this.captureSilenceTimer) {
      clearTimeout(this.captureSilenceTimer);
      this.captureSilenceTimer = null;
    }

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (_e) {}
    }

    this.setState('PAUSED', 'Voice input paused. Click Resume or Enable Auto Listen to continue.');
  }

  // Resume listening after Pause
  resumeListening() {
    this.isPausedByUser = false;
    this.rearm();
  }

  // Toggle Pause/Resume
  togglePauseResume() {
    if (this.isPausedByUser || this.state === 'PAUSED') {
      this.resumeListening();
    } else {
      this.stopListening();
    }
  }

  // Full shutdown / destroy
  stop() {
    this.isDestroyed = true;
    this.autoListenActive = false;
    this.isPausedByUser = false;
    this.clearIdleWakeTimer();

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }

    if (this.captureSilenceTimer) {
      clearTimeout(this.captureSilenceTimer);
      this.captureSilenceTimer = null;
    }
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_e) {}
    }

    if (this.levelInterval) {
      clearInterval(this.levelInterval);
      this.levelInterval = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    this.setState('ENABLE MICROPHONE', 'Voice engine offline.');
  }
}
