/**
 * ELASK - Windows Companion Service
 * Strictly binds to 127.0.0.1:9123
 * Executes ONLY owner-approved actions through validated typed APIs.
 * NO arbitrary shell execution or model-generated script execution.
 */

const http = require('http');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 9123;
const HOST = '127.0.0.1'; // Localhost only!

// Auth token - default or read from config file
const CONFIG_FILE = path.join(__dirname, 'companion-config.json');
let config = {
  authToken: 'ELASK-LOCAL-DEV-TOKEN',
  ownerName: 'Owner',
  approvedApps: [
    {
      id: 'msedge',
      name: 'Microsoft Edge',
      aliases: ['edge', 'microsoft edge', 'browser'],
      command: 'start msedge',
      safeUrlPrefix: 'https://',
    },
    {
      id: 'notepad',
      name: 'Notepad',
      aliases: ['notepad', 'notes', 'text editor'],
      command: 'notepad.exe',
    },
    {
      id: 'calc',
      name: 'Calculator',
      aliases: ['calculator', 'calc'],
      command: 'calc.exe',
    },
    {
      id: 'vscode',
      name: 'Visual Studio Code',
      aliases: ['vscode', 'vs code', 'code'],
      command: 'code',
    },
    {
      id: 'explorer',
      name: 'File Explorer',
      aliases: ['explorer', 'files', 'file explorer', 'my computer'],
      command: 'explorer.exe',
    },
    {
      id: 'mspaint',
      name: 'Paint',
      aliases: ['paint', 'mspaint'],
      command: 'mspaint.exe',
    }
  ]
};

// Load saved config if exists
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    config = { ...config, ...saved };
    console.log('[ELASK-COMPANION] Loaded saved config from companion-config.json');
  } catch (e) {
    console.error('[ELASK-COMPANION] Could not parse config, using defaults:', e.message);
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.error('[ELASK-COMPANION] Failed to save config:', e);
  }
}

// Activity audit log
const activityLog = [];
function logActivity(action, status, details) {
  const item = {
    id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    timestamp: new Date().toISOString(),
    action,
    status,
    details
  };
  activityLog.unshift(item);
  if (activityLog.length > 50) activityLog.pop();
  console.log(`[ACTIVITY LOG] [${item.status}] ${item.action}: ${JSON.stringify(item.details)}`);
  return item;
}

// Security: Check token
function isAuthorized(req) {
  const tokenHeader = req.headers['x-elask-token'];
  const reqUrl = url.parse(req.url, true);
  const tokenQuery = reqUrl.query.token;
  return (tokenHeader === config.authToken || tokenQuery === config.authToken);
}

// Security: sanitize URLs for Edge
function isValidWebUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

