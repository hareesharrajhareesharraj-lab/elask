export type AssistantState = 
  | 'READY' 
  | 'ARMED'
  | 'LISTENING' 
  | 'THINKING' 
  | 'SPEAKING' 
  | 'EXECUTING' 
  | 'PAUSED' 
  | 'NEEDS_SETUP';

export type VoiceInputState =
  | 'ENABLE MICROPHONE'
  | 'LISTENING FOR ELASK'
  | 'HEARING COMMAND'
  | 'PROCESSING'
  | 'PAUSED';

export type WakeWordState =
  | 'OFF'
  | 'ENABLE MICROPHONE'
  | 'LISTENING FOR ELASK'
  | 'HEARING COMMAND'
  | 'ARMED'
  | 'WAKE_DETECTED'
  | 'CAPTURING'
  | 'PROCESSING'
  | 'SPEAKING'
  | 'PAUSED'
  | 'MIC_DENIED'
  | 'MIC_ERROR';

export type LanguageMode = 'auto' | 'tamil' | 'english' | 'tanglish';

export interface GroundingSource {
  title: string;
  url: string;
}

export type ActionType = 
  | 'LAUNCH_APP' 
  | 'OPEN_URL' 
  | 'WHATSAPP_MESSAGE' 
  | 'ZOOM' 
  | 'SYSTEM_CHECK';

export interface ActionPayload {
  type: ActionType;
  appName?: string;
  url?: string;
  recipient?: string;
  message?: string;
  zoomDirection?: 'in' | 'out';
  targetWindow?: string;
  explanation?: string;
  requiresPin?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  languageDetected?: string;
  action?: ActionPayload;
  sources?: GroundingSource[];
  audioUrl?: string;
  isVoiceInput?: boolean;
  isError?: boolean;
  modelUsed?: string;
  isUnavailable?: boolean;
  retryablePrompt?: string;
}

export interface ApprovedApp {
  id: string;
  name: string;
  aliases: string[];
  command?: string;
  category?: string;
  iconName?: string;
  enabled?: boolean;
  description?: string;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  action: string;
  status: 'PENDING' | 'SUCCESS' | 'CANCELLED' | 'DENIED' | 'ERROR' | 'SIMULATED';
  details: any;
}

export interface OwnerVoiceProfile {
  enrolled: boolean;
  enrolledAt?: string;
  ownerName: string;
  pitchBaseline?: number;
  confidenceThreshold: number;
  pinRequiredForActions: boolean;
  securityPin: string;
}

export interface CompanionState {
  online: boolean;
  lastChecked: string;
  port: number;
  token: string;
  os?: string;
  latencyMs?: number;
  wakeListening?: boolean;
  lastWakeDetected?: string;
  detectedCount?: number;
}
