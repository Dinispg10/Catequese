import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Aluno, SimpleEntity } from '../lib/types';
import FormField from '../components/FormField';
import SelectField from '../components/SelectField';
import CheckboxField from '../components/CheckboxField';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';

const emptyAluno: Aluno = {
  id: '',
  nr_matricula: 0,
  ano_matricula: new Date().getFullYear(),
  paroquia_id: null,
  escola_id: null,
  centro_id: null,
  catequista_id: null,
  nome_aluno: '',
  nome_pai: null,
  nome_mae: null,
  data_nascimento: null,
  naturalidade: null,
  batizado: false,
  data_batismo: null,
  lugar_batismo: null,
  encarregado_nome: null,
  morada: null,
  localidade: null,
  codigo_postal: null,
  telemovel: null,
  email: null,
  ano_catecismo: null,
  ano_escolar: null,
};

// ──────────────────────────────────────────────────────────────
// Modal do formulário do aluno
// ──────────────────────────────────────────────────────────────
interface AlunoModalProps {
  aluno: Aluno;
  onChange: (patch: Partial<Aluno>) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  paroquiaOptions: { value: string; label: string }[];
  escolaOptions: { value: string; label: string }[];
  centroOptions: { value: string; label: string }[];
  catequistaOptions: { value: string; label: string }[];
  error: string | null;
  saving: boolean;
}

