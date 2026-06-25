const { app, BrowserWindow, ipcMain, session, WebContentsView } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Nome fixo do aplicativo.
 * Isso é importante porque define onde o Electron salva dados persistentes.
 */
const APP_DATA_NAME = 'WhatsHub';

app.setName(APP_DATA_NAME);

/**
 * Força uma pasta fixa para dados do app:
 * C:\Users\SEU_USUARIO\AppData\Roaming\WhatsHub
 *
 * Assim, atualizações futuras não devem apagar sessões.
 */
app.setPath('userData', path.join(app.getPath('appData'), APP_DATA_NAME));

const WHATSAPP_URL = 'https://web.whatsapp.com/';

/**
 * User-Agent moderno para evitar que o WhatsApp Web ache
 * que o Electron é um navegador antigo.
 */
const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

/**
 * Arquivo onde ficam salvas as contas cadastradas.
 * As sessões em si ficam nas partições persistentes do Electron.
 */
const configDir = path.join(app.getPath('userData'), 'config');
const configFile = path.join(configDir, 'accounts.json');

/**
 * Referência global para a janela principal.
 */
let mainWindow = null;

/**
 * Mapa em memória com as views do WhatsApp.
 *
 * Estrutura:
 * accountId -> WebContentsView
 */
const whatsappViews = new Map();

/**
 * Conta atualmente visível na tela.
 */
let activeAccountId = null;

/**
 * Garante que a pasta de configuração e o arquivo accounts.json existam.
 */
function ensureConfig() {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(
      configFile,
      JSON.stringify({ accounts: [] }, null, 2),
      'utf-8'
    );
  }
}

/**
 * Lê as contas cadastradas no arquivo accounts.json.
 */
function readAccounts() {
  ensureConfig();

  try {
    const data = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    return Array.isArray(data.accounts) ? data.accounts : [];
  } catch {
    return [];
  }
}

/**
 * Salva a lista de contas no arquivo accounts.json.
 */
function writeAccounts(accounts) {
  ensureConfig();

  fs.writeFileSync(
    configFile,
    JSON.stringify({ accounts }, null, 2),
    'utf-8'
  );
}

/**
 * Cria um nome automático para nova conta.
 * Exemplo: Conta 1, Conta 2, Conta 3...
 */
function createAccountName(accounts) {
  let n = accounts.length + 1;
  const names = new Set(accounts.map((a) => a.name));

  while (names.has(`Conta ${n}`)) {
    n += 1;
  }

  return `Conta ${n}`;
}

/**
 * Define a partição persistente de cada conta.
 *
 * Cada conta recebe uma sessão própria:
 * - cookies
 * - localStorage
 * - IndexedDB
 * - cache
 *
 * Isso permite múltiplos WhatsApps logados ao mesmo tempo.
 */
function accountPartition(id) {
  return `persist:whatshub-${id}`;
}

/**
 * Calcula onde a view do WhatsApp deve aparecer.
 *
 * Como a interface do React ocupa:
 * - lateral esquerda
 * - cabeçalho superior
 *
 * a WebContentsView precisa começar depois desses elementos.
 */
function getContentBounds() {
  if (!mainWindow) {
    return {
      x: 276,
      y: 132,
      width: 900,
      height: 600
    };
  }

  const bounds = mainWindow.getContentBounds();

  return {
    x: 276,
    y: 132,
    width: Math.max(200, bounds.width - 276),
    height: Math.max(200, bounds.height - 132)
  };
}

/**
 * Redimensiona a view ativa quando a janela muda de tamanho.
 */
function resizeActiveView() {
  if (!activeAccountId) return;

  const view = whatsappViews.get(activeAccountId);
  if (!view) return;

  view.setBounds(getContentBounds());
}

/**
 * Esconde todas as views movendo-as para fora da tela.
 *
 * Importante:
 * não destruímos nem recarregamos a view.
 * Só escondemos visualmente.
 */
function hideAllWhatsappViews() {
  for (const view of whatsappViews.values()) {
    view.setBounds({
      x: -10000,
      y: -10000,
      width: 10,
      height: 10
    });
  }
}

/**
 * Cria uma WebContentsView do WhatsApp para uma conta.
 *
 * Se a view já existe, apenas retorna a existente.
 */
