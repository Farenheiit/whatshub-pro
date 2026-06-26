interface WhatsHubAccount {
  id: string;
  name: string;
  createdAt: string;
  url: string;
}

interface WhatsHubAPI {
  listAccounts(): Promise<WhatsHubAccount[]>;

  addAccount(): Promise<WhatsHubAccount>;

  renameAccount(
    id: string,
    name: string
  ): Promise<WhatsHubAccount[]>;

  deleteAccount(
    id: string
  ): Promise<WhatsHubAccount[]>;

  clearSession(id: string): Promise<boolean>;

  showAccount(id: string): Promise<boolean>;

  hideAllViews(): Promise<boolean>;

  getInfo(): Promise<{
    userDataPath: string;
    whatsappUrl: string;
    chromeUserAgent: string;
  }>;
}

declare global {
  interface Window {
    whatshub: WhatsHubAPI;
  }
}

export {};