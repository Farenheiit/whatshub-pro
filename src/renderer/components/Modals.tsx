import React from 'react';
import { X } from 'lucide-react';

type ModalState =
  | { type: 'rename'; account: WhatsHubAccount }
  | { type: 'info' }
  | null;

type ModalsProps = {
  modal: ModalState;
  newName: string;
  appInfo: any;
  onChangeName: (value: string) => void;
  onClose: () => void;
  onSaveRename: () => void;
};

function Modals({
  modal,
  newName,
  appInfo,
  onChangeName,
  onClose,
  onSaveRename
}: ModalsProps) {
  // conteúdo igual
}

export { Modals };

  if (modal.type === 'rename') {
    return (
      <div className="modal-backdrop">
        <div className="modal">
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>

          <h2>Renomear conta</h2>

          <input
            value={newName}
            onChange={(event) => onChangeName(event.target.value)}
            autoFocus
          />

          <div className="modal-actions">
            <button onClick={onClose}>Cancelar</button>
            <button className="primary-button" onClick={onSaveRename}>
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop">
      <div className="modal large">
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <h2>Dados persistentes</h2>
        <p>As sessões e configurações ficam em uma pasta fixa.</p>
        <code>{appInfo?.userDataPath || 'Carregando...'}</code>
      </div>
    </div>
  );