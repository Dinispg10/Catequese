import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { SimpleEntity } from '../lib/types';
import {
  fetchCatequistas,
  fetchCentros,
  fetchContagemPorAno,
  fetchEscolas,
  fetchParoquias,
  lerTodosAlunos,
  setAnoAtivo,
  setAtivo
} from '../lib/api';
import { useAnoAtivo } from '../lib/anoAtivo';
import { estaAtivo, iniciais, join, opcoesAtivas } from '../lib/format';
import FormField from '../components/FormField';
import SelectField from '../components/SelectField';
import ConfirmDialog from '../components/ConfirmDialog';

interface CentroCatequese extends SimpleEntity {
  paroquia_id: string | null;
}

type SectionType = 'catequista' | 'centro' | 'paroquia' | 'escola';

interface Secao {
  key: SectionType;
  titulo: string;
  singular: string;
  descricao: string;
  tabela: string;
  queryKey: string;
  icon: ReactNode;
}

const secoes: Secao[] = [
  {
    key: 'catequista',
    titulo: 'Catequistas',
    singular: 'Catequista',
    descricao: 'Quem dá a catequese. Aparece nas fichas, nas presenças e nas listagens.',
    tabela: 'catequistas',
    queryKey: 'catequistas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    )
  },
  {
    key: 'centro',
    titulo: 'Centros de catequese',
    singular: 'Centro de catequese',
    descricao: 'Os locais onde a catequese acontece, cada um ligado a uma paróquia.',
    tabela: 'centros_catequese',
    queryKey: 'centros',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    )
  },
  {
    key: 'paroquia',
    titulo: 'Paróquias',
    singular: 'Paróquia',
    descricao: 'As paróquias a que pertencem os alunos e os centros.',
    tabela: 'paroquias',
    queryKey: 'paroquias',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M11 2h2v5h5v2h-5v13h-2v-13h-5v-2h5z" />
      </svg>
    )
  },
  {
    key: 'escola',
    titulo: 'Escolas',
    singular: 'Escola',
    descricao: 'As escolas que os alunos frequentam.',
    tabela: 'escolas',
    queryKey: 'escolas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    )
  }
];

type Uso = { catequista_id: string | null; escola_id: string | null; centro_id: string | null; paroquia_id: string | null };

/** Só as colunas que dizem onde cada aluno está ligado, para contar os usos (todos os anos). */
const fetchUsos = () => lerTodosAlunos<Uso>('catequista_id,escola_id,centro_id,paroquia_id');

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

// ──────────────────────────────────────────────────────────────
// Modal de edição/criação genérico
// ──────────────────────────────────────────────────────────────
interface EditModalProps {
  title: string;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  deleteBloqueado?: string | null;
  /** Desativar / voltar a ativar (só em registos que já existem). */
  ativo?: boolean;
  onToggleAtivo?: () => void;
  isNew: boolean;
  saving: boolean;
  children: ReactNode;
  error?: string | null;
}

