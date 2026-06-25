import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, Pencil, Trash2, RotateCcw, Info, X } from 'lucide-react';
import './styles.css';

const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

type ModalState =
  | { type: 'rename'; account: WhatsHubAccount }
  | { type: 'info' }
  | null;

function partitionFor(account: WhatsHubAccount) {
  return `persist:whatshub-${account.id}`;
}

function App() {
  const [accounts, setAccounts] = useState<WhatsHubAccount[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [newName, setNewName] = useState('');
  const [appInfo, setAppInfo] = useState<{ userDataPath: string; whatsappUrl: string; chromeUserAgent: string } | null>(null);

  const activeAccount = useMemo(() => accounts.find((a) => a.id === activeId) || accounts[0], [accounts, activeId]);

  async function refreshAccounts() {
    const list = await window.whatshub.listAccounts();
    setAccounts(list);
    if (!activeId && list[0]) setActiveId(list[0].id);
    if (activeId && !list.some((a) => a.id === activeId)) setActiveId(list[0]?.id ?? null);
  }

  useEffect(() => {
    refreshAccounts();
    window.whatshub.getInfo().then(setAppInfo);
  }, []);

  async function addAccount() {
    const account = await window.whatshub.addAccount();
    setAccounts((prev) => [...prev, account]);
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
    if (activeId === account.id) setActiveId(list[0]?.id ?? null);
  }

  async function clearSession(account: WhatsHubAccount) {
    const ok = confirm(`Limpar a sessão de "${account.name}"? Será necessário ler o QR Code novamente.`);
    if (!ok) return;
    await window.whatshub.clearSession(account.id);
    location.reload();
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
              className={`account-item ${activeAccount?.id === account.id ? 'active' : ''}`}
              onClick={() => setActiveId(account.id)}
            >
              <span className="avatar">{account.name.slice(0, 1).toUpperCase()}</span>
              <span className="account-name">{account.name}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="ghost-button" onClick={() => setModal({ type: 'info' })}><Info size={16} /> Dados</button>
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
                <button onClick={() => { setNewName(activeAccount.name); setModal({ type: 'rename', account: activeAccount }); }}><Pencil size={16} /> Renomear</button>
                <button onClick={() => clearSession(activeAccount)}><RotateCcw size={16} /> Limpar sessão</button>
                <button className="danger" onClick={() => deleteAccount(activeAccount)}><Trash2 size={16} /> Remover</button>
              </div>
            </header>

            <section className="webview-stack">
              {accounts.map((account) => (
                <webview
                  key={account.id}
                  src={account.url}
                  partition={partitionFor(account)}
                  useragent={chromeUA}
                  allowpopups="true"
                  className={`whatsapp-view ${activeAccount.id === account.id ? 'visible' : 'hidden'}`}
                />
              ))}
            </section>
          </>
        ) : (
          <div className="empty-state">
            <h2>Nenhuma conta cadastrada</h2>
            <p>Adicione uma conta para abrir o WhatsApp Web em uma sessão própria.</p>
            <button className="primary-button" onClick={addAccount}><Plus size={18} /> Adicionar primeira conta</button>
          </div>
        )}
      </main>

      {modal?.type === 'rename' && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-close" onClick={() => setModal(null)}><X size={18} /></button>
            <h2>Renomear conta</h2>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
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
            <button className="modal-close" onClick={() => setModal(null)}><X size={18} /></button>
            <h2>Dados persistentes</h2>
            <p>As sessões e configurações ficam em uma pasta fixa. Atualizar o app não deve apagar os logins.</p>
            <code>{appInfo?.userDataPath || 'Carregando...'}</code>
            <p className="hint">Faça backup dessa pasta se quiser preservar as conexões.</p>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
