import { create } from 'zustand';
import { accountService } from '../services/accountService';

type AccountStore = {
  accounts: WhatsHubAccount[];
  activeId: string | null;
  activeAccount: WhatsHubAccount | null;

  loadAccounts: () => Promise<void>;
  setActiveId: (id: string | null) => Promise<void>;
  addAccount: () => Promise<void>;
  renameAccount: (id: string, name: string) => Promise<void>;
  deleteAccount: (account: WhatsHubAccount) => Promise<void>;
  clearSession: (account: WhatsHubAccount) => Promise<void>;
};

export const useAccountStore = create<AccountStore>((set, get) => ({
  accounts: [],
  activeId: null,
  activeAccount: null,

  async loadAccounts() {
    const accounts = await accountService.listAccounts();
    const currentActiveId = get().activeId;
    const nextActiveId =
      currentActiveId && accounts.some((account) => account.id === currentActiveId)
        ? currentActiveId
        : accounts[0]?.id ?? null;

    set({
      accounts,
      activeId: nextActiveId,
      activeAccount: accounts.find((account) => account.id === nextActiveId) ?? null
    });

    if (nextActiveId) {
      await accountService.showAccount(nextActiveId);
    } else {
      await accountService.hideAllViews();
    }
  },

  async setActiveId(id) {
    const account = get().accounts.find((item) => item.id === id) ?? null;

    set({
      activeId: id,
      activeAccount: account
    });

    if (id) {
      await accountService.showAccount(id);
    } else {
      await accountService.hideAllViews();
    }
  },

  async addAccount() {
    const account = await accountService.addAccount();
    await get().loadAccounts();
    await get().setActiveId(account.id);
  },

  async renameAccount(id, name) {
    const accounts = await accountService.renameAccount(id, name);
    const activeId = get().activeId;

    set({
      accounts,
      activeAccount: accounts.find((account) => account.id === activeId) ?? null
    });
  },

  async deleteAccount(account) {
    const accounts = await accountService.deleteAccount(account.id);
    const activeId = get().activeId === account.id ? accounts[0]?.id ?? null : get().activeId;

    set({
      accounts,
      activeId,
      activeAccount: accounts.find((item) => item.id === activeId) ?? null
    });

    if (activeId) {
      await accountService.showAccount(activeId);
    } else {
      await accountService.hideAllViews();
    }
  },

  async clearSession(account) {
    await accountService.clearSession(account.id);
    await accountService.showAccount(account.id);
  }
}));