# ELASK — Bilingual Windows Personal AI Assistant

ELASK (Electronic Logic & Adaptive Speech Kernel) is a Windows-first personal AI assistant featuring a futuristic, holographic circular HUD inspired by dark cyan sci-fi aesthetics. It understands and speaks Tamil (தமிழ்), English, and Tanglish (Tamil-English code-switching), answers questions with Google Search grounding, and safely coordinates actions on your Windows laptop.

---

## 1. Security Architecture & Companion Hardening

The ELASK Windows Companion underwent a complete security rewrite to eliminate prototype risks and ensure safe execution:

```
[Web Browser HUD] 
       │
       │  HTTP / POST (127.0.0.1:9123 only)
       │  Header: X-ELASK-TOKEN (Random 256-bit per-install secret)
       │  CORS: Exact Origin Allowlist (No Wildcard '*')
       ▼
[ELASK Windows Companion Service]
       │
       ├──> Constant-time Token Validation (crypto.timingSafeEqual)
       ├──> Strict 64KB Request Body Cap
       ├──> Fixed App ID Validation (msedge, notepad, calc, vscode, explorer, mspaint)
       │
       ▼
[Child Process Spawn] ──> child_process.spawn(exePath, args, { shell: false })
                          (NO child_process.exec • NO arbitrary shell commands)
```

### Security Guarantees
1. **No `child_process.exec`**: Arbitrary shell execution is completely banned. All applications are launched via `child_process.spawn` with `shell: false`.
2. **Fixed Server-Side App Catalog**: Custom shell command entry has been completely removed from both the API and user interface. Only pre-configured safe binaries mapped server-side can be launched.
3. **Per-Install Random Token**: No shared or hard-coded secrets. Each install generates a random 256-bit token stored in `companion/companion-config.json` with `0600` owner-only file permissions. Secrets are **never** logged to the console or returned in HTTP responses.
4. **Header-Only Authentication**: Tokens are accepted exclusively via the `X-ELASK-TOKEN` HTTP header. Passing tokens in URL query strings is blocked.
5. **Strict CORS Allowlist**: Wildcard `Access-Control-Allow-Origin: *` is eliminated. Only verified local and app origins can communicate with the companion.
6. **Localhost Only**: Binds strictly to `127.0.0.1`.
7. **Action Confirmation**: Sensitive operations require explicit owner confirmation in the web UI.

---

## 2. Browser-Only Mode vs Windows Companion Mode

| Capability | Browser App Only | With Windows Companion (`127.0.0.1:9123`) |
| :--- | :--- | :--- |
| **Bilingual Conversations (Tamil, English, Tanglish)** | ✅ Yes | ✅ Yes |
| **Search Grounding with Live Citations** | ✅ Yes | ✅ Yes |
| **Local Wake-Word Detection (Active Tab)** | ✅ Yes (Web Speech API) | ✅ Yes |
| **Background Wake Listening (Tab Closed / Minimized)** | ❌ No (Browser suspends tab) | ✅ **Yes (Windows Native `System.Speech`)** |
| **Launching Native Windows Apps** | ❌ No (Browser sandbox blocks) | ✅ **Yes (Safe `spawn` with `shell: false`)** |
| **Direct Navigation in Microsoft Edge** | ❌ Popup only | ✅ **Yes (`msedge.exe [url]`)** |
| **Simulating OS Zoom Shortcuts** | ❌ No | ✅ **Yes (PowerShell SendKeys)** |
| **Clear Off Switch** | ✅ Pause button | ✅ **Console `[S]`, Web UI, or REST API** |

### Platform Implementation Status & Honesty
- **Windows 10 / 11**: Full functionality, including native background wake-word listening via `System.Speech.Recognition` and safe app launching.
- **Non-Windows / Linux Containers**: In-browser wake-word detection and Gemini reasoning work identically. Native companion background speech recognition requires the Windows audio subsystem and operates in standby simulation on non-Windows hosts.

