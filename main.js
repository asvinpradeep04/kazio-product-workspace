const { app, BrowserWindow, ipcMain, globalShortcut, session, dialog, screen, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let mainWindow;
let allowExit = false;
const submissionsDir = path.join(__dirname, 'submissions');

// Ensure local submissions directory exists
if (!fs.existsSync(submissionsDir)) {
  fs.mkdirSync(submissionsDir, { recursive: true });
}

// Whitelist and Blacklist rules for network filter
const WHITELIST_DOMAINS = [
  // Approved research destinations.
  'google.com', 'google.co.in', 'scholar.google.com',
  'wikipedia.org', 'en.wikipedia.org',
  'medium.com', 'substack.com', 'crunchbase.com', 'gartner.com',
  'mckinsey.com', 'harvardbusiness.org', 'nngroup.com',
  'productplan.com', 'roadmunk.com', 'figma.com', 'notion.so',
  'docs.google.com', 'sheets.google.com', 'slides.google.com',
  'lucidchart.com', 'draw.io', 'diagrams.net', 'typeform.com', 'canva.com',
  'facebook.com', 'linkedin.com', 'twitter.com', 'x.com',
  'semrush.com', 'similarweb.com', 'mailchimp.com', 'hubspot.com'
];

const BLACKLIST_PATTERNS = [
  'chatgpt.com', 'chat.openai.com', 'claude.ai', 'anthropic.com',
  'gemini.google.com', 'bard.google.com', 'perplexity.ai',
  'copilot.microsoft.com', 'github.com/copilot', 'jasper.ai',
  'copy.ai', 'writesonic.com', 'anyword.com', 'quillbot.com',
  'grammarly.com', 'notion.so/ai', 'canva.com/magic-write',
  'slack.com', 'discord.com', 'telegram.org', 'web.whatsapp.com', 'whatsapp.com',
  'gmail.com', 'outlook.com', 'zoom.us', 'meet.google.com',
  'fiverr.com', 'upwork.com', 'chegg.com', 'coursehero.com'
];

function isWhitelisted(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();
    
    // Check blacklist first
    for (const pattern of BLACKLIST_PATTERNS) {
      if (hostname.includes(pattern) || parsed.pathname.includes(pattern)) {
        return false;
      }
    }
    
    // Check whitelist
    for (const domain of WHITELIST_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return true;
      }
    }
    
    // Default fallback local file / app scheme
    if (parsed.protocol === 'file:' || parsed.protocol === 'data:') {
      return true;
    }

    return false;
  } catch (err) {
    return false;
  }
}

