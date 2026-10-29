import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { supabase } from '../lib/supabase';
import { Aluno } from '../lib/types';
import { 
  fetchAlunos, 
  fetchParoquias, 
  fetchEscolas, 
  fetchCatequistas, 
  fetchCentros, 
  saveAluno, 
  deleteAluno 
} from '../lib/api';

import FormField from '../components/FormField';
import SelectField from '../components/SelectField';
import CheckboxField from '../components/CheckboxField';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import ChipSelect from '../components/ChipSelect';
import { anoCatecismoOptions, anoMatriculaOptions, idade, iniciais, join } from '../lib/format';

// Esquema de validação com Zod
const alunoSchema = z.object({
  id: z.string().optional(),
  nr_matricula: z.number().optional(),
  ano_matricula: z.coerce.number().min(1900, 'Ano inválido'),
  paroquia_id: z.string().nullable(),
  escola_id: z.string().nullable(),
  centro_id: z.string().nullable(),
  catequista_id: z.string().nullable(),
  nome_aluno: z.string().min(1, 'O nome do aluno é obrigatório'),
  nome_pai: z.string().nullable(),
  nome_mae: z.string().nullable(),
  data_nascimento: z.string().nullable(),
  naturalidade: z.string().nullable(),
  batizado: z.boolean().default(false),
  data_batismo: z.string().nullable(),
  lugar_batismo: z.string().nullable(),
  encarregado_nome: z.string().nullable(),
  morada: z.string().nullable(),
  localidade: z.string().nullable(),
  codigo_postal: z.string().nullable(),
  telemovel: z.string().nullable(),
  email: z.string().email('Email inválido').or(z.literal('')).nullable(),
  ano_catecismo: z.coerce.number().nullable(),
  ano_escolar: z.coerce.number().nullable(),
});

type AlunoFormData = z.infer<typeof alunoSchema>;

const emptyAluno: AlunoFormData = {
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
  email: '',
  ano_catecismo: null,
  ano_escolar: null,
};

// ──────────────────────────────────────────────────────────────
// Modal do formulário do aluno
// ──────────────────────────────────────────────────────────────
interface AlunoModalProps {
  aluno: Aluno | null;
  onClose: () => void;
  onSave: (data: AlunoFormData) => void;
  onDelete: () => void;
  paroquiaOptions: { value: string; label: string }[];
  escolaOptions: { value: string; label: string }[];
  centroOptions: { value: string; label: string }[];
  catequistaOptions: { value: string; label: string }[];
  saving: boolean;
}

