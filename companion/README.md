# ELASK Windows Companion Service (Hardened Edition)

The **ELASK Windows Companion Service** is an on-device daemon strictly bound to `127.0.0.1:9123`. It coordinates native Windows operating system actions and background wake-word detection for the ELASK web assistant without exposing your computer to arbitrary shell execution.

---

## 1. Security Review & Summary of Changes

A comprehensive security review was conducted, eliminating critical vulnerabilities from the original prototype:

| Vulnerability / Risk | Original Vulnerable Behavior | Hardened Production Rewrite |
| :--- | :--- | :--- |
| **Shell Command Execution** | Used `child_process.exec` with shell interpolation | **Removed `exec` completely.** All processes use `child_process.spawn` with `shell: false` and explicit argument arrays. |
| **Arbitrary Command Injection** | Allowed adding arbitrary command strings via `POST /api/apps/add` | **Removed custom command route completely.** Only fixed app IDs (`msedge`, `notepad`, `calc`, `vscode`, `explorer`, `mspaint`) mapped server-side are permitted. |
| **Hard-Coded Shared Secret** | Hardcoded token `ELASK-LOCAL-DEV-TOKEN` in code and frontend | **Per-install 256-bit random cryptographic token** generated on first launch and saved with `0600` file permissions in `companion-config.json`. |
| **Secret Leakage in Console/Logs** | Logged tokens directly to terminal console | **Secrets are never printed to console logs or HTTP responses.** Tokens are validated via `crypto.timingSafeEqual` in constant time. |
| **Wildcard CORS (`*`)** | Accepted requests from any origin (`Access-Control-Allow-Origin: *`) | **Strict exact-origin allowlist.** Wildcard CORS is blocked; only specified origins (`http://localhost:3000`, verified app URLs) can connect. |
| **Token in URL Query Parameters** | Accepted token via `?token=...` in URL query strings | **Removed query-string token auth.** Tokens are accepted strictly via `X-ELASK-TOKEN` HTTP header to prevent leaking into browser history, proxies, or server access logs. |
| **Unrestricted Payload Size** | No body size limits | **Strict 64KB maximum payload cap** to prevent denial-of-service / memory exhaustion. |
| **Sensitive Action Confirmation** | Executed directly | **Explicit user confirmation required** before dispatching actions. |

---

## 2. Platform Implementation Status & Honesty

- **Windows Desktop (Win32)**:
  - **Native Local Wake-Word Engine**: ✅ **Implemented.** Uses Windows `System.Speech.Recognition.SpeechRecognitionEngine` via an isolated PowerShell child process spawned with `shell: false`. Monitors the local microphone for `"ELASK"` and `"Hey ELASK"` without sending audio to the cloud.
  - **Fixed App Launching**: ✅ **Implemented.** Safely spawns `msedge.exe`, `notepad.exe`, `calc.exe`, `Code.exe`, `explorer.exe`, and `mspaint.exe`.
  - **Direct Edge Navigation**: ✅ **Implemented.** Verifies URLs strictly for `http:` or `https:` protocols and spawns Microsoft Edge with the URL as a safe argument array element.
  - **OS Zoom Simulation**: ✅ **Implemented.** Sends fixed Ctrl+Plus / Ctrl+Minus keystrokes via non-interactive script.
- **Non-Windows / Linux Container Dev Hosts**:
  - **Native Background Wake-Word Engine**: ⚠️ **Not Implemented (Platform Dependent).** Native `System.Speech` is a Windows desktop subsystem requiring Windows audio drivers; in non-Windows container environments, the companion operates in active standby simulator mode. (In-browser wake-word listening via Web Speech API works on all modern browsers).

---

## 3. Permissions & Requirements

- **Operating System**: Windows 10 or Windows 11 (64-bit recommended).
- **Runtime**: Node.js (v18.0.0 or higher) from [nodejs.org](https://nodejs.org/).
- **Microphone**: Standard default audio input device (required for native wake-word listening).
- **Network Permissions**: Loopback network access (`127.0.0.1:9123` only). **No inbound internet or firewall port forwarding is required or opened.**

---

## 4. Setup & One-Time Local Pairing Instructions

1. Open PowerShell or Command Prompt in the `companion` directory:
   ```cmd
   cd companion
   node server.js
   ```
   *Or double-click `start-companion.bat`.*

2. On first launch, the companion automatically generates your unique pairing token and saves it in `companion-config.json` with owner-only (`0600`) permissions:
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

3. Open `companion/companion-config.json` on your machine and copy the generated `authToken` value.
4. In the ELASK Web HUD, click **Settings (gear icon) > Windows Companion & Pairing**.
5. Paste your token into the **X-ELASK-TOKEN** field and click **SAVE & PAIR**.
6. The companion status indicator will turn **PAIRED & ONLINE (CYAN)**.

---

## 5. Controlling the Wake-Word Engine

- **Console Off Switch**: In the companion terminal window, press **`[S]`** at any time to instantly toggle wake-word microphone listening ON or OFF.
- **Clean Shutdown**: Press **`[Q]`** in the terminal to terminate the service cleanly.
- **Web UI Toggle**: Turn the companion wake engine on/off from the Settings modal.
- **API Control**: Send `POST http://127.0.0.1:9123/api/wake-word/toggle` with `{"enabled": false}` and the `X-ELASK-TOKEN` header.
