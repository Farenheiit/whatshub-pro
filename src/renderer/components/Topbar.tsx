import React from 'react';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';

type TopbarProps = {
  account: WhatsHubAccount;
  onRename: () => void;
  onClearSession: () => void;
  onDelete: () => void;
};

export function Topbar({
  account,
  onRename,
  onClearSession,
  onDelete
}: TopbarProps) {
  return (
    <header className="topbar">
      <div>
        <h1>{account.name}</h1>
        <p>Sessão isolada e persistente</p>
      </div>

      <div className="topbar-actions">
        <button onClick={onRename}>
          <Pencil size={16} /> Renomear
        </button>

        <button onClick={onClearSession}>
          <RotateCcw size={16} /> Limpar sessão
        </button>

        <button className="danger" onClick={onDelete}>
          <Trash2 size={16} /> Remover
        </button>
      </div>
    </header>
  );
}