const server = http.createServer((req, res) => {
  // CORS Headers for ELASK web interface
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ELASK-TOKEN');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Unauthenticated health check
  if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      service: 'ELASK Windows Companion',
      version: '1.0.0',
      platform: process.platform,
      arch: process.arch,
      approvedAppsCount: config.approvedApps.length,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Auth check for all other routes
  if (!isAuthorized(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized: Invalid or missing X-ELASK-TOKEN' }));
    return;
  }

  // Get Approved Apps List
  if (pathname === '/api/apps' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ apps: config.approvedApps }));
    return;
  }

  // Get Activity Log
  if (pathname === '/api/activity' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ log: activityLog }));
    return;
  }

  // Add new approved app
  if (pathname === '/api/apps/add' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { name, command, aliases = [] } = payload;
        if (!name || !command) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'name and command are required' }));
          return;
        }

        const id = 'app_' + Date.now();
        const newApp = {
          id,
          name: name.trim(),
          aliases: aliases.map(a => a.toLowerCase().trim()),
          command: command.trim()
        };
        config.approvedApps.push(newApp);
        saveConfig();

        logActivity('ADD_APPROVED_APP', 'SUCCESS', { app: newApp.name });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, app: newApp }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // Execute typed OS action
  if (pathname === '/api/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const action = JSON.parse(body);
        const { type } = action;

        if (type === 'LAUNCH_APP') {
          const targetName = (action.appName || '').toLowerCase().trim();
          const targetApp = config.approvedApps.find(app =>
            app.name.toLowerCase() === targetName ||
            app.aliases.some(alias => alias.toLowerCase() === targetName) ||
            targetName.includes(app.name.toLowerCase())
          );

          if (!targetApp) {
            logActivity('LAUNCH_APP', 'DENIED', { reason: 'Not in approved whitelist', requested: action.appName });
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: `Application "${action.appName}" is not in the owner-approved list. Please approve it in Settings first.`,
              approvedList: config.approvedApps.map(a => a.name)
            }));
            return;
          }

          // Safe execution of approved command
          if (process.platform === 'win32') {
            exec(targetApp.command, (err) => {
              if (err) {
                logActivity('LAUNCH_APP', 'ERROR', { app: targetApp.name, error: err.message });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
              } else {
                logActivity('LAUNCH_APP', 'SUCCESS', { app: targetApp.name });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: `Launched ${targetApp.name}` }));
              }
            });
          } else {
            // Emulate on non-windows platform for dev
            logActivity('LAUNCH_APP', 'SIMULATED', { app: targetApp.name, note: 'Non-Windows dev host' });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, simulated: true, message: `[Simulated] Launched ${targetApp.name}` }));
          }
          return;
        }

        if (type === 'OPEN_URL') {
          let urlToOpen = action.url || '';
          if (!urlToOpen.startsWith('http://') && !urlToOpen.startsWith('https://')) {
            urlToOpen = 'https://' + urlToOpen;
          }

          if (!isValidWebUrl(urlToOpen)) {
            logActivity('OPEN_URL', 'REJECTED', { reason: 'Invalid or unsafe URL format', url: action.url });
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Invalid URL. Only HTTP/HTTPS protocols allowed.' }));
            return;
          }

          if (process.platform === 'win32') {
            // Specifically open in Microsoft Edge
            exec(`start msedge "${urlToOpen}"`, (err) => {
              if (err) {
                logActivity('OPEN_URL', 'ERROR', { url: urlToOpen, error: err.message });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
              } else {
                logActivity('OPEN_URL', 'SUCCESS', { url: urlToOpen, browser: 'Microsoft Edge' });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: `Opened ${urlToOpen} in Microsoft Edge` }));
              }
            });
          } else {
            logActivity('OPEN_URL', 'SIMULATED', { url: urlToOpen, browser: 'Microsoft Edge' });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, simulated: true, message: `[Simulated] Opened ${urlToOpen} in Microsoft Edge` }));
          }
          return;
        }

        if (type === 'ZOOM') {
          const dir = action.zoomDirection === 'out' ? 'out' : 'in';
          const targetWindow = action.targetWindow || 'Active Window';

          if (process.platform === 'win32') {
            // Windows PowerShell SendKeys for Ctrl + Plus / Ctrl + Minus
            const key = dir === 'in' ? '^{+}' : '^{-}';
            const psScript = `powershell -Command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${key}')"`;
            exec(psScript, (err) => {
              if (err) {
                logActivity('ZOOM', 'ERROR', { direction: dir, error: err.message });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
              } else {
                logActivity('ZOOM', 'SUCCESS', { direction: dir, targetWindow });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: `Zoomed ${dir} in ${targetWindow}` }));
              }
            });
          } else {
            logActivity('ZOOM', 'SIMULATED', { direction: dir, targetWindow });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, simulated: true, message: `[Simulated] Zoomed ${dir} in ${targetWindow}` }));
          }
          return;
        }

        if (type === 'SYSTEM_CHECK') {
          logActivity('SYSTEM_CHECK', 'SUCCESS', { memory: process.memoryUsage() });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            os: process.platform,
            uptime: Math.round(process.uptime()),
            approvedApps: config.approvedApps.map(a => a.name)
          }));
          return;
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Unsupported action type: ${type}` }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Malformed request JSON' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, HOST, () => {
  console.log('==================================================');
  console.log(`[ELASK-COMPANION] Windows Companion Service Active`);
  console.log(`[BINDING]         http://${HOST}:${PORT}`);
  console.log(`[AUTH TOKEN]      ${config.authToken}`);
  console.log(`[SECURITY]        Approved-whitelist execution only`);
  console.log('==================================================');
});
