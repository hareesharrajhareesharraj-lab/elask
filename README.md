# ELASK — Bilingual Windows Personal AI Assistant

ELASK (Electronic Logic & Adaptive Speech Kernel) is a Windows-first personal AI assistant featuring a futuristic, holographic circular HUD inspired by dark cyan sci-fi aesthetics. It understands and speaks Tamil (தமிழ்), English, and Tanglish (Tamil-English code-switching), answers questions with Google Search grounding, and safely coordinates actions on your Windows laptop.

---

## 1. Architecture Overview

```
                      +---------------------------------------+
                      |       ELASK Futuristic Web HUD        |
                      |   (React 19 + TypeScript + Tailwind)  |
                      +---------------------------------------+
                           /               |              \
               HTTP / SSE /                |               \ Local Vision
                         v                 |                v
        +-------------------------+        |        +---------------------+
        |  ELASK Server (Node.js) |        |        | Hand Gesture Radar  |
        |  Gemini 3.8 Flash (LLM) |        |        | (Local Camera,      |
        |  Gemini 3.8 TTS         |        |        |  Pinch / Spread)    |
        |  Google Search Grounding|        |        +---------------------+
        +-------------------------+        |
                                           | HTTP (127.0.0.1:9123)
                                           v
                       +---------------------------------------+
                       |   ELASK Windows Companion Service     |
                       |  - Strict localhost-only binding      |
                       |  - Token auth: X-ELASK-TOKEN          |
                       |  - Owner-approved apps whitelist only |
                       |  - Edge URL launch & Zoom shortcuts   |
                       +---------------------------------------+
```

### What Runs in the Browser (No Companion Needed)
- **Bilingual Conversations**: Spoken or written Tamil, English, and Tanglish.
- **Gemini Reasoning**: Powered by `gemini-3.8-flash` via secure server endpoints.
- **Search Grounding**: Live web information with verified, clickable Google Search source links.
- **Voice Input & TTS Output**: Browser Web Speech API + Gemini Flash Lite TTS (`gemini-3.8-flash-lite-tts`) with Tamil audio playback.
- **Local Hand Gesture Radar**: Local webcam tracking for pinch/spread zoom detection with debouncing (no video ever uploaded).
- **WhatsApp Voice Dispatch**: Voice message composing and click-to-chat prefilling.
- **Owner Voice Enrollment**: Acoustic feature calibration & PIN security guard.

### What Requires the Local Windows Companion Service
- **Launching Native Apps**: Microsoft Edge, Notepad, Calculator, Visual Studio Code, File Explorer, Paint.
- **Direct Edge Navigation**: Opening validated `http`/`https` links in Microsoft Edge (`msedge.exe`).
- **Simulating OS Zoom**: Windows PowerShell `SendKeys` zoom shortcuts for active target windows.
- **True Background Wake-Word Listening**: Listening when the browser tab is minimised or closed.

---

## 2. Windows Companion Setup

The Windows Companion service is located in the `/companion` folder:

1. Ensure **Node.js** (v18+) is installed on your Windows laptop.
2. In PowerShell or Command Prompt:
   ```cmd
   cd companion
   node server.js
   ```
   *Or simply double-click `start-companion.bat`.*
3. The service will output:
   ```
   [ELASK-COMPANION] Windows Companion Service Active
   [BINDING]         http://127.0.0.1:9123
   [AUTH TOKEN]      ELASK-LOCAL-DEV-TOKEN
   [SECURITY]        Approved-whitelist execution only
   ```
4. Return to the ELASK Web HUD. The **WIN-BRIDGE** status in the top bar will turn **ONLINE (CYAN)**.

---

## 3. Security & Safety Model

- **No Arbitrary Shell Execution**: ELASK **never** runs arbitrary shell commands, model-generated scripts, or dangerous binaries.
- **Owner Whitelist**: Only apps in the owner-approved list (configurable in Settings) can be launched.
- **URL Sanitization**: Browser launch only accepts valid `http://` and `https://` protocols, targeting Microsoft Edge.
- **Emergency Stop**: Pressing **`[ESC]`** or clicking the top-bar **`[ELASK STOP]`** immediately cancels audio playback, speech recognition, and any pending action.
- **Owner PIN Verification**: Optional 4-digit PIN requirement for sensitive Windows actions.
- **Honest Attribution**: ELASK clearly identifies as being powered by Gemini models and does not make inflated claims versus other models.

---

## 4. Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`Space`** | Toggle Push-to-Talk Voice Input |
| **`Esc`** | Immediate Emergency Stop (Halt Voice & Actions) |
| **`H`** | Toggle Hand Gesture Camera Radar |
| **`M`** | Toggle Audio & Sound Effects Mute |
| **`?`** | Open Keyboard Shortcuts Cheat-Sheet |

---

## 5. Supported Voice Commands

### Tamil (தமிழ்)
- *"இன்றைய முக்கிய செய்திகள் என்ன?"* (Answers using Search Grounding)
- *"Edge browser open பண்ணுங்க"* (Launches Microsoft Edge via companion)
- *"Notepad open பண்ணு"* (Launches Notepad via companion)
- *"Rajesh ku WhatsApp la message podu: kalai vanakkam"* (Prefills WhatsApp message)

### English
- *"ELASK, open Microsoft Edge"*
- *"Open github.com in Edge"*
- *"Zoom in window"* / *"Zoom out"*
- *"What is the latest score in the cricket match today?"*

### Tanglish
- *"Enna panringa ELASK?"*
- *"Next meeting 10 AM ku irukku, notes edunga"*
