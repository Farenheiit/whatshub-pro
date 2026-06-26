const { session, WebContentsView } = require('electron');

class ViewService {
  constructor(options) {
    this.whatsappUrl = options.whatsappUrl;
    this.chromeUserAgent = options.chromeUserAgent;
    this.accountExists = options.accountExists;
    this.accountPartition = options.accountPartition;

    this.mainWindow = null;
    this.activeAccountId = null;
    this.views = new Map();
  }

  setMainWindow(mainWindow) {
    this.mainWindow = mainWindow;
  }

  getBounds() {
    if (!this.mainWindow) {
      return { x: 276, y: 132, width: 900, height: 600 };
    }

    const bounds = this.mainWindow.getContentBounds();

    return {
      x: 276,
      y: 132,
      width: Math.max(200, bounds.width - 276),
      height: Math.max(200, bounds.height - 132)
    };
  }

  resizeActiveView() {
    if (!this.activeAccountId) return;

    const view = this.views.get(this.activeAccountId);
    if (!view) return;

    view.setBounds(this.getBounds());
  }

  hideAll() {
    for (const view of this.views.values()) {
      view.setBounds({
        x: -10000,
        y: -10000,
        width: 10,
        height: 10
      });
    }
  }

  createView(accountId) {
    if (!this.mainWindow) {
      throw new Error('Janela principal não criada.');
    }

    if (this.views.has(accountId)) {
      return this.views.get(accountId);
    }

    const partition = this.accountPartition(accountId);
    const ses = session.fromPartition(partition, { cache: true });

    ses.setUserAgent(this.chromeUserAgent);

    const view = new WebContentsView({
      webPreferences: {
        partition,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    view.webContents.setUserAgent(this.chromeUserAgent);

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

    this.mainWindow.contentView.addChildView(view);

    view.setBounds({
      x: -10000,
      y: -10000,
      width: 10,
      height: 10
    });

    view.webContents.loadURL(this.whatsappUrl);

    this.views.set(accountId, view);

    return view;
  }

  show(accountId) {
    if (!accountId) return false;

    if (!this.accountExists(accountId)) {
      console.warn('Conta não encontrada:', accountId);
      return false;
    }

    const view = this.createView(accountId);

    this.hideAll();

    this.activeAccountId = accountId;

    view.setBounds(this.getBounds());
    view.webContents.focus();

    return true;
  }

  remove(accountId) {
    const view = this.views.get(accountId);

    if (!view || !this.mainWindow) return;

    this.mainWindow.contentView.removeChildView(view);
    view.webContents.close();

    this.views.delete(accountId);

    if (this.activeAccountId === accountId) {
      this.activeAccountId = null;
    }
  }

  closeAll() {
    for (const view of this.views.values()) {
      view.webContents.close();
    }

    this.views.clear();
    this.activeAccountId = null;
  }
}

module.exports = { ViewService };