import React, { useRef, useEffect } from 'react';
import {
  Volume2,
  ExternalLink,
  Bot,
  User,
  ShieldAlert,
  Play,
  Share2,
  Sparkles,
  Loader2,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { ChatMessage, ActionPayload } from '../types';

interface TranscriptFeedProps {
  messages: ChatMessage[];
  interimTranscript: string;
  isLoading?: boolean;
  onReplayAudio: (text: string, audioUrl?: string) => void;
  onExecuteAction: (action: ActionPayload) => void;
  isCompanionOnline: boolean;
  onQuickPrompt?: (prompt: string) => void;
  onRetryPrompt?: (prompt: string) => void;
}

export const TranscriptFeed: React.FC<TranscriptFeedProps> = ({
  messages,
  interimTranscript,
  isLoading = false,
  onReplayAudio,
  onExecuteAction,
  isCompanionOnline,
  onQuickPrompt,
  onRetryPrompt,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 font-rajdhani text-sm">
      {messages.length === 0 && !interimTranscript && !isLoading && (
        <div className="flex flex-col items-center justify-center text-center py-6 text-cyan-300/50">
          <Bot className="w-10 h-10 mb-2 opacity-40 animate-pulse text-cyan-400" />
          <p className="font-orbitron text-base text-cyan-200 tracking-wider">
            ELASK BILINGUAL INTERACTION LOG
          </p>
          <p className="font-chakra text-xs text-cyan-400/70 max-w-md mt-1">
            Speak in Tamil (தமிழ்), English, or Tanglish, or click any quick prompt below to test chat immediately:
          </p>

          {/* Clickable Quick Prompts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-xs font-mono-tech text-left max-w-lg w-full">
            <button
              onClick={() => onQuickPrompt?.("வணக்கம் ELASK! நீங்கள் யார்?")}
              className="p-2.5 rounded bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-300 hover:bg-cyan-900/40 text-cyan-200 text-left transition-all group"
            >
              <div className="text-cyan-400 font-bold group-hover:text-white flex items-center justify-between">
                <span>&bull; தமிழ் (Tamil) Intro</span>
                <span className="text-[10px] text-cyan-500 opacity-0 group-hover:opacity-100">CLICK TO SEND &rarr;</span>
              </div>
              <div className="text-[11px] text-cyan-300/80 truncate mt-0.5">
                "வணக்கம் ELASK! நீங்கள் யார்?"
              </div>
            </button>

            <button
              onClick={() => onQuickPrompt?.("Edge browser open பண்ணுங்க")}
              className="p-2.5 rounded bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-300 hover:bg-cyan-900/40 text-cyan-200 text-left transition-all group"
            >
              <div className="text-cyan-400 font-bold group-hover:text-white flex items-center justify-between">
                <span>&bull; Tanglish App Action</span>
                <span className="text-[10px] text-cyan-500 opacity-0 group-hover:opacity-100">CLICK TO SEND &rarr;</span>
              </div>
              <div className="text-[11px] text-cyan-300/80 truncate mt-0.5">
                "Edge browser open பண்ணுங்க"
              </div>
            </button>

            <button
              onClick={() => onQuickPrompt?.("What are your capabilities as my Windows assistant?")}
              className="p-2.5 rounded bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-300 hover:bg-cyan-900/40 text-cyan-200 text-left transition-all group"
            >
              <div className="text-cyan-400 font-bold group-hover:text-white flex items-center justify-between">
                <span>&bull; English Capabilities</span>
                <span className="text-[10px] text-cyan-500 opacity-0 group-hover:opacity-100">CLICK TO SEND &rarr;</span>
              </div>
              <div className="text-[11px] text-cyan-300/80 truncate mt-0.5">
                "What are your capabilities as my Windows assistant?"
              </div>
            </button>

            <button
              onClick={() => onQuickPrompt?.("Latest technology news today")}
              className="p-2.5 rounded bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-300 hover:bg-cyan-900/40 text-cyan-200 text-left transition-all group"
            >
              <div className="text-cyan-400 font-bold group-hover:text-white flex items-center justify-between">
                <span>&bull; Google Search Grounding</span>
                <span className="text-[10px] text-cyan-500 opacity-0 group-hover:opacity-100">CLICK TO SEND &rarr;</span>
              </div>
              <div className="text-[11px] text-cyan-300/80 truncate mt-0.5">
                "Latest technology news today"
              </div>
            </button>
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex flex-col ${
            msg.role === 'user' ? 'items-end' : 'items-start'
          }`}
        >
          {/* Sender & Timestamp Header */}
          <div className="flex items-center gap-2 mb-1 text-[11px] font-mono-tech text-cyan-400/60">
            {msg.role === 'user' ? (
              <>
                <span>{msg.timestamp}</span>
                <span className="text-cyan-300 font-bold flex items-center gap-1">
                  OWNER <User className="w-3 h-3" />
                </span>
              </>
            ) : (
              <>
                <span className={`font-bold flex items-center gap-1 ${msg.isError ? 'text-red-400' : 'text-cyan-300'}`}>
                  {msg.isError ? <ShieldAlert className="w-3 h-3 text-red-400" /> : <Bot className="w-3 h-3 text-cyan-400" />}
                  ELASK
                </span>
                <span className="text-cyan-500/70 font-mono-tech">
                  {msg.modelUsed ? `[${msg.modelUsed}]` : msg.languageDetected ? `[${msg.languageDetected}]` : '[GEMINI]'}
                </span>
                <span>{msg.timestamp}</span>
              </>
            )}
          </div>

          {/* Message Content Bubble */}
          <div
            className={`relative max-w-xl p-3.5 rounded-lg border backdrop-blur-md ${
              msg.role === 'user'
                ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-100 rounded-tr-none'
                : msg.isError
                ? 'bg-red-950/60 border-red-500/60 text-red-100 rounded-tl-none shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                : 'bg-[#03112a]/80 border-cyan-400/30 text-slate-100 rounded-tl-none shadow-[0_0_15px_rgba(0,240,255,0.1)]'
            }`}
          >
            {/* Corner accents for scifi look */}
            <div className={`hud-corner-tl !w-2 !h-2 ${msg.isError ? '!border-red-400' : '!border-cyan-400/40'}`} />
            <div className={`hud-corner-br !w-2 !h-2 ${msg.isError ? '!border-red-400' : '!border-cyan-400/40'}`} />

            {/* Error header if applicable */}
            {msg.isError && (
              <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-red-500/30 text-red-300 font-mono-tech text-xs font-bold">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span>SERVER / GEMINI API NOTICE:</span>
              </div>
            )}

            <div className="whitespace-pre-wrap leading-relaxed text-sm font-rajdhani font-medium">
              {msg.text}
            </div>

            {/* Retry Button on Error */}
            {msg.isError && msg.retryablePrompt && (
              <div className="mt-3 pt-2.5 border-t border-red-500/30 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-mono-tech text-red-300">
                  {msg.isUnavailable
                    ? 'Temporary high demand (503). Tap to retry now:'
                    : 'Click retry to resend query to Gemini:'}
                </span>
                <button
                  onClick={() => onRetryPrompt?.(msg.retryablePrompt!)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-red-900/80 hover:bg-red-800 text-white font-rajdhani font-bold text-xs border border-red-400/60 shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all active:scale-95 disabled:opacity-50"
                  title="Retry sending this message to Gemini"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>RETRY QUERY</span>
                </button>
              </div>
            )}

            {/* If audio available, button to listen again */}
            {msg.role === 'assistant' && !msg.isError && (
              <div className="mt-2.5 pt-2 border-t border-cyan-500/15 flex items-center justify-between text-xs font-mono-tech">
                <button
                  onClick={() => onReplayAudio(msg.text, msg.audioUrl)}
                  className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-200 transition-colors"
                  title="Speak again"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>REPEAT AUDIO</span>
                </button>
                <span className="text-cyan-500/60 text-[10px]">
                  Google GenAI &bull; {msg.modelUsed || 'gemini-3.5-flash'}
                </span>
              </div>
            )}

            {/* Search Grounding Sources */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-cyan-500/20">
                <div className="flex items-center gap-1.5 text-xs font-mono-tech text-cyan-400 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>VERIFIED WEB SOURCES (GOOGLE SEARCH GROUNDING):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {msg.sources.map((src, idx) => (
                    <a
                      key={idx}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-[11px] text-cyan-200 hover:bg-cyan-800/60 hover:border-cyan-300 transition-all"
                    >
                      <ExternalLink className="w-2.5 h-2.5 text-cyan-400" />
                      <span className="truncate max-w-[200px]">{src.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Embedded Action Card */}
            {msg.action && (
              <div className="mt-3 p-3 rounded bg-cyan-950/70 border border-cyan-400/50 shadow-inner">
                <div className="flex items-center justify-between gap-2 text-xs font-mono-tech mb-2">
                  <span className="flex items-center gap-1.5 text-cyan-300 font-bold uppercase">
                    <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                    ACTION INTENT: {msg.action.type}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                      isCompanionOnline
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                        : 'bg-orange-950/80 text-orange-300 border border-orange-500/40'
                    }`}
                  >
                    {isCompanionOnline ? 'READY ON COMPANION' : 'NEEDS WINDOWS COMPANION'}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-200 font-mono-tech">
                  {msg.action.appName && (
                    <div>
                      <span className="text-cyan-400">Target App:</span>{' '}
                      <span className="font-bold text-white">{msg.action.appName}</span>
                    </div>
                  )}
                  {msg.action.url && (
                    <div>
                      <span className="text-cyan-400">URL:</span>{' '}
                      <span className="underline text-cyan-200 break-all">{msg.action.url}</span>
                    </div>
                  )}
                  {msg.action.recipient && (
                    <div>
                      <span className="text-cyan-400">Recipient:</span>{' '}
                      <span className="font-bold text-white">{msg.action.recipient}</span>
                    </div>
                  )}
                  {msg.action.message && (
                    <div className="p-2 rounded bg-black/40 border border-cyan-500/20 text-cyan-100 italic">
                      "{msg.action.message}"
                    </div>
                  )}
                  {msg.action.zoomDirection && (
                    <div>
                      <span className="text-cyan-400">Zoom:</span>{' '}
                      <span className="font-bold uppercase text-white">{msg.action.zoomDirection}</span> in {msg.action.targetWindow || 'Active Window'}
                    </div>
                  )}
                  {msg.action.explanation && (
                    <div className="text-slate-400 text-[11px]">{msg.action.explanation}</div>
                  )}
                </div>

                {/* Execute button */}
                <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-cyan-500/20">
                  <span className="text-[10px] text-cyan-400/70 font-mono-tech">
                    {isCompanionOnline ? 'Owner verification active' : 'Runs via Windows companion on 127.0.0.1:9123'}
                  </span>
                  <button
                    onClick={() => msg.action && onExecuteAction(msg.action)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-cyan-500 text-slate-950 font-rajdhani font-bold hover:bg-cyan-400 transition-all shadow-[0_0_10px_rgba(0,240,255,0.4)] text-xs active:scale-95"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>CONFIRM & EXECUTE</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Loading Thinking Indicator Bubble */}
      {isLoading && (
        <div className="flex flex-col items-start animate-fade-in">
          <div className="flex items-center gap-2 mb-1 text-[11px] font-mono-tech text-cyan-400/80">
            <span className="text-cyan-300 font-bold flex items-center gap-1">
              <Bot className="w-3 h-3 text-cyan-400" /> ELASK
            </span>
            <span className="text-amber-400 animate-pulse font-bold">[ANALYZING // GEMINI]</span>
          </div>

          <div className="relative max-w-md p-3.5 rounded-lg border border-cyan-400/60 bg-[#03112a]/90 text-cyan-200 shadow-[0_0_20px_rgba(0,240,255,0.2)] rounded-tl-none">
            <div className="hud-corner-tl !w-2 !h-2 !border-cyan-400" />
            <div className="hud-corner-br !w-2 !h-2 !border-cyan-400" />

            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
              <div className="space-y-0.5">
                <div className="font-orbitron font-bold text-xs tracking-wider text-cyan-200">
                  TRANSMITTING TO GEMINI API...
                </div>
                <div className="text-[11px] font-chakra text-cyan-400/80">
                  Reasoning response in Tamil/English & extracting tool actions
                </div>
              </div>
            </div>

            {/* Glowing progress dots */}
            <div className="mt-2.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
              <span className="text-[10px] font-mono-tech text-cyan-500 ml-1">KERNEL ACTIVE</span>
            </div>
          </div>
        </div>
      )}

      {/* Interim live speech transcript */}
      {interimTranscript && (
        <div className="flex flex-col items-end">
          <div className="text-[11px] font-mono-tech text-cyan-400/70 mb-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>LISTENING...</span>
          </div>
          <div className="max-w-xl p-3 rounded-lg bg-cyan-950/40 border border-cyan-400/50 text-cyan-200 italic font-rajdhani text-sm animate-pulse">
            "{interimTranscript}"
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
