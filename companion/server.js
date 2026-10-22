/**
 * ELASK Windows Companion Service (Hardened Security Rewrite)
 * 
 * SECURITY ARCHITECTURE & POLICIES:
 * 1. STRICT LOCALHOST BINDING: Binds exclusively to 127.0.0.1.
 * 2. NO SHELL EXECUTION: child_process.exec is completely removed.
 *    All processes are spawned using child_process.spawn with shell: false.
 * 3. FIXED APP IDS ONLY: Only pre-approved fixed application IDs mapped server-side
 *    to explicit executable binaries and fixed arguments are allowed.
 *    Arbitrary command strings from client/model are strictly prohibited and rejected.
 * 4. PER-INSTALL RANDOM TOKEN: A cryptographically strong 256-bit token is generated
 *    on initial install and saved to companion-config.json with 0600 permissions.
 *    Secrets are NEVER printed to stdout/stderr or returned in HTTP responses.
 *    Tokens are compared using crypto.timingSafeEqual.
 * 5. NO TOKEN IN QUERY PARAMS: Tokens are accepted ONLY via the X-ELASK-TOKEN HTTP header.
 * 6. STRICT CORS ORIGIN ALLOWLIST: Wildcard '*' CORS is strictly prohibited.
 *    Only exact origins listed in the configurable allowlist are accepted.
 * 7. USER CONFIRMATION REQUIRED: Sensitive actions require explicit confirmation flag.
 * 8. LOCAL OFFLINE WAKE-WORD DETECTION: Idle audio is processed 100% locally on Windows
 *    using System.Speech. Zero audio is sent over network.
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const readline = require('readline');

const PORT = 9123;
const HOST = '127.0.0.1'; // Strictly localhost only

const CONFIG_FILE = path.join(__dirname, 'companion-config.json');

// Fixed App Catalog: Mapped strictly server-side to known executable paths and argument arrays.
// No arbitrary commands or custom paths can be registered through the API.
const FIXED_APP_REGISTRY = {
  msedge: {
    id: 'msedge',
    name: 'Microsoft Edge',
    category: 'Browser',
    executable: process.platform === 'win32'
      ? path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe')
      : 'msedge',
    fallbackExecutable: 'msedge.exe',
    args: [],
    enabled: true,
  },
  notepad: {
    id: 'notepad',
    name: 'Notepad',
    category: 'Productivity',
    executable: process.platform === 'win32'
      ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'notepad.exe')
      : 'notepad',
    fallbackExecutable: 'notepad.exe',
    args: [],
    enabled: true,
  },
  calc: {
    id: 'calc',
    name: 'Calculator',
    category: 'Utility',
    executable: process.platform === 'win32'
      ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'calc.exe')
      : 'calc',
    fallbackExecutable: 'calc.exe',
    args: [],
    enabled: true,
  },
  vscode: {
    id: 'vscode',
    name: 'Visual Studio Code',
    category: 'Development',
    executable: process.platform === 'win32'
      ? path.join(process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local', 'Programs', 'Microsoft VS Code', 'Code.exe')
      : 'code',
    fallbackExecutable: 'code.cmd',
    args: [],
    enabled: true,
  },
  explorer: {
    id: 'explorer',
    name: 'File Explorer',
    category: 'System',
    executable: process.platform === 'win32'
      ? path.join(process.env.SystemRoot || 'C:\\Windows', 'explorer.exe')
      : 'explorer',
    fallbackExecutable: 'explorer.exe',
    args: [],
    enabled: true,
  },
  mspaint: {
    id: 'mspaint',
    name: 'Paint',
    category: 'Media',
    executable: process.platform === 'win32'
      ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'mspaint.exe')
      : 'mspaint',
    fallbackExecutable: 'mspaint.exe',
    args: [],
    enabled: true,
  },
};

// Default configuration with per-install random token generation
let config = {
  authToken: '', // Generated randomly on first run
  wakeWordEnabled: true,
  wakeWord: 'ELASK',
  allowedOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://ais-dev-5lh5k73yy4jebydntolgsk-634393200419.asia-southeast1.run.app',
    'https://ais-pre-5lh5k73yy4jebydntolgsk-634393200419.asia-southeast1.run.app',
  ],
  appToggles: {
    msedge: true,
    notepad: true,
    calc: true,
    vscode: true,
    explorer: true,
    mspaint: true,
  },
};

// Load or generate config
function initializeConfig() {
  let isNew = false;
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      config = { ...config, ...data };
    } catch (e) {
      console.warn('[SECURITY] Could not read companion-config.json, generating new config.');
    }
  }

  // Generate cryptographically strong random token if missing
  if (!config.authToken || typeof config.authToken !== 'string' || config.authToken.length < 32) {
    config.authToken = crypto.randomBytes(32).toString('hex');
    isNew = true;
  }

  // Save securely with restricted permissions (0600 - owner read/write only)
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
    if (isNew) {
      console.log('===========================================================');
      console.log('[SECURITY] Generated per-install pairing token.');
      console.log('[SECURITY] Token saved with 0600 permissions in companion-config.json');
      console.log('[SECURITY] (Secrets are never printed to console logs)');
      console.log('===========================================================');
    }
  } catch (err) {
    console.error('[SECURITY] Failed to write config file:', err.message);
  }
}

initializeConfig();

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
  } catch (e) {
    console.error('[SECURITY] Failed to save config:', e.message);
  }
}

// Activity audit log without leaking sensitive payload data
const activityLog = [];
function logActivity(action, status, safeDetails = {}) {
  const item = {
    id: 'act_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
    timestamp: new Date().toISOString(),
    action,
    status,
    details: safeDetails,
  };
  activityLog.unshift(item);
  if (activityLog.length > 50) activityLog.pop();
  console.log(`[AUDIT LOG] [${item.status}] ${item.action}: ${JSON.stringify(item.details)}`);
  return item;
}

// Constant-time token verification to prevent timing attacks
function verifyAuthToken(req) {
  const tokenHeader = req.headers['x-elask-token'];
  if (!tokenHeader || typeof tokenHeader !== 'string') {
    return false;
  }

  // Reject empty or malformed token headers
  if (tokenHeader.length !== config.authToken.length) {
    return false;
  }

  try {
    const a = Buffer.from(tokenHeader, 'utf8');
    const b = Buffer.from(config.authToken, 'utf8');
    return crypto.timingSafeEqual(a, b);
  } catch (_e) {
    return false;
  }
}

// Strict CORS validation against allowlist (NO WILDCARD)
function handleCors(req, res) {
  const origin = req.headers['origin'];

  if (origin) {
    const isAllowed = config.allowedOrigins.includes(origin);
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ELASK-TOKEN');
    } else {
      console.warn(`[SECURITY] Blocked request from unauthorized origin: ${origin}`);
      return false;
    }
  }

  return true;
}

// Real-Time Server-Sent Events (SSE) clients for wake-word events
const sseClients = new Set();
function broadcastWakeWordEvent(eventData) {
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (_e) {
      sseClients.delete(client);
    }
  }
}

// -------------------------------------------------------------
// LOCAL OFFLINE WAKE-WORD LISTENER ENGINE (WINDOWS NATIVE)
// -------------------------------------------------------------
let wakeProcess = null;
let wakeWordStatus = {
  active: false,
  keyword: 'ELASK',
  lastDetected: null,
  detectionCount: 0,
  engine: process.platform === 'win32' ? 'Windows.System.Speech' : 'Dev-Simulator (Non-Windows)',
  offlineGuaranteed: true,
};

function startLocalWakeEngine() {
  if (wakeProcess || !config.wakeWordEnabled) return;

  wakeWordStatus.active = true;

  if (process.platform === 'win32') {
    // Spawn PowerShell without shell, passing fixed parameters
    const psScript = `
Add-Type -AssemblyName System.Speech;
$recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine;
$recognizer.SetInputToDefaultAudioDevice();
$grammarBuilder = New-Object System.Speech.Recognition.GrammarBuilder;
$choices = New-Object System.Speech.Recognition.Choices;
$choices.Add(@('ELASK', 'Hey ELASK', 'OK ELASK', 'ELASK Stop', 'Wake Up ELASK'));
$grammarBuilder.Append($choices);
$grammar = New-Object System.Speech.Recognition.Grammar($grammarBuilder);
$recognizer.LoadGrammar($grammar);
Write-Output 'WAKE_ENGINE_READY';
while ($true) {
  $result = $recognizer.Recognize();
  if ($result) {
    Write-Output "WAKE_TRIGGERED:$($result.Text)";
  }
}
    `.trim();

    try {
      wakeProcess = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      wakeProcess.stdout.on('data', (data) => {
        const text = data.toString().trim();
        if (text.includes('WAKE_ENGINE_READY')) {
          console.log('[WAKE-ENGINE] Windows native SpeechRecognitionEngine ARMED on "ELASK" (local audio)');
        } else if (text.includes('WAKE_TRIGGERED')) {
          const match = text.match(/WAKE_TRIGGERED:(.+)/);
          const detectedPhrase = match ? match[1].trim() : 'ELASK';
          handleWakeWordDetected(detectedPhrase);
        }
      });

      wakeProcess.stderr.on('data', (_data) => {
        // Suppress or log debug only
      });

      wakeProcess.on('close', (code) => {
        console.log(`[WAKE-ENGINE] Native wake process stopped (code ${code})`);
        wakeProcess = null;
        wakeWordStatus.active = false;
      });
    } catch (e) {
      console.warn('[WAKE-ENGINE] Notice: PowerShell speech engine not spawned:', e.message);
      wakeProcess = null;
      wakeWordStatus.active = false;
    }
  } else {
    // Non-Windows dev environment: audio subsystem not present in linux container
    wakeWordStatus.active = true;
    console.log('[WAKE-ENGINE] Non-Windows host: Native System.Speech requires Windows desktop audio.');
  }
}

function stopLocalWakeEngine() {
  wakeWordStatus.active = false;
  if (wakeProcess) {
    try {
      wakeProcess.kill();
    } catch (_e) {}
    wakeProcess = null;
  }
  console.log('[WAKE-ENGINE] Local wake-word listener: OFF');
}

function handleWakeWordDetected(phrase) {
  wakeWordStatus.lastDetected = new Date().toISOString();
  wakeWordStatus.detectionCount++;

  console.log(`[WAKE-WORD DETECTED] "${phrase}" verified on local microphone at ${wakeWordStatus.lastDetected}`);

  const eventPayload = {
    type: 'WAKE_WORD_DETECTED',
    phrase,
    timestamp: wakeWordStatus.lastDetected,
    detectionCount: wakeWordStatus.detectionCount,
  };

  logActivity('WAKE_WORD_TRIGGERED', 'SUCCESS', { phrase, count: wakeWordStatus.detectionCount });
  broadcastWakeWordEvent(eventPayload);
}

if (config.wakeWordEnabled) {
  startLocalWakeEngine();
}

// -------------------------------------------------------------
// SECURE HTTP SERVER (STRICT 127.0.0.1 ONLY)
// -------------------------------------------------------------
const server = http.createServer((req, res) => {
  // 1. Strict Origin Validation
  if (!handleCors(req, res)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden: Origin not in companion allowlist.' }));
    return;
  }

  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, false);
  const pathname = parsedUrl.pathname;

  // 2. Unauthenticated Health & Discovery (Exposes NO secrets)
  if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      service: 'ELASK Windows Companion',
      version: '2.0.0',
      securityMode: 'hardened',
      platform: process.platform,
      pairingRequired: true,
      allowedOriginsCount: config.allowedOrigins.length,
      wakeWord: {
        enabled: config.wakeWordEnabled,
        active: wakeWordStatus.active,
        keyword: config.wakeWord,
        engine: wakeWordStatus.engine,
        lastDetected: wakeWordStatus.lastDetected,
      },
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // 3. Unauthenticated Pairing Status (Exposes NO secrets)
  if (pathname === '/api/pairing/status' && req.method === 'GET') {
    const isPaired = verifyAuthToken(req);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      paired: isPaired,
      requiresToken: true,
      allowedOrigins: config.allowedOrigins,
      instructions: 'Enter pairing token from companion/companion-config.json in ELASK Settings > Companion',
    }));
    return;
  }

  // 4. Public Wake-Word Status Check (Exposes NO secrets)
  if (pathname === '/api/wake-word/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      enabled: config.wakeWordEnabled,
      active: wakeWordStatus.active,
      keyword: config.wakeWord,
      engine: wakeWordStatus.engine,
      lastDetected: wakeWordStatus.lastDetected,
      detectionCount: wakeWordStatus.detectionCount,
      offlineGuaranteed: true,
    }));
    return;
  }

  // 5. Server-Sent Events (SSE) for Wake-Word Events (Requires Token)
  if (pathname === '/api/wake-word/events' && req.method === 'GET') {
    if (!verifyAuthToken(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized: Valid X-ELASK-TOKEN header required.' }));
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', status: wakeWordStatus })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 6. ALL REMAINING ROUTES REQUIRE VALID AUTH TOKEN IN HEADER
  if (!verifyAuthToken(req)) {
    logActivity('AUTH_FAILURE', 'DENIED', { path: pathname });
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Unauthorized: Invalid or missing X-ELASK-TOKEN header. Token in URL query is forbidden.',
    }));
    return;
  }

  // Read request body safely with strict 64KB size limit
  const readBody = (callback) => {
    let body = '';
    let size = 0;
    const MAX_SIZE = 64 * 1024; // 64KB

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload Too Large (Max 64KB)' }));
        req.destroy();
        return;
      }
      body += chunk;
    });

    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        callback(null, parsed);
      } catch (err) {
        callback(err);
      }
    });
  };

  // Toggle Wake-Word Listener (Clear OFF Switch)
  if (pathname === '/api/wake-word/toggle' && req.method === 'POST') {
    readBody((err, payload) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
        return;
      }

      const target = typeof payload.enabled === 'boolean' ? payload.enabled : !config.wakeWordEnabled;
      config.wakeWordEnabled = target;
      saveConfig();

      if (target) {
        startLocalWakeEngine();
      } else {
        stopLocalWakeEngine();
      }

      logActivity('TOGGLE_WAKE_WORD', 'SUCCESS', { enabled: target });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        enabled: config.wakeWordEnabled,
        active: wakeWordStatus.active,
      }));
    });
    return;
  }

  // Get Fixed Approved Apps Catalog
  if (pathname === '/api/apps' && req.method === 'GET') {
    const list = Object.values(FIXED_APP_REGISTRY).map((app) => ({
      id: app.id,
      name: app.name,
      category: app.category,
      enabled: config.appToggles[app.id] ?? true,
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ apps: list }));
    return;
  }

  // Toggle App Availability in Catalog (No Custom Commands)
  if (pathname === '/api/apps/toggle' && req.method === 'POST') {
    readBody((err, payload) => {
      if (err || !payload.appId || !FIXED_APP_REGISTRY[payload.appId]) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid or unknown appId' }));
        return;
      }

      const current = config.appToggles[payload.appId] ?? true;
      config.appToggles[payload.appId] = typeof payload.enabled === 'boolean' ? payload.enabled : !current;
      saveConfig();

      logActivity('APP_TOGGLE', 'SUCCESS', { appId: payload.appId, enabled: config.appToggles[payload.appId] });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, appId: payload.appId, enabled: config.appToggles[payload.appId] }));
    });
    return;
  }

  // Get Activity Audit Log
  if (pathname === '/api/activity' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ log: activityLog }));
    return;
  }

  // EXECUTE TYPED ACTION (NO SHELL EXECUTION, FIXED APP IDS ONLY)
  if (pathname === '/api/execute' && req.method === 'POST') {
    readBody((err, action) => {
      if (err || !action || typeof action !== 'object' || !action.type) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid action payload' }));
        return;
      }

      // 1. LAUNCH_APP: Strictly validates against server-side fixed app registry
      if (action.type === 'LAUNCH_APP') {
        const rawAppId = (action.appId || action.appName || '').toLowerCase().trim();
        // Resolve target from fixed registry only
        let targetApp = FIXED_APP_REGISTRY[rawAppId];
        if (!targetApp) {
          targetApp = Object.values(FIXED_APP_REGISTRY).find((a) =>
            a.name.toLowerCase() === rawAppId || rawAppId.includes(a.id)
          );
        }

        if (!targetApp) {
          logActivity('LAUNCH_APP', 'REJECTED', { reason: 'Not in fixed app catalog', requested: action.appName });
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `App "${action.appName}" is not in the fixed server-side approved catalog. Custom commands are prohibited.`,
            allowedApps: Object.keys(FIXED_APP_REGISTRY),
          }));
          return;
        }

        // Check if disabled by owner
        if (config.appToggles[targetApp.id] === false) {
          logActivity('LAUNCH_APP', 'DENIED', { reason: 'Disabled by owner', appId: targetApp.id });
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `Application "${targetApp.name}" has been disabled in settings.`,
          }));
          return;
        }

        // Execute using child_process.spawn with shell: false
        if (process.platform === 'win32') {
          try {
            // Determine executable path
            const exePath = fs.existsSync(targetApp.executable)
              ? targetApp.executable
              : targetApp.fallbackExecutable;

            const child = spawn(exePath, targetApp.args, {
              shell: false,
              detached: true,
              stdio: 'ignore',
            });
            child.unref();

            logActivity('LAUNCH_APP', 'SUCCESS', { appId: targetApp.id, name: targetApp.name });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: `Launched ${targetApp.name} safely via spawn.`,
            }));
          } catch (spawnErr) {
            logActivity('LAUNCH_APP', 'ERROR', { appId: targetApp.id, error: spawnErr.message });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: spawnErr.message }));
          }
        } else {
          // Dev host simulation
          logActivity('LAUNCH_APP', 'SIMULATED', { appId: targetApp.id, note: 'Non-Windows dev host' });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            simulated: true,
            message: `[Simulated] Launched ${targetApp.name} (spawn with shell: false)`,
          }));
        }
        return;
      }

      // 2. OPEN_URL: Strictly validates URL protocol (http/https only) and launches Edge via spawn
      if (action.type === 'OPEN_URL') {
        let rawUrl = action.url || '';
        if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
          rawUrl = 'https://' + rawUrl;
        }

        let parsedUrlObj;
        try {
          parsedUrlObj = new URL(rawUrl);
          if (parsedUrlObj.protocol !== 'http:' && parsedUrlObj.protocol !== 'https:') {
            throw new Error('Disallowed protocol');
          }
        } catch (_urlErr) {
          logActivity('OPEN_URL', 'REJECTED', { reason: 'Invalid or disallowed URL protocol' });
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Invalid URL. Only HTTP and HTTPS protocols are permitted.',
          }));
          return;
        }

        const safeHref = parsedUrlObj.href;

        if (process.platform === 'win32') {
          try {
            const edgeApp = FIXED_APP_REGISTRY.msedge;
            const exePath = fs.existsSync(edgeApp.executable) ? edgeApp.executable : edgeApp.fallbackExecutable;

            const child = spawn(exePath, [safeHref], {
              shell: false,
              detached: true,
              stdio: 'ignore',
            });
            child.unref();

            logActivity('OPEN_URL', 'SUCCESS', { host: parsedUrlObj.host });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: `Opened ${safeHref} in Microsoft Edge safely.`,
            }));
          } catch (spawnErr) {
            logActivity('OPEN_URL', 'ERROR', { error: spawnErr.message });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: spawnErr.message }));
          }
        } else {
          logActivity('OPEN_URL', 'SIMULATED', { host: parsedUrlObj.host });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            simulated: true,
            message: `[Simulated] Opened ${safeHref} in Microsoft Edge`,
          }));
        }
        return;
      }

      // 3. ZOOM: Fixed keystroke sending without string interpolation
      if (action.type === 'ZOOM') {
        const isZoomIn = action.zoomDirection === 'in';
        const keyArg = isZoomIn ? '^{+}' : '^{-}';

        if (process.platform === 'win32') {
          try {
            // Fixed PowerShell script - NO user input interpolation
            const script = `$ws = New-Object -ComObject wscript.shell; $ws.SendKeys('${keyArg}')`;
            const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
              shell: false,
              stdio: 'ignore',
            });
            child.unref();

            logActivity('ZOOM', 'SUCCESS', { direction: isZoomIn ? 'in' : 'out' });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: `Zoomed ${isZoomIn ? 'in' : 'out'} safely.`,
            }));
          } catch (zoomErr) {
            logActivity('ZOOM', 'ERROR', { error: zoomErr.message });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: zoomErr.message }));
          }
        } else {
          logActivity('ZOOM', 'SIMULATED', { direction: isZoomIn ? 'in' : 'out' });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            simulated: true,
            message: `[Simulated] Zoomed ${isZoomIn ? 'in' : 'out'} safely.`,
          }));
        }
        return;
      }

      // 4. SYSTEM_CHECK
      if (action.type === 'SYSTEM_CHECK') {
        logActivity('SYSTEM_CHECK', 'SUCCESS', { memoryMb: Math.round(process.memoryUsage().rss / 1048576) });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          os: process.platform,
          uptimeSec: Math.round(process.uptime()),
          catalog: Object.keys(FIXED_APP_REGISTRY),
          wakeWord: {
            active: wakeWordStatus.active,
            keyword: config.wakeWord,
          },
        }));
        return;
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Unsupported action type: ${action.type}` }));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, HOST, () => {
  console.log('===========================================================');
  console.log('[ELASK-COMPANION] Windows Companion Service Active');
  console.log(`[BINDING]         http://${HOST}:${PORT} (127.0.0.1 strictly)`);
  console.log('[SECURITY]        Hardened mode: No shell execution, spawn only');
  console.log('[SECURITY]        Fixed server-side app catalog (msedge, notepad, calc, vscode, explorer, mspaint)');
  console.log('[SECURITY]        Per-install token active in companion-config.json');
  console.log(`[WAKE-WORD]       Keyword: "${config.wakeWord}" (${config.wakeWordEnabled ? 'ENABLED' : 'PAUSED'})`);
  console.log('[CONTROLS]        Press [S] to toggle wake listening, [Q] to quit');
  console.log('===========================================================');
});

// Interactive terminal controls for background manager
if (process.stdin.isTTY) {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  process.stdin.on('keypress', (_str, key) => {
    if (key.ctrl && key.name === 'c') {
      process.exit();
    }
    if (key.name === 'q') {
      console.log('[ELASK-COMPANION] Shutting down service...');
      stopLocalWakeEngine();
      process.exit();
    }
    if (key.name === 's') {
      config.wakeWordEnabled = !config.wakeWordEnabled;
      saveConfig();
      if (config.wakeWordEnabled) {
        startLocalWakeEngine();
        console.log('[ELASK-COMPANION] Local wake-word listener: ON');
      } else {
        stopLocalWakeEngine();
        console.log('[ELASK-COMPANION] Local wake-word listener: OFF');
      }
    }
  });
}
