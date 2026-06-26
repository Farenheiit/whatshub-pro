import { useMemo, useState } from 'react';

export function useAccounts() {
  const [accounts, setAccounts] = useState<WhatsHubAccount[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeAccount = useMemo(
    () => accounts.find((account) => account.id === activeId) ?? null,
    [accounts, activeId]
  );

  async function loadAccounts() {
    const list = await window.whatshub.listAccounts();
    setAccounts(list);

    if (!activeId && list.length > 0) {
      setActiveId(list[0].id);
      await window.whatshub.showAccount(list[0].id);
    }
  }

  async function addAccount() {
    const account = await window.whatshub.addAccount();
    await loadAccounts();
    setActiveId(account.id);
  }

  async function renameAccount(id: string, name: string) {
    const list = await window.whatshub.renameAccount(id, name);
    setAccounts(list);
  }

  async function deleteAccount(account: WhatsHubAccount) {
    const list = await window.whatshub.deleteAccount(account.id);
    setAccounts(list);

    if (activeId === account.id) {
      setActiveId(list[0]?.id ?? null);
    }
  }

  async function clearSession(account: WhatsHubAccount) {
    await window.whatshub.clearSession(account.id);
    await window.whatshub.showAccount(account.id);
  }

  return {
    accounts,
    activeId,
    activeAccount,
    setActiveId,
    loadAccounts,
    addAccount,
    renameAccount,
    deleteAccount,
    clearSession
  };
}