---

## 3. Windows Companion Setup & Pairing

1. Ensure **Node.js** (v18+) is installed on your Windows PC.
2. In PowerShell or Command Prompt:
   ```cmd
   cd companion
   node server.js
   ```
   *Or double-click `start-companion.bat`.*
3. On first startup, the companion outputs:
   ```
   ===========================================================
   [ELASK-COMPANION] Windows Companion Service Active
   [BINDING]         http://127.0.0.1:9123 (127.0.0.1 strictly)
   [SECURITY]        Hardened mode: No shell execution, spawn only
   [SECURITY]        Fixed server-side app catalog
   [SECURITY]        Per-install token active in companion-config.json
   [WAKE-WORD]       Keyword: "ELASK" (ENABLED)
   [CONTROLS]        Press [S] to toggle wake listening, [Q] to quit
   ===========================================================
   ```
4. Open `companion/companion-config.json` on your computer and copy the `authToken`.
5. In the ELASK Web HUD, open **Settings (gear icon) > Windows Companion & Pairing**.
6. Paste the token into the **X-ELASK-TOKEN** field and click **SAVE & PAIR**.
7. The indicator in the top bar will turn **WIN-BRIDGE: ONLINE (CYAN)**.

---

## 4. Voice Commands & Hands-Free Flow

### Automatic End-of-Speech Silence Detection (Zero Second Click)
ELASK does **not** require a second microphone click to submit commands:
1. **Hands-Free Detection**: After speaking, ELASK detects when you finish and waits for natural silence before automatically submitting.
2. **Configurable Silence Delay (0.7s – 1.8s, default 1.2s)**: Spoken Tamil and Tanglish feature natural pauses between noun phrases and verbs. In **Settings > Voice & Activation**, adjust the delay between `0.7s` (brisk English) and `1.8s` (deliberate Tamil cadence) with presets (`0.8s`, `1.2s`, `1.5s`, `1.8s`).
3. **Strict Duplicate Prevention**: Only the completed, final utterance is submitted once. Interim voice recognition results are locked out from causing duplicate executions.
4. **10-Second No-Speech Watchdog**: If microphone listening starts but no speech is heard within 10 seconds, ELASK displays *"No speech detected within 10 seconds. Returned to standby"* and safely returns to standby instead of remaining stuck on `LISTENING`.
5. **Noise & Breath Filtering**: Empty audio or single-character acoustic noises are safely ignored.
6. **Immediate Pause/Stop Controls**: Press **`[Esc]`** at any time to immediately abort listening, speaking, or pending actions.

### Wake-Word Detection
- Say **"ELASK"** or **"ஏலாஸ்க்"** (Tamil) to trigger the assistant hands-free.
- **Zero Cloud Audio During Idle**: While waiting for the wake word, all audio is processed 100% locally on your device.
- **Echo Prevention**: While ELASK is speaking, microphone input is automatically muted plus a 600ms buffer to prevent self-triggering.
- **Large Pause/Resume Control**: Press **`[Spacebar]`** or click **`[⏸ PAUSE AUTO-WAKE]`** below the HUD orb to pause or resume listening.

### Supported Commands
- *"ELASK, open Microsoft Edge"*
- *"Open github.com in Edge"*
- *"ELASK, Notepad open pannu"* (Tanglish)
- *"இன்றைய முக்கிய செய்திகள் என்ன?"* (Tamil with Search Grounding)
- *"Zoom in window"* / *"Zoom out"*
- *"Rajesh ku WhatsApp message anupu"*

---

## 5. Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`Space`** | Pause / Resume Hands-Free Wake Word |
| **`Esc`** | Immediate Emergency Stop (Halt Voice & Actions) |
| **`H`** | Toggle Hand Gesture Camera Radar |
| **`M`** | Toggle Audio & Sound Effects Mute |
| **`?`** | Open Keyboard Shortcuts Cheat-Sheet |
