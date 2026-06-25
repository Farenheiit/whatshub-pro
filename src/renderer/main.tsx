import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { X, Plus } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import './styles.css';

type ModalState =
  | { type: 'rename'; account: WhatsHubAccount }
  | { type: 'info' }
  | null;

function App() {
  const [accounts, setAccounts] = useState<WhatsHubAccount[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [newName, setNewName] = useState('');
  const [appInfo, setAppInfo] = useState<any>(null);

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

  useEffect(() => {
    loadAccounts();
    window.whatshub.getInfo().then(setAppInfo);
  }, []);

  useEffect(() => {
    if (activeId) {
      window.whatshub.showAccount(activeId);
    } else {
      window.whatshub.hideAllViews();
    }
  }, [activeId]);

  async function addAccount() {
    const account = await window.whatshub.addAccount();
    await loadAccounts();
    setActiveId(account.id);
  }

  async function renameAccount() {
    if (!modal || modal.type !== 'rename') return;

    const list = await window.whatshub.renameAccount(modal.account.id, newName);
    setAccounts(list);
    setModal(null);
  }

  async function deleteAccount(account: WhatsHubAccount) {
    const ok = confirm(`Remover "${account.name}"? A sessão dessa conta também será apagada.`);
    if (!ok) return;

    const list = await window.whatshub.deleteAccount(account.id);
    setAccounts(list);

    if (activeId === account.id) {
      setActiveId(list[0]?.id ?? null);
    }
  }

  async function clearSession(account: WhatsHubAccount) {
    const ok = confirm(`Limpar a sessão de "${account.name}"? Será necessário ler o QR Code novamente.`);
    if (!ok) return;

    await window.whatshub.clearSession(account.id);
    await window.whatshub.showAccount(account.id);
  }

  return (
    <div className="app-shell">
      <Sidebar
        accounts={accounts}
        activeId={activeId}
        onAddAccount={addAccount}
        onSelectAccount={setActiveId}
        onOpenInfo={() => setModal({ type: 'info' })}
      />

      <main className="content">
        {activeAccount ? (
          <>
            <Topbar
  account={activeAccount}
  onRename={() => {
    setNewName(activeAccount.name);
    setModal({ type: 'rename', account: activeAccount });
  }}
  onClearSession={() => clearSession(activeAccount)}
  onDelete={() => deleteAccount(activeAccount)}
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

      {modal?.type === 'rename' && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-close" onClick={() => setModal(null)}>
              <X size={18} />
            </button>

            <h2>Renomear conta</h2>

            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              autoFocus
            />

            <div className="modal-actions">
              <button onClick={() => setModal(null)}>Cancelar</button>
              <button className="primary-button" onClick={renameAccount}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {modal?.type === 'info' && (
        <div className="modal-backdrop">
          <div className="modal large">
            <button className="modal-close" onClick={() => setModal(null)}>
              <X size={18} />
            </button>

            <h2>Dados persistentes</h2>
            <p>As sessões e configurações ficam em uma pasta fixa.</p>
            <code>{appInfo?.userDataPath || 'Carregando...'}</code>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);