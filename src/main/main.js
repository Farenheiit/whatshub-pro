const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_DATA_NAME = 'WhatsHub';
app.setName(APP_DATA_NAME);
app.setPath('userData', path.join(app.getPath('appData'), APP_DATA_NAME));

const WHATSAPP_URL = 'https://web.whatsapp.com/';
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
const configDir = path.join(app.getPath('userData'), 'config');
const configFile = path.join(configDir, 'accounts.json');

function ensureConfig() {
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(configFile, JSON.stringify({ accounts: [] }, null, 2), 'utf-8');
  }
}

function readAccounts() {
  ensureConfig();
  try {
    const data = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    return Array.isArray(data.accounts) ? data.accounts : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts) {
  ensureConfig();
  fs.writeFileSync(configFile, JSON.stringify({ accounts }, null, 2), 'utf-8');
}

function createAccountName(accounts) {
  let n = accounts.length + 1;
  const names = new Set(accounts.map((a) => a.name));
  while (names.has(`Conta ${n}`)) n += 1;
  return `Conta ${n}`;
}

function accountPartition(id) {
  return `persist:whatshub-${id}`;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 650,
    title: 'WhatsHub',
    backgroundColor: '#101418',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: false
    }
  });

  win.webContents.setUserAgent(CHROME_UA);

  const isDev = process.argv.includes('--dev');
  if (isDev) {
    win.loadURL('http://127.0.0.1:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }
}

app.whenReady().then(() => {
  ensureConfig();

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = CHROME_UA;
    callback({ requestHeaders: details.requestHeaders });
  });

  ipcMain.handle('accounts:list', () => readAccounts());

  ipcMain.handle('accounts:add', () => {
    const accounts = readAccounts();
    const account = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: createAccountName(accounts),
      createdAt: new Date().toISOString(),
      url: WHATSAPP_URL
    };
    accounts.push(account);
    writeAccounts(accounts);
    return account;
  });

  ipcMain.handle('accounts:rename', (_event, id, name) => {
    const cleanName = String(name || '').trim().slice(0, 60);
    if (!cleanName) throw new Error('Nome inválido.');
    const accounts = readAccounts().map((a) => a.id === id ? { ...a, name: cleanName } : a);
    writeAccounts(accounts);
    return accounts;
  });

  ipcMain.handle('accounts:delete', async (_event, id) => {
    const accounts = readAccounts().filter((a) => a.id !== id);
    writeAccounts(accounts);
    const ses = session.fromPartition(accountPartition(id));
    await ses.clearStorageData();
    await ses.clearCache();
    return accounts;
  });

  ipcMain.handle('accounts:clear-session', async (_event, id) => {
    const ses = session.fromPartition(accountPartition(id));
    await ses.clearStorageData();
    await ses.clearCache();
    return true;
  });

  ipcMain.handle('app:get-info', () => ({
    userDataPath: app.getPath('userData'),
    whatsappUrl: WHATSAPP_URL,
    chromeUserAgent: CHROME_UA
  }));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
