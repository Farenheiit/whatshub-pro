type WhatsHubAccount = {
  id: string;
  name: string;
  createdAt: string;
  url: string;
  showAccount: (id: string) => Promise<boolean>;
  hideAllViews: () => Promise<boolean>;
};

declare global {
  interface Window {
    whatshub: {
      listAccounts: () => Promise<WhatsHubAccount[]>;
      addAccount: () => Promise<WhatsHubAccount>;
      renameAccount: (id: string, name: string) => Promise<WhatsHubAccount[]>;
      deleteAccount: (id: string) => Promise<WhatsHubAccount[]>;
      clearSession: (id: string) => Promise<boolean>;
      getInfo: () => Promise<{ userDataPath: string; whatsappUrl: string; chromeUserAgent: string }>;
    };
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        partition?: string;
        useragent?: string;
        allowpopups?: string;
      };
    }
  }
}

export {};
