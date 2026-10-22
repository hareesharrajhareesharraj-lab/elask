import { ActionPayload, ApprovedApp } from '../types';

export const DEFAULT_APPROVED_APPS: ApprovedApp[] = [
  {
    id: 'msedge',
    name: 'Microsoft Edge',
    aliases: ['edge', 'microsoft edge', 'browser'],
    command: 'start msedge',
    category: 'Browser',
    iconName: 'Globe',
  },
  {
    id: 'notepad',
    name: 'Notepad',
    aliases: ['notepad', 'notes', 'text editor'],
    command: 'notepad.exe',
    category: 'Productivity',
    iconName: 'FileText',
  },
  {
    id: 'calc',
    name: 'Calculator',
    aliases: ['calculator', 'calc'],
    command: 'calc.exe',
    category: 'Utility',
    iconName: 'Calculator',
  },
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    aliases: ['vscode', 'vs code', 'code'],
    command: 'code',
    category: 'Development',
    iconName: 'Code',
  },
  {
    id: 'explorer',
    name: 'File Explorer',
    aliases: ['explorer', 'files', 'file explorer'],
    command: 'explorer.exe',
    category: 'System',
    iconName: 'Folder',
  },
  {
    id: 'mspaint',
    name: 'Paint',
    aliases: ['paint', 'mspaint'],
    command: 'mspaint.exe',
    category: 'Media',
    iconName: 'Palette',
  },
];

export async function checkCompanionStatus(port: number = 9123): Promise<{
  online: boolean;
  latencyMs?: number;
  details?: any;
}> {
  const start = performance.now();
  // Attempt 1: Direct fetch to localhost (CORS enabled on companion)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 900);
    const res = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      return {
        online: true,
        latencyMs: Math.round(performance.now() - start),
        details: data,
      };
    }
  } catch (_e) {
    // Attempt 2: Via server backend check
    try {
      const serverRes = await fetch('/api/companion/check');
      if (serverRes.ok) {
        const data = await serverRes.json();
        if (data.online) {
          return {
            online: true,
            latencyMs: Math.round(performance.now() - start),
            details: data.localData,
          };
        }
      }
    } catch (_err) {
      // Offline
    }
  }

  return { online: false };
}

export async function executeCompanionAction(
  action: ActionPayload,
  token: string = 'ELASK-LOCAL-DEV-TOKEN',
  port: number = 9123
): Promise<{ success: boolean; message?: string; error?: string; simulated?: boolean }> {
  // Try direct localhost first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const directRes = await fetch(`http://127.0.0.1:${port}/api/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ELASK-TOKEN': token,
      },
      body: JSON.stringify(action),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (directRes.ok) {
      return await directRes.json();
    }
  } catch (_directErr) {
    // Try via backend proxy
    try {
      const proxyRes = await fetch('/api/companion/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, token }),
      });
      if (proxyRes.ok) {
        return await proxyRes.json();
      }
    } catch (_proxyErr) {
      // Both failed
    }
  }

  return {
    success: false,
    error: 'Windows Companion service not reached at http://127.0.0.1:9123. Action requires Windows companion running.',
  };
}
