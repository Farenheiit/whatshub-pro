import React from 'react';
import { Plus, Info } from 'lucide-react';

type SidebarProps = {
  accounts: WhatsHubAccount[];
  activeId: string | null;
  onAddAccount: () => void;
  onSelectAccount: (id: string) => void;
  onOpenInfo: () => void;
};

export function Sidebar({
  accounts,
  activeId,
  onAddAccount,
  onSelectAccount,
  onOpenInfo
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">W</div>
        <div>
          <strong>WhatsHub</strong>
          <span>múltiplas contas</span>
        </div>
      </div>

      <button className="primary-button" onClick={onAddAccount}>
        <Plus size={18} /> Adicionar conta
      </button>

      <div className="account-list">
        {accounts.map((account) => (
          <button
            key={account.id}
            className={`account-item ${activeId === account.id ? 'active' : ''}`}
            onClick={() => onSelectAccount(account.id)}
          >
            <span className="avatar">{account.name.slice(0, 1).toUpperCase()}</span>
            <span className="account-name">{account.name}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="ghost-button" onClick={onOpenInfo}>
          <Info size={16} /> Dados
        </button>
      </div>
    </aside>
  );
}