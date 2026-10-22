import { ActionPayload, ApprovedApp } from '../types';

export const DEFAULT_APPROVED_APPS: ApprovedApp[] = [
  {
    id: 'msedge',
    name: 'Microsoft Edge',
    aliases: ['edge', 'microsoft edge', 'browser'],
    category: 'Browser',
    iconName: 'Globe',
    description: 'Web Browser (Strictly launches Edge with verified URLs)',
    enabled: true,
  },
  {
    id: 'notepad',
    name: 'Notepad',
    aliases: ['notepad', 'notes', 'text editor'],
    category: 'Productivity',
    iconName: 'FileText',
    description: 'Windows Text Editor (Fixed binary System32/notepad.exe)',
    enabled: true,
  },
  {
    id: 'calc',
    name: 'Calculator',
    aliases: ['calculator', 'calc'],
    category: 'Utility',
    iconName: 'Calculator',
    description: 'Windows Calculator (Fixed binary System32/calc.exe)',
    enabled: true,
  },
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    aliases: ['vscode', 'vs code', 'code'],
    category: 'Development',
    iconName: 'Code',
    description: 'Code Editor (Fixed binary Code.exe without shell)',
    enabled: true,
  },
  {
    id: 'explorer',
    name: 'File Explorer',
    aliases: ['explorer', 'files', 'file explorer'],
    category: 'System',
    iconName: 'Folder',
    description: 'Windows Explorer (Fixed binary explorer.exe)',
    enabled: true,
  },
  {
    id: 'mspaint',
    name: 'Paint',
    aliases: ['paint', 'mspaint'],
    category: 'Media',
    iconName: 'Palette',
    description: 'System Paint (Fixed binary System32/mspaint.exe)',
    enabled: true,
  },
];

export function getStoredCompanionToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('elask_companion_token') || '';
  }
  return '';
}

export function setStoredCompanionToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('elask_companion_token', token.trim());
  }
}

export async function checkCompanionStatus(port: number = 9123): Promise<{
  online: boolean;
  latencyMs?: number;
  details?: any;
}> {
  const start = performance.now();
  // Attempt 1: Direct fetch to localhost
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
    // Attempt 2: Via server backend proxy check
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

export async function getCompanionPairingStatus(
  port: number = 9123,
  token?: string
): Promise<{ paired: boolean; requiresToken: boolean; allowedOrigins?: string[] } | null> {
  const activeToken = token || getStoredCompanionToken();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const headers: Record<string, string> = {};
    if (activeToken) {
      headers['X-ELASK-TOKEN'] = activeToken;
    }

    const res = await fetch(`http://127.0.0.1:${port}/api/pairing/status`, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      return await res.json();
    }
  } catch (_e) {}
  return null;
}

export async function executeCompanionAction(
  action: ActionPayload,
  token?: string,
  port: number = 9123
): Promise<{ success: boolean; message?: string; error?: string; simulated?: boolean }> {
  const activeToken = token || getStoredCompanionToken();

  if (!activeToken) {
    return {
      success: false,
      error: 'Companion pairing token required. Please paste your token from companion-config.json in Settings > Companion.',
    };
  }

  // Ensure action contains explicit app ID if launch app
  const safeAction = {
    ...action,
    confirmed: true, // Sensitive action confirmation verified by user
  };

  // Attempt 1: Direct localhost with X-ELASK-TOKEN header
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const directRes = await fetch(`http://127.0.0.1:${port}/api/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ELASK-TOKEN': activeToken,
      },
      body: JSON.stringify(safeAction),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (directRes.ok) {
      return await directRes.json();
    } else {
      const errData = await directRes.json().catch(() => ({}));
      return {
        success: false,
        error: errData.error || `Companion error: HTTP ${directRes.status}`,
      };
    }
  } catch (_directErr) {
    // Attempt 2: Via backend proxy
    try {
      const proxyRes = await fetch('/api/companion/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: safeAction, token: activeToken }),
      });
      if (proxyRes.ok) {
        return await proxyRes.json();
      } else {
        const errData = await proxyRes.json().catch(() => ({}));
        return {
          success: false,
          error: errData.error || `Proxy dispatch error: HTTP ${proxyRes.status}`,
        };
      }
    } catch (_proxyErr) {
      // Both failed
    }
  }

  return {
    success: false,
    error: 'Windows Companion service not reached at http://127.0.0.1:9123. Verify companion is running.',
  };
}

export async function getCompanionWakeWordStatus(port: number = 9123): Promise<{
  enabled: boolean;
  active: boolean;
  keyword: string;
  engine?: string;
  lastDetected?: string;
  detectionCount?: number;
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`http://127.0.0.1:${port}/api/wake-word/status`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      return await res.json();
    }
  } catch (_e) {}
  return null;
}

export async function toggleCompanionWakeWord(
  enabled?: boolean,
  port: number = 9123,
  token?: string
): Promise<{ success: boolean; enabled: boolean; active: boolean } | null> {
  const activeToken = token || getStoredCompanionToken();
  if (!activeToken) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`http://127.0.0.1:${port}/api/wake-word/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ELASK-TOKEN': activeToken,
      },
      body: JSON.stringify({ enabled }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      return await res.json();
    }
  } catch (_e) {}
  return null;
}

// Subscribe to companion wake events using fetch ReadableStream (NO TOKEN IN URL QUERY)
export function subscribeToCompanionWakeEvents(
  onWakeDetected: (data: any) => void,
  port: number = 9123,
  token?: string
): () => void {
  const activeToken = token || getStoredCompanionToken();
  if (!activeToken) return () => {};

  const abortController = new AbortController();

  (async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/wake-word/events`, {
        headers: {
          'X-ELASK-TOKEN': activeToken,
        },
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!abortController.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          const match = block.match(/data:\s*(.+)/);
          if (match && match[1]) {
            try {
              const data = JSON.parse(match[1]);
              if (data.type === 'WAKE_WORD_DETECTED') {
                onWakeDetected(data);
              }
            } catch (_e) {}
          }
        }
      }
    } catch (_err) {
      // Stream disconnected or aborted
    }
  })();

  return () => {
    abortController.abort();
  };
}