function EditModal({
  title, onClose, onSave, onDelete, deleteBloqueado, ativo, onToggleAtivo, isNew, saving, children, error
}: EditModalProps) {
  // Fechar com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      {/* Um formulário, para o Enter guardar. */}
      <form
        className="modal edit-modal"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, letterSpacing: '-0.01em' }}>{isNew ? `Novo: ${title}` : title}</span>
            {!isNew && <span className="edit-modal-badge">{ativo === false ? 'Já não ativo' : 'Editar'}</span>}
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
          {!isNew && deleteBloqueado && <p className="modal-hint">{deleteBloqueado}</p>}
        </div>

        <div className="modal-actions">
          {!isNew && onDelete && (
            <button type="button" className="button danger" onClick={onDelete} disabled={Boolean(deleteBloqueado)}>
              Eliminar
            </button>
          )}
          {!isNew && onToggleAtivo && (
            <button type="button" className="button secondary" onClick={onToggleAtivo}>
              {ativo === false ? 'Voltar a ativar' : 'Desativar'}
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
// Ano catequético
// ──────────────────────────────────────────────────────────────
function CartaoAno() {
  const queryClient = useQueryClient();
  const { anoAtivo } = useAnoAtivo();
  const { data: contagem = [] } = useQuery({ queryKey: ['alunos', 'contagem-por-ano'], queryFn: fetchContagemPorAno });
  const [confirmar, setConfirmar] = useState<'avancar' | 'recuar' | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (anoAtivo === undefined) return null;

  const totalAtivo = contagem.find((c) => c.ano === anoAtivo)?.total ?? 0;
  const novoAno = confirmar === 'recuar' ? anoAtivo - 1 : anoAtivo + 1;

  const mudarAno = async () => {
    setAGuardar(true);
    setErro(null);
    try {
      await setAnoAtivo(novoAno);
      queryClient.invalidateQueries({ queryKey: ['configuracao'] });
      queryClient.invalidateQueries({ queryKey: ['alunos'] });
    } catch (e) {
      setErro(`Não foi possível mudar o ano: ${(e as Error).message}`);
    }
    setAGuardar(false);
    setConfirmar(null);
  };

  return (
    <section className="card ano-card">
      <div className="ano-card-info">
        <span className="docs-panel-title">Ano catequético</span>
        <div className="ano-card-ano">{anoAtivo}</div>
        <p className="entity-desc">
          {plural(totalAtivo, 'matrícula', 'matrículas')} neste ano. As Matrículas e as Presenças mostram só este ano.
        </p>
        {erro && <div className="alert" style={{ marginTop: 10 }}>{erro}</div>}
      </div>
      <div className="ano-card-actions">
        <button type="button" className="button" onClick={() => setConfirmar('avancar')}>
          Começar o ano {anoAtivo + 1}
        </button>
        <button type="button" className="chip-clear" onClick={() => setConfirmar('recuar')}>
          Voltar a {anoAtivo - 1}
        </button>
      </div>

      <ConfirmDialog
        open={confirmar !== null}
        title={confirmar === 'recuar' ? `Voltar ao ano ${novoAno}?` : `Começar o ano ${novoAno}?`}
        description={
          confirmar === 'recuar' ? (
            <p>
              O ano ativo volta a ser {novoAno}. As matrículas de {anoAtivo} não se perdem: voltam a aparecer quando
              se avançar outra vez para {anoAtivo}.
            </p>
          ) : (
            <>
              <p>Em todos os computadores:</p>
              <ul className="confirm-list">
                <li>as Matrículas e as Presenças passam a mostrar {novoAno}, e começam vazias;</li>
                <li>as {plural(totalAtivo, 'matrícula', 'matrículas')} de {anoAtivo} passam para "Anos anteriores", onde se renovam os alunos que continuam;</li>
                <li>não se apaga nada.</li>
              </ul>
            </>
          )
        }
        confirmLabel={confirmar === 'recuar' ? `Voltar a ${novoAno}` : `Começar ${novoAno}`}
        danger={false}
        busy={aGuardar}
        onCancel={() => setConfirmar(null)}
        onConfirm={mudarAno}
      />
    </section>
  );
}

// ──────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────
export default function Definicoes() {
  const queryClient = useQueryClient();
  const [secaoAtiva, setSecaoAtiva] = useState<SectionType>('catequista');
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState<{ type: SectionType; item: CentroCatequese } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: catequistas = [] } = useQuery({ queryKey: ['catequistas'], queryFn: fetchCatequistas });
  const { data: centros = [] } = useQuery({ queryKey: ['centros'], queryFn: fetchCentros });
  const { data: paroquias = [] } = useQuery({ queryKey: ['paroquias'], queryFn: fetchParoquias });
  const { data: escolas = [] } = useQuery({ queryKey: ['escolas'], queryFn: fetchEscolas });
  const { data: usos = [] } = useQuery({ queryKey: ['alunos', 'usos'], queryFn: fetchUsos });

  const listas: Record<SectionType, CentroCatequese[]> = {
    catequista: catequistas,
    centro: centros,
    paroquia: paroquias,
    escola: escolas
  };

  const paroquiaOptions = useMemo(
    () => opcoesAtivas(paroquias, modal?.item.paroquia_id),
    [paroquias, modal?.item.paroquia_id]
  );

  // Quantos alunos (de todos os anos) e centros, no caso das paróquias, usam cada registo.
  const contarAlunos = (type: SectionType, id: string) => {
    const coluna = ({ catequista: 'catequista_id', centro: 'centro_id', paroquia: 'paroquia_id', escola: 'escola_id' } as const)[type];
    return usos.filter((u) => u[coluna] === id).length;
  };
  const contarCentros = (paroquiaId: string) => centros.filter((c) => c.paroquia_id === paroquiaId).length;

  const descreverUso = (type: SectionType, item: CentroCatequese) => {
    const alunos = plural(contarAlunos(type, item.id), 'aluno', 'alunos');
    if (type === 'centro') return join([paroquias.find((p) => p.id === item.paroquia_id)?.nome ?? 'Sem paróquia', alunos]);
    if (type === 'paroquia') return join([plural(contarCentros(item.id), 'centro', 'centros'), alunos]);
    return alunos;
  };

  // A base de dados não deixa apagar o que ainda está ligado a alunos ou centros.
  const motivoBloqueio = (type: SectionType, item: CentroCatequese) => {
    const alunos = contarAlunos(type, item.id);
    const centrosLigados = type === 'paroquia' ? contarCentros(item.id) : 0;
    if (!alunos && !centrosLigados) return null;
    const ligados = join([alunos ? plural(alunos, 'aluno', 'alunos') : null, centrosLigados ? plural(centrosLigados, 'centro', 'centros') : null], ' e ');
    return `Não dá para eliminar: tem ${ligados} associados (contando os anos anteriores). Usa "Desativar": deixa de aparecer no ano ativo, mas os anos anteriores ficam como estão.`;
  };

  const secao = secoes.find((s) => s.key === secaoAtiva)!;
  const termo = search.trim().toLowerCase();
  const encontrados = listas[secaoAtiva].filter((item) => !termo || item.nome.toLowerCase().includes(termo));
  const ativos = encontrados.filter(estaAtivo);
  const inativos = encontrados.filter((item) => !estaAtivo(item));

  const escolherSecao = (key: SectionType) => {
    setSecaoAtiva(key);
    setSearch('');
  };

  const openNew = () => {
    setModalError(null);
    setModal({ type: secaoAtiva, item: { id: '', nome: '', paroquia_id: null } });
  };

  const openEdit = (item: CentroCatequese) => {
    setModalError(null);
    setModal({ type: secaoAtiva, item: { ...item, paroquia_id: item.paroquia_id ?? null } });
  };

  const closeModal = () => {
    setModal(null);
    setModalError(null);
  };

  const recarregar = (type: SectionType) => {
    const alvo = secoes.find((s) => s.key === type)!;
    queryClient.invalidateQueries({ queryKey: [alvo.queryKey] });
    queryClient.invalidateQueries({ queryKey: ['alunos'] });
  };

  const handleSave = async () => {
    if (!modal) return;
    const { type, item } = modal;
    const alvo = secoes.find((s) => s.key === type)!;
    setModalError(null);

    const nome = item.nome.trim();
    if (!nome) {
      setModalError('O nome é obrigatório.');
      return;
    }
    const isDuplicate = listas[type].some((r) => r.nome.toLowerCase() === nome.toLowerCase() && r.id !== item.id);
    if (isDuplicate) {
      setModalError('Já existe um registo com esse nome (pode estar em "Já não ativos").');
      return;
    }

    const payload = type === 'centro' ? { nome, paroquia_id: item.paroquia_id } : { nome };

    setSaving(true);
    const { error } = item.id
      ? await supabase.from(alvo.tabela).update(payload).eq('id', item.id)
      : await supabase.from(alvo.tabela).insert(payload);
    setSaving(false);

    if (error) {
      setModalError(`Não foi possível guardar: ${error.message}`);
      return;
    }
    closeModal();
    recarregar(type);
  };

  const handleToggleAtivo = async () => {
    if (!modal) return;
    const { type, item } = modal;
    try {
      await setAtivo(type, item.id, !estaAtivo(item));
      closeModal();
      recarregar(type);
    } catch (e) {
      setModalError(`Não foi possível mudar: ${(e as Error).message}`);
    }
  };

  const handleDelete = async () => {
    if (!modal) return;
    const { type, item } = modal;
    const alvo = secoes.find((s) => s.key === type)!;
    const { error } = await supabase.from(alvo.tabela).delete().eq('id', item.id);
    setConfirmOpen(false);
    if (error) {
      setModalError(`Não foi possível eliminar: ${error.message}`);
      return;
    }
    closeModal();
    recarregar(type);
  };

  const updateModalItem = (patch: Partial<CentroCatequese>) => {
    if (!modal) return;
    setModal({ ...modal, item: { ...modal.item, ...patch } });
  };

  const isNew = modal ? !modal.item.id : true;
  const secaoModal = modal ? secoes.find((s) => s.key === modal.type)! : null;

  const linha = (item: CentroCatequese) => (
    <li key={item.id}>
      <button
        type="button"
        className={`entity-row${modal?.item.id === item.id ? ' entity-row--selected' : ''}${estaAtivo(item) ? '' : ' entity-row--inativo'}`}
        onClick={() => openEdit(item)}
      >
        <span className="avatar">{iniciais(item.nome)}</span>
        <span className="entity-text">
          <span className="entity-name">{item.nome}</span>
          <span className="cell-sub">{descreverUso(secaoAtiva, item)}</span>
        </span>
        <svg className="entity-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </li>
  );

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Definições</h1>
          <p className="page-subtitle">O ano catequético e as listas que se escolhem nas fichas dos alunos.</p>
        </div>
      </header>

      <CartaoAno />

      <div className="side-layout">
        <aside className="docs-panel">
          <div className="docs-panel-title">Listas</div>
          <div className="doc-options">
            {secoes.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`doc-option${secaoAtiva === s.key ? ' doc-option--active' : ''}`}
                onClick={() => escolherSecao(s.key)}
              >
                <span className="doc-option-icon">{s.icon}</span>
                <span>
                  <span className="doc-option-title">{s.titulo}</span>
                  <span className="doc-option-desc">{plural(listas[s.key].filter(estaAtivo).length, 'ativo', 'ativos')}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="card card--flush">
          <div className="entity-header">
            <div>
              <h2 className="entity-title">{secao.titulo}</h2>
              <p className="entity-desc">{secao.descricao}</p>
            </div>
            <button className="button" type="button" onClick={openNew}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Novo
            </button>
          </div>

          {listas[secaoAtiva].length > 6 && (
            <div className="entity-toolbar">
              <div className="search-box search-box--sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Procurar em ${secao.titulo.toLowerCase()}…`} />
              </div>
            </div>
          )}

          {encontrados.length === 0 ? (
            <div className="table-state">
              <span>
                {termo
                  ? 'Nenhum registo com esse nome.'
                  : `Ainda não há ${secao.titulo.toLowerCase()}. Carrega em "Novo" para adicionar.`}
              </span>
            </div>
          ) : (
            <ul className="entity-list">
              {ativos.map(linha)}
              {inativos.length > 0 && (
                <>
                  <li className="entity-group">Já não ativos — continuam nos anos anteriores</li>
                  {inativos.map(linha)}
                </>
              )}
            </ul>
          )}
        </section>
      </div>

      {/* ── Modal criar/editar ── */}
      {modal && secaoModal && (
        <EditModal
          title={secaoModal.singular}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={() => setConfirmOpen(true)}
          deleteBloqueado={isNew ? null : motivoBloqueio(modal.type, modal.item)}
          ativo={estaAtivo(modal.item)}
          onToggleAtivo={handleToggleAtivo}
          isNew={isNew}
          saving={saving}
          error={modalError}
        >
          <FormField label="Nome" value={modal.item.nome} onChange={(v) => updateModalItem({ nome: v })} />
          {modal.type === 'centro' && (
            <SelectField
              label="Paróquia"
              value={modal.item.paroquia_id ?? ''}
              onChange={(v) => updateModalItem({ paroquia_id: v || null })}
              options={paroquiaOptions}
              placeholder="Sem paróquia"
            />
          )}
        </EditModal>
      )}

      {/* ── Confirmação de eliminação ── */}
      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar remoção"
        description={`Tem a certeza que quer eliminar "${modal?.item.nome ?? ''}"? Esta ação é irreversível.`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
