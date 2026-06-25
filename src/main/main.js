const { app, BrowserWindow, ipcMain, session, WebContentsView } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_DATA_NAME = 'WhatsHub';
const WHATSAPP_URL = 'https://web.whatsapp.com/';
const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

app.setName(APP_DATA_NAME);
app.setPath('userData', path.join(app.getPath('appData'), APP_DATA_NAME));

const configDir = path.join(app.getPath('userData'), 'config');
const configFile = path.join(configDir, 'accounts.json');

let mainWindow = null;
let activeAccountId = null;
const whatsappViews = new Map();

function ensureConfig() {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(configFile, JSON.stringify({ accounts: [] }, null, 2), 'utf-8');
  }
}

function readAccounts() {
  ensureConfig();

  try {
    const data = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    return Array.isArray(data.accounts) ? data.accounts : [];
  } catch (error) {
    console.error('Erro ao ler accounts.json:', error);
    return [];
  }
}

function writeAccounts(accounts) {
  ensureConfig();
  fs.writeFileSync(configFile, JSON.stringify({ accounts }, null, 2), 'utf-8');
}

function createAccountName(accounts) {
  let n = accounts.length + 1;
  const names = new Set(accounts.map((account) => account.name));

  while (names.has(`Conta ${n}`)) {
    n += 1;
  }

  return `Conta ${n}`;
}

function createAccount() {
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
}

function renameAccount(id, name) {
  const cleanName = String(name || '').trim().slice(0, 60);

  if (!cleanName) {
    throw new Error('Nome inválido.');
  }

  const accounts = readAccounts().map((account) =>
    account.id === id ? { ...account, name: cleanName } : account
  );

  writeAccounts(accounts);
  return accounts;
}

function deleteAccountFromConfig(id) {
  const accounts = readAccounts().filter((account) => account.id !== id);
  writeAccounts(accounts);
  return accounts;
}

function accountExists(id) {
  return readAccounts().some((account) => account.id === id);
}

function accountPartition(id) {
  return `persist:whatshub-${id}`;
}

function getWhatsappBounds() {
  if (!mainWindow) {
    return { x: 276, y: 132, width: 900, height: 600 };
  }

  const bounds = mainWindow.getContentBounds();

  return {
    x: 276,
    y: 132,
    width: Math.max(200, bounds.width - 276),
    height: Math.max(200, bounds.height - 132)
  };
}

function hideAllWhatsappViews() {
  for (const view of whatsappViews.values()) {
    view.setBounds({ x: -10000, y: -10000, width: 10, height: 10 });
  }
}

function resizeActiveWhatsappView() {
  if (!activeAccountId) return;

  const view = whatsappViews.get(activeAccountId);
  if (!view) return;

  view.setBounds(getWhatsappBounds());
}

function createWhatsappView(accountId) {
  if (!mainWindow) {
    throw new Error('Janela principal não criada.');
  }

  if (whatsappViews.has(accountId)) {
    return whatsappViews.get(accountId);
  }

  const partition = accountPartition(accountId);
  const ses = session.fromPartition(partition, { cache: true });

  ses.setUserAgent(CHROME_UA);

  const view = new WebContentsView({
    webPreferences: {
      partition,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  view.webContents.setUserAgent(CHROME_UA);

  view.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    const url = String(validatedURL || '');

    if (url.includes('flows.whatsapp.net')) {
      return;
    }

    console.warn('Falha ao carregar:', errorCode, errorDescription, url);
  });

  view.webContents.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  mainWindow.contentView.addChildView(view);

  view.setBounds({ x: -10000, y: -10000, width: 10, height: 10 });
  view.webContents.loadURL(WHATSAPP_URL);

  whatsappViews.set(accountId, view);

  return view;
}

function showWhatsappView(accountId) {
  if (!accountId) return false;

  if (!accountExists(accountId)) {
    console.warn('Conta não encontrada:', accountId);
    return false;
  }

  const view = createWhatsappView(accountId);

  hideAllWhatsappViews();

  activeAccountId = accountId;
  view.setBounds(getWhatsappBounds());
  view.webContents.focus();

  return true;
}

function removeWhatsappView(accountId) {
  const view = whatsappViews.get(accountId);

  if (!view || !mainWindow) return;

  mainWindow.contentView.removeChildView(view);
  view.webContents.close();

  whatsappViews.delete(accountId);

  if (activeAccountId === accountId) {
    activeAccountId = null;
  }
}

async function clearAccountSession(accountId) {
  removeWhatsappView(accountId);

  const ses = session.fromPartition(accountPartition(accountId));
  await ses.clearStorageData();
  await ses.clearCache();

  if (accountExists(accountId)) {
    createWhatsappView(accountId);

    if (activeAccountId === accountId) {
      showWhatsappView(accountId);
    }
  }

  return true;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
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
      webviewTag: false,
      sandbox: false
    }
  });

  mainWindow.webContents.setUserAgent(CHROME_UA);

  mainWindow.on('resize', resizeActiveWhatsappView);
  mainWindow.on('maximize', resizeActiveWhatsappView);
  mainWindow.on('unmaximize', resizeActiveWhatsappView);

  const isDev = process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }
}

function registerIpcHandlers() {
  ipcMain.handle('accounts:list', () => {
    const accounts = readAccounts();

    console.log("==== ACCOUNTS ====");
    console.log(accounts);
    console.log("==================");

    return accounts;
});

  ipcMain.handle('accounts:rename', (_event, id, name) => {
    return renameAccount(id, name);
  });

  ipcMain.handle('accounts:delete', async (_event, id) => {
    removeWhatsappView(id);

    const accounts = deleteAccountFromConfig(id);

    const ses = session.fromPartition(accountPartition(id));
    await ses.clearStorageData();
    await ses.clearCache();

    return accounts;
  });

  ipcMain.handle('accounts:clear-session', async (_event, id) => {
    return clearAccountSession(id);
  });

  ipcMain.handle('views:show-account', (_event, id) => {
    return showWhatsappView(id);
  });

  ipcMain.handle('views:hide-all', () => {
    hideAllWhatsappViews();
    activeAccountId = null;
    return true;
  });

  ipcMain.handle('app:get-info', () => ({
    userDataPath: app.getPath('userData'),
    whatsappUrl: WHATSAPP_URL,
    chromeUserAgent: CHROME_UA
  }));
}

app.whenReady().then(() => {
  ensureConfig();

  session.defaultSession.setUserAgent(CHROME_UA);

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = CHROME_UA;
    callback({ requestHeaders: details.requestHeaders });
  });

  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  for (const view of whatsappViews.values()) {
    view.webContents.close();
  }

  whatsappViews.clear();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});