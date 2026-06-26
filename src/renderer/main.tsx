import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Modals } from './components/Modals';
import { useAccounts } from './hooks/useAccounts';
import './styles.css';

type ModalState =
  | { type: 'rename'; account: WhatsHubAccount }
  | { type: 'info' }
  | null;

function App() {
  const {
    accounts,
    activeId,
    activeAccount,
    setActiveId,
    loadAccounts,
    addAccount,
    renameAccount: renameAccountFromHook,
    deleteAccount,
    clearSession
  } = useAccounts();

  const [modal, setModal] = useState<ModalState>(null);
  const [newName, setNewName] = useState('');
  const [appInfo, setAppInfo] = useState<any>(null);

  useEffect(() => {
    loadAccounts();
    window.whatshub.getInfo().then(setAppInfo);
  }, []);

  useEffect(() => {
    if (modal) {
      window.whatshub.hideAllViews();
      return;
    }

    if (activeId) {
      window.whatshub.showAccount(activeId);
    } else {
      window.whatshub.hideAllViews();
    }
  }, [modal, activeId]);

  function openRenameModal(account: WhatsHubAccount) {
    setNewName(account.name);
    setModal({ type: 'rename', account });
  }

  function openInfoModal() {
    setModal({ type: 'info' });
  }

  function closeModal() {
    setModal(null);
  }

  async function renameAccount() {
    if (!modal || modal.type !== 'rename') return;

    await renameAccountFromHook(modal.account.id, newName);
    setModal(null);
  }

  async function handleDeleteAccount(account: WhatsHubAccount) {
    const ok = confirm(`Remover "${account.name}"? A sessão dessa conta também será apagada.`);
    if (!ok) return;

    await deleteAccount(account);
  }

  async function handleClearSession(account: WhatsHubAccount) {
    const ok = confirm(`Limpar a sessão de "${account.name}"? Será necessário ler o QR Code novamente.`);
    if (!ok) return;

    await clearSession(account);
  }

  return (
    <div className="app-shell">
      <Sidebar
        accounts={accounts}
        activeId={activeId}
        onAddAccount={addAccount}
        onSelectAccount={setActiveId}
        onOpenInfo={openInfoModal}
      />

      <main className="content">
        {activeAccount ? (
          <>
            <Topbar
              account={activeAccount}
              onRename={() => openRenameModal(activeAccount)}
              onClearSession={() => handleClearSession(activeAccount)}
              onDelete={() => handleDeleteAccount(activeAccount)}
            />

            <section className="webview-stack" />
          </>
        ) : (
          <div className="empty-state">
            <h2>Nenhuma conta cadastrada</h2>
            <p>Adicione uma conta para abrir o WhatsApp Web em uma sessão própria.</p>
            <button className="primary-button" onClick={addAccount}>
              <Plus size={18} /> Adicionar primeira conta
            </button>
          </div>
        )}
      </main>

      <Modals
        modal={modal}
        newName={newName}
        appInfo={appInfo}
        onChangeName={setNewName}
        onClose={closeModal}
        onSaveRename={renameAccount}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);