import { useEffect, useRef, type ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  /** Texto do botão de confirmar (por omissão "Eliminar", a vermelho). */
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
}

export default function ConfirmDialog({
  open, title, description, onCancel, onConfirm,
  confirmLabel = 'Eliminar', danger = true, busy = false
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onMouseDown={onCancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          {typeof description === 'string' ? <p>{description}</p> : description}
        </div>
        <div className="modal-actions">
          <button ref={cancelRef} type="button" className="button secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className={`button${danger ? ' danger' : ''}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Aguarda…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