function AlunoModal({
  aluno, onChange, onClose, onSave, onDelete,
  paroquiaOptions, escolaOptions, centroOptions, catequistaOptions,
  error, saving,
}: AlunoModalProps) {
  const isNew = !aluno.id;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal aluno-modal" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
            {isNew ? 'Novo Aluno' : aluno.nome_aluno || 'Editar Aluno'}
            {!isNew && <span className="edit-modal-badge">Editar</span>}
          </h3>
          <button className="modal-close-btn" onClick={onClose} type="button" aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body com scroll */}
        <div className="modal-body aluno-modal-body">
          <div className="form">

            {/* Matrícula */}
            <div className="section-title">Matrícula</div>
            <div className="grid two">
              <FormField
                label="Nº matrícula"
                value={aluno.nr_matricula || ''}
                onChange={() => undefined}
                disabled
              />
              <FormField
                label="Ano matrícula"
                value={aluno.ano_matricula || ''}
                onChange={(v) => onChange({ ano_matricula: Number(v) })}
                type="number"
                required
              />
            </div>
            <div className="grid two">
              <SelectField
                label="Paróquia"
                value={aluno.paroquia_id ?? ''}
                onChange={(v) => onChange({ paroquia_id: v || null })}
                options={paroquiaOptions}
                placeholder="Selecionar"
              />
              <SelectField
                label="Escola"
                value={aluno.escola_id ?? ''}
                onChange={(v) => onChange({ escola_id: v || null })}
                options={escolaOptions}
                placeholder="Selecionar"
              />
            </div>
            <div className="grid two">
              <SelectField
                label="Centro"
                value={aluno.centro_id ?? ''}
                onChange={(v) => onChange({ centro_id: v || null })}
                options={centroOptions}
                placeholder="Selecionar"
              />
              <SelectField
                label="Catequista"
                value={aluno.catequista_id ?? ''}
                onChange={(v) => onChange({ catequista_id: v || null })}
                options={catequistaOptions}
                placeholder="Selecionar"
              />
            </div>

            {/* Dados pessoais */}
            <div className="section-title">Dados pessoais</div>
            <FormField
              label="Nome do aluno"
              value={aluno.nome_aluno}
              onChange={(v) => onChange({ nome_aluno: v })}
              required
            />
            <div className="grid two">
              <FormField label="Nome do pai" value={aluno.nome_pai ?? ''} onChange={(v) => onChange({ nome_pai: v })} />
              <FormField label="Nome da mãe" value={aluno.nome_mae ?? ''} onChange={(v) => onChange({ nome_mae: v })} />
            </div>
            <div className="grid two">
              <FormField label="Data nascimento" value={aluno.data_nascimento ?? ''} onChange={(v) => onChange({ data_nascimento: v })} type="date" />
              <FormField label="Naturalidade" value={aluno.naturalidade ?? ''} onChange={(v) => onChange({ naturalidade: v })} />
            </div>

            <CheckboxField
              label="Batizado(a)"
              checked={aluno.batizado}
              onChange={(v) => onChange({ batizado: v })}
            />
            {aluno.batizado && (
              <div className="grid two">
                <FormField label="Data batismo" value={aluno.data_batismo ?? ''} onChange={(v) => onChange({ data_batismo: v })} type="date" />
                <FormField label="Lugar batismo" value={aluno.lugar_batismo ?? ''} onChange={(v) => onChange({ lugar_batismo: v })} />
              </div>
            )}

            {/* Contactos */}
            <div className="section-title">Contactos</div>
            <FormField label="Encarregado" value={aluno.encarregado_nome ?? ''} onChange={(v) => onChange({ encarregado_nome: v })} />
            <FormField label="Morada" value={aluno.morada ?? ''} onChange={(v) => onChange({ morada: v })} />
            <div className="grid two">
              <FormField label="Localidade" value={aluno.localidade ?? ''} onChange={(v) => onChange({ localidade: v })} />
              <FormField label="Código postal" value={aluno.codigo_postal ?? ''} onChange={(v) => onChange({ codigo_postal: v })} />
            </div>
            <div className="grid two">
              <FormField label="Telemóvel" value={aluno.telemovel ?? ''} onChange={(v) => onChange({ telemovel: v })} />
              <FormField label="Email" value={aluno.email ?? ''} onChange={(v) => onChange({ email: v })} />
            </div>

            {/* Catequese */}
            <div className="section-title">Catequese</div>
            <div className="grid two">
              <FormField label="Ano catecismo" value={aluno.ano_catecismo ?? ''} onChange={(v) => onChange({ ano_catecismo: v ? Number(v) : null })} type="number" />
              <FormField label="Ano escolar" value={aluno.ano_escolar ?? ''} onChange={(v) => onChange({ ano_escolar: v ? Number(v) : null })} type="number" />
            </div>

          </div>

          {error && <div className="alert" style={{ marginTop: 12 }}>{error}</div>}
        </div>

        {/* Ações */}
        <div className="modal-actions">
          {!isNew && (
            <button type="button" className="button danger" onClick={onDelete}>
              Eliminar
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="button" onClick={onSave} disabled={saving}>
            {saving ? 'A guardar…' : isNew ? 'Criar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────────────────────────
export default function Alunos() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [paroquias, setParoquias] = useState<SimpleEntity[]>([]);
  const [escolas, setEscolas] = useState<SimpleEntity[]>([]);
  const [catequistas, setCatequistas] = useState<SimpleEntity[]>([]);
  const [centros, setCentros] = useState<SimpleEntity[]>([]);

  const [filterAno, setFilterAno] = useState('');
  const [filterCatequista, setFilterCatequista] = useState('');
  const [filterCentro, setFilterCentro] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [modalAluno, setModalAluno] = useState<Aluno | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refreshTimeout = useRef<number | null>(null);

  const loadReference = async () => {
    const [
      { data: paroquiasData },
      { data: escolasData },
      { data: catequistasData },
      { data: centrosData },
    ] = await Promise.all([
      supabase.from('paroquias').select('*').order('nome'),
      supabase.from('escolas').select('*').order('nome'),
      supabase.from('catequistas').select('*').order('nome'),
      supabase.from('centros_catequese').select('*').order('nome'),
    ]);
    setParoquias(paroquiasData ?? []);
    setEscolas(escolasData ?? []);
    setCatequistas(catequistasData ?? []);
    setCentros(centrosData ?? []);
  };

  const loadAlunos = async () => {
    setLoading(true);
    let query = supabase.from('alunos').select('*').order('nr_matricula').order('nome_aluno');
    if (filterAno) query = query.eq('ano_matricula', Number(filterAno));
    if (filterCatequista) query = query.eq('catequista_id', filterCatequista);
    if (filterCentro) query = query.eq('centro_id', filterCentro);
    if (search.trim()) query = query.ilike('nome_aluno', `%${search.trim()}%`);
    const { data } = await query;
    setAlunos(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadReference(); }, []);
  useEffect(() => { loadAlunos(); }, [filterAno, filterCatequista, filterCentro, search]);

  useEffect(() => {
    const channel = supabase
      .channel('alunos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alunos' }, () => {
        if (refreshTimeout.current) window.clearTimeout(refreshTimeout.current);
        refreshTimeout.current = window.setTimeout(() => loadAlunos(), 300);
      })
      .subscribe();
    return () => {
      if (refreshTimeout.current) window.clearTimeout(refreshTimeout.current);
      supabase.removeChannel(channel);
    };
  }, [filterAno, filterCatequista, filterCentro, search]);

  const openNew = () => { setModalError(null); setModalAluno({ ...emptyAluno }); };
  const openEdit = (aluno: Aluno) => { setModalError(null); setModalAluno({ ...aluno }); };
  const closeModal = () => { setModalAluno(null); setModalError(null); };

  const handleSave = async () => {
    if (!modalAluno) return;
    setModalError(null);

    if (!modalAluno.nome_aluno.trim()) { setModalError('O nome do aluno é obrigatório.'); return; }
    if (!modalAluno.ano_matricula) { setModalError('O ano de matrícula é obrigatório.'); return; }

    setSaving(true);
    const payload = {
      ano_matricula: Number(modalAluno.ano_matricula),
      paroquia_id: modalAluno.paroquia_id,
      escola_id: modalAluno.escola_id,
      centro_id: modalAluno.centro_id,
      catequista_id: modalAluno.catequista_id,
      nome_aluno: modalAluno.nome_aluno,
      nome_pai: modalAluno.nome_pai,
      nome_mae: modalAluno.nome_mae,
      data_nascimento: modalAluno.data_nascimento,
      naturalidade: modalAluno.naturalidade,
      batizado: modalAluno.batizado,
      data_batismo: modalAluno.batizado ? modalAluno.data_batismo : null,
      lugar_batismo: modalAluno.batizado ? modalAluno.lugar_batismo : null,
      encarregado_nome: modalAluno.encarregado_nome,
      morada: modalAluno.morada,
      localidade: modalAluno.localidade,
      codigo_postal: modalAluno.codigo_postal,
      telemovel: modalAluno.telemovel,
      email: modalAluno.email,
      ano_catecismo: modalAluno.ano_catecismo ? Number(modalAluno.ano_catecismo) : null,
      ano_escolar: modalAluno.ano_escolar ? Number(modalAluno.ano_escolar) : null,
    };

    if (modalAluno.id) {
      await supabase.from('alunos').update(payload).eq('id', modalAluno.id);
    } else {
      await supabase.from('alunos').insert(payload);
    }

    setSaving(false);
    closeModal();
    await loadAlunos();
  };

  const handleDelete = async () => {
    if (!modalAluno?.id) return;
    await supabase.from('alunos').delete().eq('id', modalAluno.id);
    setConfirmDelete(false);
    closeModal();
    await loadAlunos();
  };

  const catequistaOptions = useMemo(() => catequistas.map((i) => ({ value: i.id, label: i.nome })), [catequistas]);
  const centroOptions = useMemo(() => centros.map((i) => ({ value: i.id, label: i.nome })), [centros]);
  const paroquiaOptions = useMemo(() => paroquias.map((i) => ({ value: i.id, label: i.nome })), [paroquias]);
  const escolaOptions = useMemo(() => escolas.map((i) => ({ value: i.id, label: i.nome })), [escolas]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Matrículas / Alunos</h1>
        <button className="button" type="button" onClick={openNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo aluno
        </button>
      </header>

      {/* Filtros */}
      <section className="card">
        <div className="defn-card-header" style={{ marginBottom: 0 }}>
          <span className="defn-card-title">Filtros</span>
        </div>
        <div className="filters" style={{ marginTop: 12 }}>
          <FormField label="Ano matrícula" value={filterAno} onChange={setFilterAno} type="number" />
          <SelectField label="Catequista" value={filterCatequista} onChange={setFilterCatequista} options={catequistaOptions} placeholder="Todos" />
          <SelectField label="Centro" value={filterCentro} onChange={setFilterCentro} options={centroOptions} placeholder="Todos" />
          <FormField label="Pesquisar" value={search} onChange={setSearch} placeholder="Nome do aluno" />
        </div>
      </section>

      {/* Lista */}
      <section className="card">
        <div className="defn-card-header">
          <span className="defn-card-title">
            {loading ? 'A carregar…' : `${alunos.length} aluno${alunos.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <DataTable
          columns={[
            { key: 'nr_matricula', header: 'Nº' },
            { key: 'nome_aluno', header: 'Nome' },
            { key: 'ano_matricula', header: 'Ano' },
            {
              key: 'catequista_id',
              header: 'Catequista',
              render: (row) => catequistas.find((i) => i.id === row.catequista_id)?.nome ?? '—',
            },
            {
              key: 'centro_id',
              header: 'Centro',
              render: (row) => centros.find((i) => i.id === row.centro_id)?.nome ?? '—',
            },
          ]}
          rows={alunos}
          getRowId={(row) => row.id}
          selectedId={modalAluno?.id}
          onRowClick={openEdit}
          loading={loading}
          emptyMessage="Nenhum aluno encontrado. Muda os filtros ou cria um novo aluno."
        />
      </section>

      {/* Modal do aluno */}
      {modalAluno && (
        <AlunoModal
          aluno={modalAluno}
          onChange={(patch) => setModalAluno((prev) => prev ? { ...prev, ...patch } : prev)}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={() => setConfirmDelete(true)}
          paroquiaOptions={paroquiaOptions}
          escolaOptions={escolaOptions}
          centroOptions={centroOptions}
          catequistaOptions={catequistaOptions}
          error={modalError}
          saving={saving}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Confirmar remoção"
        description="Tem a certeza que quer eliminar este aluno? Esta ação é irreversível."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