function enforcePrimaryDisplay() {
  try {
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setBounds(primary.bounds);
      mainWindow.setFullScreen(true);
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
    if (displays.length > 1 && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('violation-detected', {
        type: 'multiple_monitors',
        message: `Multiple displays detected (${displays.length} monitors connected). Assessment window locked to primary screen.`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (e) {
    console.error('[Multi-monitor enforcement error]:', e);
  }
}

const { execFile } = require('child_process');

function toggleTaskbar(show = true) {
  if (process.platform !== 'win32') return;
  const flag = show ? '5' : '0'; // 5 = SW_SHOW, 0 = SW_HIDE
  const psScript = `
$code = @'
using System;
using System.Runtime.InteropServices;
public class TaskbarUtil {
  [DllImport("user32.dll")] public static extern IntPtr FindWindow(string className, string windowName);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int nCmdShow);
}
'@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
$h1 = [TaskbarUtil]::FindWindow("Shell_TrayWnd", $null)
if ($h1 -ne [IntPtr]::Zero) { [TaskbarUtil]::ShowWindow($h1, ${flag}) }
$h2 = [TaskbarUtil]::FindWindow("Shell_SecondaryTrayWnd", $null)
if ($h2 -ne [IntPtr]::Zero) { [TaskbarUtil]::ShowWindow($h2, ${flag}) }
  `;

  execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], () => {});
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    fullscreen: true,
    kiosk: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      devTools: false
    }
  });

  // Highest window level prevents any other application window or taskbar from hovering over Kazio
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // Hide the Windows taskbar completely while in lockdown mode
  toggleTaskbar(false);

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Strict focus retention and external clipboard protection
  mainWindow.on('blur', () => {
    try { clipboard.clear(); } catch {}
    if (mainWindow && !mainWindow.isDestroyed()) {
      toggleTaskbar(false);
      setImmediate(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
          mainWindow.focus();
          mainWindow.setKiosk(true);
          mainWindow.setFullScreen(true);
        }
      });
      mainWindow.webContents.send('violation-detected', {
        type: 'window_blur',
        message: 'Window lost focus or Windows Key Start menu attempt detected. Returned focus & suppressed Taskbar/Start Menu.',
        timestamp: new Date().toISOString()
      });
    }
  });

  mainWindow.on('focus', () => {
    try { clipboard.clear(); } catch {}
    if (mainWindow && !mainWindow.isDestroyed()) {
      toggleTaskbar(false);
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });

  // Intercept Windows / Meta keys before Chromium processes them
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const isMetaKey = input.key === 'Meta' || input.key === 'OS' || input.code === 'MetaLeft' || input.code === 'MetaRight';
    if (isMetaKey) {
      event.preventDefault();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        mainWindow.focus();
        mainWindow.webContents.send('violation-detected', {
          type: 'windows_key_pressed',
          message: 'Windows Key press detected and suppressed.',
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  mainWindow.on('minimize', (e) => {
    e.preventDefault();
    mainWindow.restore();
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.focus();
  });

  // Prevent closing unless Ctrl+Q is explicitly pressed
  mainWindow.on('close', (e) => {
    if (!allowExit) {
      e.preventDefault();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('violation-detected', {
          type: 'attempted_close',
          message: 'Close attempt blocked. Lockdown active — exit strictly using Ctrl+Q.',
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  // Check multi-monitor setup
  enforcePrimaryDisplay();

  // Automatically approve media requests (webcam and microphone)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'camera' || permission === 'microphone') {
      return callback(true);
    }
    callback(true);
  });
  session.defaultSession.setPermissionCheckHandler(() => true);

  // Intercept web requests to enforce network security whitelist
  const filter = { urls: ['http://*/*', 'https://*/*'] };
  session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
    const urlStr = details.url;

    // AI Overview Stripping on Google Search
    if (urlStr.includes('google.com/search') && !urlStr.includes('udm=14')) {
      const redirectUrl = urlStr.includes('?') ? `${urlStr}&udm=14` : `${urlStr}?udm=14`;
      return callback({ redirectURL: redirectUrl });
    }

    if (!isWhitelisted(urlStr)) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('violation-detected', {
          type: 'blocked_url',
          message: `Attempted access to unauthorized URL: ${urlStr}`,
          url: urlStr,
          timestamp: new Date().toISOString()
        });
      }
      return callback({ cancel: true });
    }

    callback({});
  });
}

// Global shortcut suppression & Ctrl+Q exit handling
function registerLockdownShortcuts() {
  // Only shortcut allowed to exit the lockdown environment
  try {
    globalShortcut.register('CommandOrControl+Q', () => {
      allowExit = true;
      app.quit();
    });
  } catch (e) {
    console.error('Failed to register Ctrl+Q shortcut:', e);
  }

  // Dynamically register all Windows key combinations (Super+A..Z, Super+0..9)
  const winKeyChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
  winKeyChars.forEach(char => {
    const sc = `Super+${char}`;
    try {
      globalShortcut.register(sc, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
          mainWindow.focus();
          mainWindow.webContents.send('violation-detected', {
            type: 'blocked_shortcut',
            message: `Windows Key shortcut (${sc}) intercepted and suppressed.`,
            shortcut: sc,
            timestamp: new Date().toISOString()
          });
        }
      });
    } catch (e) {}
  });

  const shortcutsToBlock = [
    'CommandOrControl+Shift+I',
    'F12',
    'CommandOrControl+R',
    'F5',
    'Alt+Tab',
    'Command+Tab',
    'Alt+F4',
    'Alt+Space',
    'Ctrl+Escape',
    'Super+Tab',
    'Super+Space',
    'Super+Enter',
    'Super+Shift+S',
    'CommandOrControl+C',
    'CommandOrControl+V',
    'CommandOrControl+X',
    'CommandOrControl+A',
    'CommandOrControl+Shift+C',
    'CommandOrControl+Shift+J',
    'CommandOrControl+U',
    'CommandOrControl+P',
    'CommandOrControl+S',
    'CommandOrControl+N',
    'CommandOrControl+T',
    'CommandOrControl+W',
    'CommandOrControl+Shift+N',
    'CommandOrControl+Shift+T',
    'CommandOrControl+Option+I',
    'CommandOrControl+Option+J',
    'CommandOrControl+Option+U'
  ];

  shortcutsToBlock.forEach(shortcut => {
    try {
      globalShortcut.register(shortcut, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('violation-detected', {
            type: 'blocked_shortcut',
            message: `Interception triggered for blocked shortcut / key: ${shortcut}`,
            shortcut: shortcut,
            timestamp: new Date().toISOString()
          });
        }
      });
    } catch (e) {
      // Ignore unsupported platforms shortcuts
    }
  });
}

