import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, Pencil, Trash2, RotateCcw, Info, X } from 'lucide-react';
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
    console.log('Contas carregadas:', list);

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
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">W</div>
          <div>
            <strong>WhatsHub</strong>
            <span>múltiplas contas</span>
          </div>
        </div>

        <button className="primary-button" onClick={addAccount}>
          <Plus size={18} /> Adicionar conta
        </button>

        <div className="account-list">
          {accounts.map((account) => (
            <button
              key={account.id}
              className={`account-item ${activeId === account.id ? 'active' : ''}`}
              onClick={() => setActiveId(account.id)}
            >
              <span className="avatar">{account.name.slice(0, 1).toUpperCase()}</span>
              <span className="account-name">{account.name}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="ghost-button" onClick={() => setModal({ type: 'info' })}>
            <Info size={16} /> Dados
          </button>
        </div>
      </aside>

      <main className="content">
        {activeAccount ? (
          <>
            <header className="topbar">
              <div>
                <h1>{activeAccount.name}</h1>
                <p>Sessão isolada e persistente</p>
              </div>

              <div className="topbar-actions">
                <button
                  onClick={() => {
                    setNewName(activeAccount.name);
                    setModal({ type: 'rename', account: activeAccount });
                  }}
                >
                  <Pencil size={16} /> Renomear
                </button>

                <button onClick={() => clearSession(activeAccount)}>
                  <RotateCcw size={16} /> Limpar sessão
                </button>

                <button className="danger" onClick={() => deleteAccount(activeAccount)}>
                  <Trash2 size={16} /> Remover
                </button>
              </div>
            </header>

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

            <input value={newName} onChange={(event) => setNewName(event.target.value)} autoFocus />

            <div className="modal-actions">
              <button onClick={() => setModal(null)}>Cancelar</button>
              <button className="primary-button" onClick={renameAccount}>Salvar</button>
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