function AlunoModal({
  aluno, onClose, onSave, onDelete,
  paroquiaOptions, escolaOptions, centroOptions, catequistaOptions,
  saving,
}: AlunoModalProps) {
  const isNew = !aluno?.id;

  const { control, handleSubmit, watch, formState: { errors } } = useForm<AlunoFormData>({
    resolver: zodResolver(alunoSchema) as any,
    defaultValues: (aluno || emptyAluno) as AlunoFormData,
  });

  const isBatizado = watch('batizado');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <form 
        className="modal aluno-modal" 
        onMouseDown={(e) => e.stopPropagation()} 
        onSubmit={handleSubmit((data) => onSave(data as AlunoFormData))}
      >
        {/* Header */}
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
            {isNew ? 'Novo Aluno' : aluno?.nome_aluno || 'Editar Aluno'}
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
              <Controller
                name="nr_matricula"
                control={control}
                render={({ field }) => (
                  <FormField label="Nº matrícula" {...field} value={field.value || ''} disabled />
                )}
              />
              <Controller
                name="ano_matricula"
                control={control}
                render={({ field }) => (
                  <FormField 
                    label="Ano matrícula" 
                    {...field} 
                    type="number" 
                    required 
                    error={errors.ano_matricula?.message}
                  />
                )}
              />
            </div>

            <div className="grid two">
              <Controller
                name="paroquia_id"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label="Paróquia"
                    {...field}
                    value={field.value ?? ''}
                    options={paroquiaOptions}
                    placeholder="Selecionar"
                  />
                )}
              />
              <Controller
                name="escola_id"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label="Escola"
                    {...field}
                    value={field.value ?? ''}
                    options={escolaOptions}
                    placeholder="Selecionar"
                  />
                )}
              />
            </div>

            <div className="grid two">
              <Controller
                name="centro_id"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label="Centro"
                    {...field}
                    value={field.value ?? ''}
                    options={centroOptions}
                    placeholder="Selecionar"
                  />
                )}
              />
              <Controller
                name="catequista_id"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label="Catequista"
                    {...field}
                    value={field.value ?? ''}
                    options={catequistaOptions}
                    placeholder="Selecionar"
                  />
                )}
              />
            </div>

            {/* Dados pessoais */}
            <div className="section-title">Dados pessoais</div>
            <Controller
              name="nome_aluno"
              control={control}
              render={({ field }) => (
                <FormField 
                  label="Nome do aluno" 
                  {...field} 
                  required 
                  error={errors.nome_aluno?.message}
                />
              )}
            />

            <div className="grid two">
              <Controller
                name="nome_pai"
                control={control}
                render={({ field }) => (
                  <FormField label="Nome do pai" {...field} value={field.value ?? ''} />
                )}
              />
              <Controller
                name="nome_mae"
                control={control}
                render={({ field }) => (
                  <FormField label="Nome da mãe" {...field} value={field.value ?? ''} />
                )}
              />
            </div>

            <div className="grid two">
              <Controller
                name="data_nascimento"
                control={control}
                render={({ field }) => (
                  <FormField label="Data nascimento" {...field} value={field.value ?? ''} type="date" />
                )}
              />
              <Controller
                name="naturalidade"
                control={control}
                render={({ field }) => (
                  <FormField label="Naturalidade" {...field} value={field.value ?? ''} />
                )}
              />
            </div>

            <Controller
              name="batizado"
              control={control}
              render={({ field }) => (
                <CheckboxField
                  label="Batizado(a)"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            {isBatizado && (
              <div className="grid two">
                <Controller
                  name="data_batismo"
                  control={control}
                  render={({ field }) => (
                    <FormField label="Data batismo" {...field} value={field.value ?? ''} type="date" />
                  )}
                />
                <Controller
                  name="lugar_batismo"
                  control={control}
                  render={({ field }) => (
                    <FormField label="Lugar batismo" {...field} value={field.value ?? ''} />
                  )}
                />
              </div>
            )}

            {/* Contactos */}
            <div className="section-title">Contactos</div>
            <Controller
              name="encarregado_nome"
              control={control}
              render={({ field }) => (
                <FormField label="Encarregado" {...field} value={field.value ?? ''} />
              )}
            />
            <Controller
              name="morada"
              control={control}
              render={({ field }) => (
                <FormField label="Morada" {...field} value={field.value ?? ''} />
              )}
            />
            <div className="grid two">
              <Controller
                name="localidade"
                control={control}
                render={({ field }) => (
                  <FormField label="Localidade" {...field} value={field.value ?? ''} />
                )}
              />
              <Controller
                name="codigo_postal"
                control={control}
                render={({ field }) => (
                  <FormField label="Código postal" {...field} value={field.value ?? ''} />
                )}
              />
            </div>
            <div className="grid two">
              <Controller
                name="telemovel"
                control={control}
                render={({ field }) => (
                  <FormField label="Telemóvel" {...field} value={field.value ?? ''} />
                )}
              />
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <FormField 
                    label="Email" 
                    {...field} 
                    value={field.value ?? ''} 
                    error={errors.email?.message}
                  />
                )}
              />
            </div>

            {/* Catequese */}
            <div className="section-title">Catequese</div>
            <div className="grid two">
              <Controller
                name="ano_catecismo"
                control={control}
                render={({ field }) => (
                  <FormField label="Ano catecismo" {...field} value={field.value ?? ''} type="number" />
                )}
              />
              <Controller
                name="ano_escolar"
                control={control}
                render={({ field }) => (
                  <FormField label="Ano escolar" {...field} value={field.value ?? ''} type="number" />
                )}
              />
            </div>
          </div>
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
          <button type="submit" className="button" disabled={saving}>
            {saving ? 'A guardar…' : isNew ? 'Criar' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────────────────────────
export default function Alunos() {
  const queryClient = useQueryClient();
  const [filterAno, setFilterAno] = useState('');
  const [filterAnoCatecismo, setFilterAnoCatecismo] = useState('');
  const [filterCatequista, setFilterCatequista] = useState('');
  const [filterCentro, setFilterCentro] = useState('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const [modalAluno, setModalAluno] = useState<Aluno | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Só pesquisa quando se pára de escrever, em vez de a cada tecla.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchDebounced(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Queries
  const { data: paroquias = [] } = useQuery({ queryKey: ['paroquias'], queryFn: fetchParoquias });
  const { data: escolas = [] } = useQuery({ queryKey: ['escolas'], queryFn: fetchEscolas });
  const { data: catequistas = [] } = useQuery({ queryKey: ['catequistas'], queryFn: fetchCatequistas });
  const { data: centros = [] } = useQuery({ queryKey: ['centros'], queryFn: fetchCentros });

  const { data: alunos = [], isLoading: loadingAlunos } = useQuery({
    queryKey: ['alunos', { filterAno, filterAnoCatecismo, filterCatequista, filterCentro, searchDebounced }],
    queryFn: () => fetchAlunos({
      ano_matricula: filterAno ? Number(filterAno) : undefined,
      ano_catecismo: filterAnoCatecismo ? Number(filterAnoCatecismo) : undefined,
      catequista_id: filterCatequista || undefined,
      centro_id: filterCentro || undefined,
      search: searchDebounced
    }),
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: saveAluno,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alunos'] });
      setModalAluno(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAluno,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alunos'] });
      setConfirmDelete(false);
      setModalAluno(null);
    },
  });

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('alunos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alunos' }, () => {
        queryClient.invalidateQueries({ queryKey: ['alunos'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const openNew = () => setModalAluno({} as Aluno);
  const openEdit = (aluno: Aluno) => setModalAluno(aluno);
  const closeModal = () => setModalAluno(null);

  const catequistaOptions = useMemo(() => catequistas.map((i) => ({ value: i.id, label: i.nome })), [catequistas]);
  const centroOptions = useMemo(() => centros.map((i) => ({ value: i.id, label: i.nome })), [centros]);
  const paroquiaOptions = useMemo(() => paroquias.map((i) => ({ value: i.id, label: i.nome })), [paroquias]);
  const escolaOptions = useMemo(() => escolas.map((i) => ({ value: i.id, label: i.nome })), [escolas]);

  const temFiltros = Boolean(filterAno || filterAnoCatecismo || filterCatequista || filterCentro || search);
  const limparFiltros = () => {
    setFilterAno('');
    setFilterAnoCatecismo('');
    setFilterCatequista('');
    setFilterCentro('');
    setSearch('');
    searchRef.current?.focus();
  };

  const nomeCatequista = (id: string | null) => catequistas.find((i) => i.id === id)?.nome;
  const nomeCentro = (id: string | null) => centros.find((i) => i.id === id)?.nome;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Matrículas / Alunos</h1>
          <p className="page-subtitle">Procura um aluno para abrir a ficha, ou cria uma inscrição nova.</p>
        </div>
        <button className="button" type="button" onClick={openNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo aluno
        </button>
      </header>

      {/* Pesquisa e filtros */}
      <section className="search-panel">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar por nome do aluno, dos pais, do encarregado ou telemóvel…"
            autoFocus
          />
          {search && (
            <button type="button" className="search-clear" onClick={() => setSearch('')} aria-label="Limpar pesquisa">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <div className="chips chips--lg">
          <ChipSelect label="Ano" value={filterAno} onChange={setFilterAno} options={anoMatriculaOptions} />
          <ChipSelect label="Catecismo" value={filterAnoCatecismo} onChange={setFilterAnoCatecismo} options={anoCatecismoOptions} />
          <ChipSelect label="Catequista" value={filterCatequista} onChange={setFilterCatequista} options={catequistaOptions} />
          <ChipSelect label="Centro" value={filterCentro} onChange={setFilterCentro} options={centroOptions} />
        </div>
      </section>

      {/* Lista */}
      <section className="card card--flush">
        <div className="card-toolbar">
          <span className="defn-card-title">
            {loadingAlunos ? 'A carregar…' : `${alunos.length} aluno${alunos.length !== 1 ? 's' : ''}`}
          </span>
          {temFiltros && (
            <button type="button" className="chip-clear" onClick={limparFiltros}>
              Limpar filtros
            </button>
          )}
        </div>
        <DataTable
          columns={[
            {
              key: 'nr_matricula',
              header: 'Nº',
              render: (row) => <span className="cell-num">{row.nr_matricula}</span>,
            },
            {
              key: 'nome_aluno',
              header: 'Aluno',
              render: (row) => {
                const anos = idade(row.data_nascimento);
                return (
                  <div className="aluno-cell">
                    <span className="avatar">{iniciais(row.nome_aluno)}</span>
                    <div>
                      <div className="aluno-nome">
                        {row.nome_aluno}
                        {!row.batizado && <span className="tag tag--warning">Por batizar</span>}
                      </div>
                      <div className="cell-sub">{join([anos !== null ? `${anos} anos` : null, row.naturalidade])}</div>
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'ano_catecismo',
              header: 'Catecismo',
              render: (row) => (
                <>
                  {row.ano_catecismo ? <span className="tag tag--brand">{row.ano_catecismo}º ano</span> : <span className="cell-empty">—</span>}
                  <div className="cell-sub">Matrícula {row.ano_matricula}</div>
                </>
              ),
            },
            {
              key: 'catequista_id',
              header: 'Catequista',
              render: (row) => (
                <>
                  {nomeCatequista(row.catequista_id) ?? <span className="cell-empty">Sem catequista</span>}
                  <div className="cell-sub">{nomeCentro(row.centro_id)}</div>
                </>
              ),
            },
            {
              key: 'telemovel',
              header: 'Contacto',
              render: (row) => (
                <>
                  {row.telemovel || row.email || <span className="cell-empty">Sem contacto</span>}
                  <div className="cell-sub">{row.encarregado_nome}</div>
                </>
              ),
            },
          ]}
          rows={alunos}
          getRowId={(row) => row.id}
          selectedId={modalAluno?.id}
          onRowClick={openEdit}
          loading={loadingAlunos}
          emptyMessage={temFiltros
            ? 'Nenhum aluno encontrado com esta pesquisa.'
            : 'Ainda não há alunos. Carrega em "Novo aluno" para criar o primeiro.'}
        />
      </section>

      {/* Modal do aluno */}
      {modalAluno && (
        <AlunoModal
          aluno={modalAluno.id ? modalAluno : null}
          onClose={closeModal}
          onSave={(data) => saveMutation.mutate(data)}
          onDelete={() => setConfirmDelete(true)}
          paroquiaOptions={paroquiaOptions}
          escolaOptions={escolaOptions}
          centroOptions={centroOptions}
          catequistaOptions={catequistaOptions}
          saving={saveMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Confirmar remoção"
        description="Tem a certeza que quer eliminar este aluno? Esta ação é irreversível."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => modalAluno?.id && deleteMutation.mutate(modalAluno.id)}
      />
    </div>
  );
}
