import { ActionPayload, GroundingSource } from '../types';

export interface ChatResponse {
  text: string;
  raw: string;
  action?: ActionPayload | null;
  sources: GroundingSource[];
  model: string;
}

export class GeminiApiError extends Error {
  public status: number;
  public isUnavailable: boolean;

  constructor(message: string, status: number = 500, isUnavailable: boolean = false) {
    super(message);
    this.name = 'GeminiApiError';
    this.status = status;
    this.isUnavailable = isUnavailable;
  }
}

export async function sendChatMessage(
  message: string,
  history: Array<{ role: string; text: string }>,
  languagePreference: string = 'auto',
  ownerName: string = 'Owner',
  enableWebSearch: boolean = true
): Promise<ChatResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history,
      languagePreference,
      ownerName,
      enableWebSearch,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const isUnavailable = res.status === 503 || errorData.isUnavailable === true;
    const errorMsg =
      errorData.error ||
      (isUnavailable
        ? 'All Gemini models are temporarily unavailable due to high demand. Please try again.'
        : `Server responded with status ${res.status}`);

    throw new GeminiApiError(errorMsg, res.status, isUnavailable);
  }

  return res.json();
}

export interface TtsResponse {
  audio?: string;
  mimeType?: string;
  fallbackWebSpeech?: boolean;
  voice?: string;
  error?: string;
}

export async function generateSpeechAudio(
  text: string,
  voice: string = 'Kore'
): Promise<TtsResponse> {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });

    if (!res.ok) {
      return { fallbackWebSpeech: true };
    }

    return await res.json();
  } catch (_e) {
    return { fallbackWebSpeech: true };
  }
}
