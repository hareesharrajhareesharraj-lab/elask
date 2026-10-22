import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Phone,
  AlertCircle,
  ExternalLink,
  Check,
  Plus,
} from 'lucide-react';

interface WhatsAppCardProps {
  onDraftSent: (recipient: string, message: string, url: string) => void;
  initialRecipient?: string;
  initialMessage?: string;
}

interface QuickContact {
  name: string;
  phone: string; // international format e.g. 919876543210
  relation: string;
}

const DEFAULT_CONTACTS: QuickContact[] = [
  { name: 'Rajesh', phone: '919876543210', relation: 'Colleague' },
  { name: 'Priya', phone: '919876543211', relation: 'Family' },
  { name: 'Karthik', phone: '919876543212', relation: 'Friend' },
];

export const WhatsAppCard: React.FC<WhatsAppCardProps> = ({
  onDraftSent,
  initialRecipient = '',
  initialMessage = '',
}) => {
  const [recipient, setRecipient] = useState<string>(initialRecipient);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [message, setMessage] = useState<string>(initialMessage);
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

  const handleSelectContact = (contact: QuickContact) => {
    setRecipient(contact.name);
    setPhoneNumber(contact.phone);
  };

  const handlePrepareSend = () => {
    if (!recipient.trim() && !phoneNumber.trim()) {
      alert('Please select or specify a recipient contact name or phone number.');
      return;
    }
    if (!message.trim()) {
      alert('Please provide a message text.');
      return;
    }
    setShowConfirmation(true);
  };

  const handleLaunchWhatsApp = () => {
    // Sanitize phone number (digits only)
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(message);
    const clickToChatUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://web.whatsapp.com/send?text=${encodedText}`;

    // Open WhatsApp in a new tab for owner to review and manually click Send
    window.open(clickToChatUrl, '_blank', 'noopener,noreferrer');
    setIsOpened(true);
    setShowConfirmation(false);

    onDraftSent(recipient || phoneNumber, message, clickToChatUrl);
  };

  return (
    <div className="p-4 rounded-lg bg-[#020d24]/90 border border-cyan-500/30 text-slate-100 font-rajdhani backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <h3 className="font-orbitron font-bold text-sm tracking-wider text-cyan-200">
            WHATSAPP VOICE DISPATCH
          </h3>
        </div>
        <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
          SECURE PREFILL
        </span>
      </div>

      {/* Quick Contacts Bar */}
      <div className="mt-3">
        <span className="text-[11px] font-mono-tech text-cyan-400 block mb-1.5">
          QUICK CONTACTS (OWNER LIST):
        </span>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_CONTACTS.map((c) => (
            <button
              key={c.name}
              onClick={() => handleSelectContact(c)}
              className={`px-2.5 py-1 rounded text-xs font-rajdhani border transition-all flex items-center gap-1.5 ${
                recipient === c.name
                  ? 'bg-emerald-900/60 border-emerald-400 text-white font-bold shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                  : 'bg-cyan-950/40 border-cyan-500/20 text-cyan-300 hover:border-cyan-400'
              }`}
            >
              <User className="w-3 h-3 text-cyan-400" />
              <span>{c.name}</span>
              <span className="text-[10px] text-cyan-500">({c.relation})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recipient Input */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
        <div>
          <label className="text-[11px] font-mono-tech text-cyan-400 block mb-1">
            RECIPIENT NAME:
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="e.g. Rajesh or Team"
            className="w-full px-3 py-1.5 rounded bg-black/60 border border-cyan-500/30 text-xs font-rajdhani text-white focus:outline-none focus:border-cyan-400"
          />
        </div>
        <div>
          <label className="text-[11px] font-mono-tech text-cyan-400 block mb-1">
            PHONE NUMBER (INTL FORMAT):
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g. 919876543210 (optional)"
            className="w-full px-3 py-1.5 rounded bg-black/60 border border-cyan-500/30 text-xs font-mono-tech text-white focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Message textarea */}
      <div className="mt-3">
        <label className="text-[11px] font-mono-tech text-cyan-400 block mb-1">
          MESSAGE CONTENT (TAMIL, ENGLISH OR TANGLISH):
        </label>
        <textarea
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Kalai vanakkam, meeting 10 AM ku irukku / Good morning, see you soon"
          className="w-full px-3 py-2 rounded bg-black/60 border border-cyan-500/30 text-xs font-rajdhani text-white focus:outline-none focus:border-cyan-400 resize-none"
        />
      </div>

      {/* Safety Disclosure */}
      <div className="mt-2 text-[11px] font-mono-tech text-amber-300/80 flex items-start gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
        <span>
          ELASK will open WhatsApp with your text prefilled. You review and click Send manually. ELASK never sends messages autonomously without owner confirmation.
        </span>
      </div>

      {/* Actions */}
      <div className="mt-3 pt-2 border-t border-cyan-500/20 flex items-center justify-between">
        {isOpened && (
          <span className="text-xs font-mono-tech text-emerald-400 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Opened in WhatsApp for review
          </span>
        )}
        <div className="ml-auto">
          <button
            onClick={handlePrepareSend}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-rajdhani font-bold text-xs shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>REVIEW & DISPATCH</span>
          </button>
        </div>
      </div>

      {/* Final Pre-Send Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#020b1c] border-2 border-emerald-500/80 p-5 rounded-lg shadow-[0_0_35px_rgba(16,185,129,0.4)] text-white">
            <div className="hud-corner-tl !border-emerald-400" />
            <div className="hud-corner-tr !border-emerald-400" />
            <div className="hud-corner-bl !border-emerald-400" />
            <div className="hud-corner-br !border-emerald-400" />

            <h3 className="font-orbitron font-bold text-base text-emerald-300 mb-2">
              FINAL WHATSAPP CONFIRMATION
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Please inspect the recipient and exact text before proceeding:
            </p>

            <div className="p-3 rounded bg-black/60 border border-emerald-500/30 font-mono-tech text-xs space-y-2 mb-4">
              <div>
                <span className="text-emerald-400">Recipient:</span>{' '}
                <span className="font-bold text-white">{recipient || phoneNumber}</span>
              </div>
              <div>
                <span className="text-emerald-400">Phone:</span>{' '}
                <span className="text-white">{phoneNumber || 'Standard WhatsApp Web'}</span>
              </div>
              <div className="pt-2 border-t border-emerald-500/20">
                <span className="text-emerald-400 block mb-1">Exact Message Body:</span>
                <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/20 italic text-emerald-100">
                  "{message}"
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-3 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-rajdhani"
              >
                CANCEL
              </button>
              <button
                onClick={handleLaunchWhatsApp}
                className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-rajdhani font-bold text-xs flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>OPEN IN WHATSAPP</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