function createWhatsappView(accountId) {
  if (!mainWindow) {
    throw new Error('Janela principal não criada.');
  }

  /**
   * Evita criar duas views para a mesma conta.
   */
  if (whatsappViews.has(accountId)) {
    return whatsappViews.get(accountId);
  }

  /**
   * Cria ou recupera a sessão persistente daquela conta.
   */
  const ses = session.fromPartition(accountPartition(accountId), {
    cache: true
  });

  /**
   * Aplica User-Agent moderno também nessa sessão.
   */
  ses.setUserAgent(CHROME_UA);

  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = CHROME_UA;
    callback({ requestHeaders: details.requestHeaders });
  });

  /**
   * Cria a view que vai carregar o WhatsApp Web.
   *
   * Diferente do <webview>, essa view é controlada pelo processo principal.
   */
  const view = new WebContentsView({
    webPreferences: {
      partition: accountPartition(accountId),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  view.webContents.setUserAgent(CHROME_UA);

  /**
   * Ignora erro conhecido do WhatsApp Flows.
   * Esse erro costuma aparecer no terminal, mas não impede o WhatsApp de funcionar.
   */
  view.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL) => {
      if (String(validatedURL).includes('flows.whatsapp.net')) return;

      console.warn(
        'Falha ao carregar:',
        errorCode,
        errorDescription,
        validatedURL
      );
    }
  );

  /**
   * Adiciona a view dentro da janela principal.
   */
  mainWindow.contentView.addChildView(view);

  /**
   * Começa escondida.
   */
  view.setBounds({
    x: -10000,
    y: -10000,
    width: 10,
    height: 10
  });

  /**
   * Carrega o WhatsApp Web.
   */
  view.webContents.loadURL(WHATSAPP_URL);

  /**
   * Salva no mapa em memória.
   */
  whatsappViews.set(accountId, view);

  return view;
}

/**
 * Mostra a view de uma conta específica.
 */
function showWhatsappView(accountId) {
  createWhatsappView(accountId);

  hideAllWhatsappViews();

  activeAccountId = accountId;

  const view = whatsappViews.get(accountId);

  view.setBounds(getContentBounds());
  view.webContents.focus();
}

/**
 * Remove uma view da janela e da memória.
 */
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

/**
 * Cria a janela principal do aplicativo.
 */
function createWindow() {
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

      /**
       * Agora não usamos mais <webview>.
       * O WhatsApp será controlado por WebContentsView.
       */
      webviewTag: false,

      sandbox: false
    }
  });

  mainWindow.webContents.setUserAgent(CHROME_UA);

  /**
   * Mantém a view ativa ajustada ao tamanho da janela.
   */
  mainWindow.on('resize', resizeActiveView);
  mainWindow.on('maximize', resizeActiveView);
  mainWindow.on('unmaximize', resizeActiveView);

  const isDev = process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }
}

/**
 * Inicialização principal do Electron.
 */
app.whenReady().then(() => {
  ensureConfig();

  /**
   * Aplica User-Agent moderno na sessão padrão também.
   */
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = CHROME_UA;
    callback({ requestHeaders: details.requestHeaders });
  });

  /**
   * Lista contas cadastradas.
   */
  ipcMain.handle('accounts:list', () => readAccounts());

  /**
   * Adiciona uma nova conta.
   */
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

    /**
     * Já cria a view em segundo plano.
     */
    createWhatsappView(account.id);

    return account;
  });

  /**
   * Renomeia uma conta.
   */
  ipcMain.handle('accounts:rename', (_event, id, name) => {
    const cleanName = String(name || '').trim().slice(0, 60);

    if (!cleanName) {
      throw new Error('Nome inválido.');
    }

    const accounts = readAccounts().map((a) =>
      a.id === id ? { ...a, name: cleanName } : a
    );

    writeAccounts(accounts);

    return accounts;
  });

  /**
   * Remove uma conta e limpa sua sessão.
   */
  ipcMain.handle('accounts:delete', async (_event, id) => {
    removeWhatsappView(id);

    const accounts = readAccounts().filter((a) => a.id !== id);
    writeAccounts(accounts);

    const ses = session.fromPartition(accountPartition(id));
    await ses.clearStorageData();
    await ses.clearCache();

    return accounts;
  });

  /**
   * Limpa a sessão de uma conta, mas mantém a conta cadastrada.
   */
  ipcMain.handle('accounts:clear-session', async (_event, id) => {
    removeWhatsappView(id);

    const ses = session.fromPartition(accountPartition(id));
    await ses.clearStorageData();
    await ses.clearCache();

    createWhatsappView(id);

    if (activeAccountId === id) {
      showWhatsappView(id);
    }

    return true;
  });

  /**
   * Mostra uma conta específica na área principal.
   */
  ipcMain.handle('views:show-account', (_event, id) => {
    showWhatsappView(id);
    return true;
  });

  /**
   * Esconde todas as contas.
   */
  ipcMain.handle('views:hide-all', () => {
    hideAllWhatsappViews();
    activeAccountId = null;
    return true;
  });

  /**
   * Informações úteis para tela de dados/debug.
   */
  ipcMain.handle('app:get-info', () => ({
    userDataPath: app.getPath('userData'),
    whatsappUrl: WHATSAPP_URL,
    chromeUserAgent: CHROME_UA
  }));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Fecha o app quando todas as janelas são fechadas.
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});