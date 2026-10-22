/**
 * Speech Recognition, Voice Synthesis & HUD Sound Effects
 * Supports Tamil, English, and Tanglish with Web Audio synthesized SFX
 */

// Web Audio API Synthesizer for futuristic HUD sounds
class SoundFX {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Futuristic activation chirp
  playActivate() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.16); // D6

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (_e) {}
  }

  // Deactivation / Stop tone
  playDeactivate() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (_e) {}
  }

  // Success Confirmation Beep
  playSuccess() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(783.99, now + 0.08); // G5

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (_e) {}
  }

  // Warning or stop pulse
  playAlert() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(196, now + 0.1);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (_e) {}
  }
}

export const soundFX = new SoundFX();

// Current Audio Player reference for stop commands
let currentAudioElement: HTMLAudioElement | null = null;

export function stopAllSpeech() {
  soundFX.playDeactivate();

  // Stop HTML audio if playing
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
      currentAudioElement = null;
    } catch (_e) {}
  }

  // Stop browser synthesis
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Speak aloud: first tries Gemini Base64 audio, falls back to Web Speech Synthesis
export async function speakAloud(
  text: string,
  base64Audio?: string,
  languageHint: 'tamil' | 'english' | 'auto' = 'auto',
  onEnd?: () => void
): Promise<void> {
  stopAllSpeech();

  // If Gemini TTS provided WAV audio
  if (base64Audio) {
    try {
      const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
      currentAudioElement = audio;
      audio.onended = () => {
        currentAudioElement = null;
        if (onEnd) onEnd();
      };
      audio.onerror = () => {
        fallbackBrowserSpeech(text, languageHint, onEnd);
      };
      await audio.play();
      return;
    } catch (e) {
      console.warn('HTML5 Audio playback failed, falling back to Web Speech:', e);
    }
  }

  fallbackBrowserSpeech(text, languageHint, onEnd);
}

function fallbackBrowserSpeech(
  text: string,
  languageHint: 'tamil' | 'english' | 'auto',
  onEnd?: () => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  // Remove markdown symbols or action code blocks before speaking
  const cleanSpeechText = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[.*?\]\(.*?\)/g, '')
    .replace(/[*_#`~>]/g, '')
    .trim();

  if (!cleanSpeechText) {
    if (onEnd) onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
  const voices = window.speechSynthesis.getVoices();

  // Check if text has Tamil characters
  const containsTamil = /[\u0B80-\u0BFF]/.test(cleanSpeechText);

  if (containsTamil || languageHint === 'tamil') {
    // Look for Tamil voice (e.g., ta-IN, ta-LK)
    const tamilVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith('ta') ||
        v.name.toLowerCase().includes('tamil') ||
        v.name.toLowerCase().includes('valluvar')
    );
    if (tamilVoice) {
      utterance.voice = tamilVoice;
      utterance.lang = tamilVoice.lang;
    } else {
      utterance.lang = 'ta-IN';
    }
    utterance.rate = 0.95;
  } else {
    // English voice (prefer Indian English or Natural English)
    const englishVoice = voices.find(
      (v) =>
        v.lang === 'en-IN' ||
        v.name.includes('Natural') ||
        v.lang === 'en-US' ||
        v.lang.startsWith('en')
    );
    if (englishVoice) {
      utterance.voice = englishVoice;
      utterance.lang = englishVoice.lang;
    }
    utterance.rate = 1.0;
  }

  utterance.onend = () => {
    if (onEnd) onEnd();
  };

  utterance.onerror = () => {
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
}

export interface SpeechRecognitionResultPayload {
  transcript: string;
  isFinal: boolean;
  containsWakeWord: boolean;
  containsEmergencyStop: boolean;
}

// Browser Web Speech Recognition Wrapper
export class SpeechListener {
  private recognition: any = null;
  public isListening: boolean = false;
  private onResultCallback?: (result: SpeechRecognitionResultPayload) => void;
  private onErrorCallback?: (error: string) => void;
  private onEndCallback?: () => void;
  public targetLang: string = 'en-US';

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        this.recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const piece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += piece;
            } else {
              interimTranscript += piece;
            }
          }

          const currentText = (finalTranscript || interimTranscript).trim();
          const lower = currentText.toLowerCase();

          const containsWakeWord = lower.includes('elask') || lower.includes('இலாஸ்க்');
          const containsEmergencyStop =
            lower.includes('elask stop') ||
            lower.includes('stop elask') ||
            lower.includes('stop stop') ||
            lower.includes('நிறுத்து');

          if (this.onResultCallback) {
            this.onResultCallback({
              transcript: currentText,
              isFinal: Boolean(finalTranscript),
              containsWakeWord,
              containsEmergencyStop,
            });
          }
        };

        this.recognition.onerror = (e: any) => {
          if (e.error !== 'no-speech') {
            console.warn('Speech Recognition notice:', e.error);
            if (this.onErrorCallback) this.onErrorCallback(e.error);
          }
        };

        this.recognition.onend = () => {
          this.isListening = false;
          if (this.onEndCallback) this.onEndCallback();
        };
      }
    }
  }

  start(
    lang: string,
    onResult: (result: SpeechRecognitionResultPayload) => void,
    onError?: (error: string) => void,
    onEnd?: () => void
  ) {
    if (!this.recognition) {
      if (onError) onError('Browser SpeechRecognition not supported in this browser.');
      return;
    }

    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onEndCallback = onEnd;
    this.targetLang = lang;

    try {
      this.recognition.lang = lang;
      this.recognition.start();
      this.isListening = true;
      soundFX.playActivate();
    } catch (_e) {
      // already started or busy
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (_e) {}
      this.isListening = false;
      soundFX.playDeactivate();
    }
  }

  isSupported(): boolean {
    return Boolean(this.recognition);
  }
}
