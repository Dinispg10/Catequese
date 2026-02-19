import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SimpleEntity } from '../lib/types';
import FormField from '../components/FormField';
import SelectField from '../components/SelectField';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';

interface CentroCatequese extends SimpleEntity {
  paroquia_id: string | null;
}

type SectionType = 'paroquia' | 'escola' | 'catequista' | 'centro';

// ──────────────────────────────────────────────────────────────
// Modal de edição/criação genérico
// ──────────────────────────────────────────────────────────────
interface EditModalProps {
  title: string;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  isNew: boolean;
  children: React.ReactNode;
  error?: string | null;
}

function EditModal({ title, onClose, onSave, onDelete, isNew, children, error }: EditModalProps) {
  // Fechar com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal edit-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, letterSpacing: '-0.01em' }}>{title}</span>
            {!isNew && (
              <span className="edit-modal-badge">Editar</span>
            )}
          </h3>
          <button className="modal-close-btn" onClick={onClose} type="button" aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="form">{children}</div>
          {error && <div className="alert" style={{ marginTop: 10 }}>{error}</div>}
        </div>

        <div className="modal-actions">
          {!isNew && onDelete && (
            <button type="button" className="button danger" onClick={onDelete}>
              Eliminar
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="button" onClick={onSave}>
            {isNew ? 'Criar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Cabeçalho dos cards com botão "+ Novo"
// ──────────────────────────────────────────────────────────────
function CardHeader({ title, onNew }: { title: string; onNew: () => void }) {
  return (
    <div className="defn-card-header">
      <span className="defn-card-title">{title}</span>
      <button type="button" className="button defn-new-btn" onClick={onNew}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Novo
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────
const emptyEntity: SimpleEntity = { id: '', nome: '' };

export default function Definicoes() {
  const [paroquias, setParoquias] = useState<SimpleEntity[]>([]);
  const [escolas, setEscolas] = useState<SimpleEntity[]>([]);
  const [catequistas, setCatequistas] = useState<SimpleEntity[]>([]);
  const [centros, setCentros] = useState<CentroCatequese[]>([]);

  // Modal state
  const [modal, setModal] = useState<{ type: SectionType; item: SimpleEntity | CentroCatequese } | null>(null);
  const [confirm, setConfirm] = useState<{ type: SectionType } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const paroquiaOptions = useMemo(
    () => paroquias.map((p) => ({ value: p.id, label: p.nome })),
    [paroquias]
  );

  const loadAll = async () => {
    const [{ data: paroquiasData }, { data: escolasData }, { data: catequistasData }, { data: centrosData }] =
      await Promise.all([
        supabase.from('paroquias').select('*').order('nome'),
        supabase.from('escolas').select('*').order('nome'),
        supabase.from('catequistas').select('*').order('nome'),
        supabase.from('centros_catequese').select('*').order('nome')
      ]);

    setParoquias(paroquiasData ?? []);
    setEscolas(escolasData ?? []);
    setCatequistas(catequistasData ?? []);
    setCentros(centrosData ?? []);
  };

  useEffect(() => { loadAll(); }, []);

  // Abrir modal para criar
  const openNew = (type: SectionType) => {
    setModalError(null);
    if (type === 'centro') {
      setModal({ type, item: { id: '', nome: '', paroquia_id: null } });
    } else {
      setModal({ type, item: { ...emptyEntity } });
    }
  };

  // Abrir modal para editar
  const openEdit = (type: SectionType, item: SimpleEntity | CentroCatequese) => {
    setModalError(null);
    setModal({ type, item: { ...item } });
  };

  const closeModal = () => {
    setModal(null);
    setModalError(null);
  };

  const handleSave = async () => {
    if (!modal) return;
    const { type, item } = modal;
    setModalError(null);

    const lists: Record<SectionType, SimpleEntity[]> = {
      paroquia: paroquias, escola: escolas, catequista: catequistas, centro: centros
    };
    const labels: Record<SectionType, string> = {
      paroquia: 'da paróquia', escola: 'da escola', catequista: 'do catequista', centro: 'do centro'
    };
    const tables: Record<SectionType, string> = {
      paroquia: 'paroquias', escola: 'escolas', catequista: 'catequistas', centro: 'centros_catequese'
    };

    if (!item.nome.trim()) {
      setModalError(`O nome ${labels[type]} é obrigatório.`);
      return;
    }
    const isDuplicate = lists[type].some(
      (r) => r.nome.toLowerCase() === item.nome.trim().toLowerCase() && r.id !== item.id
    );
    if (isDuplicate) {
      setModalError(`Já existe um registo com esse nome.`);
      return;
    }

    const payload = type === 'centro'
      ? { nome: item.nome.trim(), paroquia_id: (item as CentroCatequese).paroquia_id }
      : { nome: item.nome.trim() };

    if (item.id) {
      await supabase.from(tables[type]).update(payload).eq('id', item.id);
    } else {
      await supabase.from(tables[type]).insert(payload);
    }

    closeModal();
    await loadAll();
  };

  const handleDelete = async () => {
    if (!confirm || !modal) return;
    const { type, item } = modal;
    const tables: Record<SectionType, string> = {
      paroquia: 'paroquias', escola: 'escolas', catequista: 'catequistas', centro: 'centros_catequese'
    };
    await supabase.from(tables[type]).delete().eq('id', item.id);
    setConfirm(null);
    closeModal();
    await loadAll();
  };

  const updateModalItem = (patch: Partial<SimpleEntity | CentroCatequese>) => {
    if (!modal) return;
    setModal({ ...modal, item: { ...modal.item, ...patch } });
  };

  const isNew = modal ? !modal.item.id : true;
  const modalTitles: Record<SectionType, string> = {
    paroquia: 'Paróquia', escola: 'Escola', catequista: 'Catequista', centro: 'Centro de Catequese'
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Definições</h1>
      </header>

      <section className="grid two">
        {/* ── Paróquias ── */}
        <div className="card">
          <CardHeader title="Paróquias" onNew={() => openNew('paroquia')} />
          <DataTable
            columns={[{ key: 'nome', header: 'Nome' }]}
            rows={paroquias}
            getRowId={(r) => r.id}
            selectedId={modal?.type === 'paroquia' ? modal.item.id : undefined}
            onRowClick={(r) => openEdit('paroquia', r)}
          />
        </div>

        {/* ── Escolas ── */}
        <div className="card">
          <CardHeader title="Escolas" onNew={() => openNew('escola')} />
          <DataTable
            columns={[{ key: 'nome', header: 'Nome' }]}
            rows={escolas}
            getRowId={(r) => r.id}
            selectedId={modal?.type === 'escola' ? modal.item.id : undefined}
            onRowClick={(r) => openEdit('escola', r)}
          />
        </div>

        {/* ── Catequistas ── */}
        <div className="card">
          <CardHeader title="Catequistas" onNew={() => openNew('catequista')} />
          <DataTable
            columns={[{ key: 'nome', header: 'Nome' }]}
            rows={catequistas}
            getRowId={(r) => r.id}
            selectedId={modal?.type === 'catequista' ? modal.item.id : undefined}
            onRowClick={(r) => openEdit('catequista', r)}
          />
        </div>

        {/* ── Centros de Catequese ── */}
        <div className="card">
          <CardHeader title="Centros de Catequese" onNew={() => openNew('centro')} />
          <DataTable
            columns={[
              { key: 'nome', header: 'Nome' },
              {
                key: 'paroquia_id',
                header: 'Paróquia',
                render: (r) => paroquias.find((p) => p.id === (r as CentroCatequese).paroquia_id)?.nome ?? '—'
              }
            ]}
            rows={centros}
            getRowId={(r) => r.id}
            selectedId={modal?.type === 'centro' ? modal.item.id : undefined}
            onRowClick={(r) => openEdit('centro', r)}
          />
        </div>
      </section>

      {/* ── Modal criar/editar ── */}
      {modal && (
        <EditModal
          title={modalTitles[modal.type]}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={!isNew ? () => setConfirm({ type: modal.type }) : undefined}
          isNew={isNew}
          error={modalError}
        >
          <FormField
            label="Nome"
            value={modal.item.nome}
            onChange={(v) => updateModalItem({ nome: v })}
          />
          {modal.type === 'centro' && (
            <SelectField
              label="Paróquia"
              value={(modal.item as CentroCatequese).paroquia_id ?? ''}
              onChange={(v) => updateModalItem({ paroquia_id: v || null })}
              options={paroquiaOptions}
              placeholder="Sem paróquia"
            />
          )}
        </EditModal>
      )}

      {/* ── Confirmação de eliminação ── */}
      <ConfirmDialog
        open={confirm !== null}
        title="Confirmar remoção"
        description="Tem a certeza que quer eliminar este registo? Esta ação é irreversível."
        onCancel={() => setConfirm(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