app.whenReady().then(() => {
  try { app.setAsDefaultProtocolClient('kazio'); } catch {}
  createWindow();
  registerLockdownShortcuts();

  screen.on('display-added', enforcePrimaryDisplay);
  screen.on('display-removed', enforcePrimaryDisplay);
  screen.on('display-metrics-changed', enforcePrimaryDisplay);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  toggleTaskbar(true);
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Communication Handlers
ipcMain.handle('get-initial-data', () => {
  return {
    candidate: {
      name: "Alex Morgan",
      email: "alex.morgan@candidate.kazio.io",
      role: "Product Manager",
      challengeTitle: "Growth Strategy & Feature Prioritization Challenge"
    },
    durationMinutes: 60,
    brief: {
      title: "Kazio B2B SaaS Growth & AI Lockout Strategy",
      objective: "Develop a 3-month product roadmap and competitive differentiation framework for Kazio's candidate assessment ecosystem. Address how to scale anti-cheat detection while improving candidate experience for Product Managers and Growth Marketers.",
      sections: [
        {
          heading: "Problem Statement",
          content: "Recruiters and hiring managers struggle with identifying authentic candidate problem-solving ability in an age of ubiquitous LLM usage. Candidates are utilizing unauthorized AI assistants during take-home assignments."
        },
        {
          heading: "Deliverables Required",
          content: "1. Executive Summary & Problem Breakdown\n2. Feature Prioritization Matrix (RICE framework)\n3. 3-Month Execution Roadmap (Sprint breakdown)\n4. Risk Mitigation & Candidate UX Strategy"
        }
      ],
      resources: [
        { title: "Google Web Search (AI-Stripped)", url: "https://www.google.com" },
        { title: "Wikipedia Tech Terms", url: "https://en.wikipedia.org" },
        { title: "Nielsen Norman UX Research", url: "https://www.nngroup.com" }
      ]
    }
  };
});

ipcMain.handle('save-draft', async (event, draftData) => {
  try {
    const draftPath = path.join(submissionsDir, 'draft.json');
    const payload = {
      savedAt: new Date().toISOString(),
      content: draftData.content,
      notes: draftData.notes,
      wordCount: draftData.wordCount
    };
    fs.writeFileSync(draftPath, JSON.stringify(payload, null, 2), 'utf8');
    return { success: true, timestamp: payload.savedAt };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('submit-challenge', async (event, submissionData) => {
  try {
    const timestamp = Date.now();
    const submissionPath = path.join(submissionsDir, `submission_${timestamp}.json`);
    
    // Hash for submission integrity
    const contentHash = crypto.createHash('sha256').update(submissionData.content).digest('hex');
    
    const payload = {
      submissionId: `KAZIO-SUB-${timestamp}`,
      submittedAt: new Date().toISOString(),
      candidate: submissionData.candidate,
      content: submissionData.content,
      notes: submissionData.notes,
      violations: submissionData.violations || [],
      metadata: {
        contentHash: contentHash,
        wordCount: submissionData.wordCount,
        characterCount: submissionData.content.length,
        durationSecondsSpent: submissionData.durationSecondsSpent
      }
    };
    
    fs.writeFileSync(submissionPath, JSON.stringify(payload, null, 2), 'utf8');
    return { success: true, submissionId: payload.submissionId, submittedAt: payload.submittedAt };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('log-violation', (event, violationData) => {
  const logPath = path.join(submissionsDir, 'violations.log');
  const line = `[${violationData.timestamp}] [${violationData.type}] ${violationData.message}\n`;
  fs.appendFileSync(logPath, line, 'utf8');
  return { logged: true };
});

ipcMain.handle('exit-app', () => {
  app.quit();
});
