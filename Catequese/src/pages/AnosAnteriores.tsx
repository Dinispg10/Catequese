import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Aluno } from '../lib/types';
import {
  deleteAluno,
  fetchAlunos,
  fetchCatequistas,
  fetchCentros,
  fetchContagemPorAno,
  fetchEscolas,
  fetchIdsRenovados,
  fetchParoquias,
  renovarMatriculas,
  saveAluno
} from '../lib/api';
import { useAnoAtivo } from '../lib/anoAtivo';
import { anoCatecismoOptions, opcoesTodas } from '../lib/format';

import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import ChipSelect from '../components/ChipSelect';
import AlunoModal from '../components/AlunoModal';
import { colunasAluno } from '../components/alunoColumns';

const estadoOptions = [
  { value: 'por-renovar', label: 'Por renovar' },
  { value: 'renovadas', label: 'Renovadas' }
];

export default function AnosAnteriores() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { anoAtivo } = useAnoAtivo();

  const [anoEscolhido, setAnoEscolhido] = useState<number | null>(null);
  const [filterAnoCatecismo, setFilterAnoCatecismo] = useState('');
  const [filterCatequista, setFilterCatequista] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [confirmRenovar, setConfirmRenovar] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  const [modalAluno, setModalAluno] = useState<Aluno | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchDebounced(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data: paroquias = [] } = useQuery({ queryKey: ['paroquias'], queryFn: fetchParoquias });
  const { data: escolas = [] } = useQuery({ queryKey: ['escolas'], queryFn: fetchEscolas });
  const { data: catequistas = [] } = useQuery({ queryKey: ['catequistas'], queryFn: fetchCatequistas });
  const { data: centros = [] } = useQuery({ queryKey: ['centros'], queryFn: fetchCentros });

  const { data: contagem = [], isLoading: loadingAnos } = useQuery({
    queryKey: ['alunos', 'contagem-por-ano'],
    queryFn: fetchContagemPorAno
  });
  const { data: renovados = new Set<string>() } = useQuery({
    queryKey: ['alunos', 'renovados'],
    queryFn: fetchIdsRenovados
  });

  // Só os anos antes do ativo; abre no mais recente.
  const anos = anoAtivo === undefined ? [] : contagem.filter((c) => c.ano < anoAtivo);
  const ano = anoEscolhido ?? anos[0]?.ano ?? null;

  const { data: alunos = [], isLoading: loadingAlunos } = useQuery({
    queryKey: ['alunos', 'anteriores', { ano, filterAnoCatecismo, filterCatequista, searchDebounced }],
    queryFn: () => fetchAlunos({
      ano_matricula: ano!,
      ano_catecismo: filterAnoCatecismo ? Number(filterAnoCatecismo) : undefined,
      catequista_id: filterCatequista || undefined,
      search: searchDebounced
    }),
    enabled: ano !== null
  });

  const visiveis = useMemo(() => {
    if (filterEstado === 'por-renovar') return alunos.filter((a) => !renovados.has(a.id));
    if (filterEstado === 'renovadas') return alunos.filter((a) => renovados.has(a.id));
    return alunos;
  }, [alunos, renovados, filterEstado]);

  const porRenovar = visiveis.filter((a) => !renovados.has(a.id));
  const escolhidos = alunos.filter((a) => selecionados.has(a.id) && !renovados.has(a.id));

  const escolherAno = (novo: number) => {
    setAnoEscolhido(novo);
    setSelecionados(new Set());
    setMensagem(null);
  };

  const alternar = (id: string) => {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const todosPorRenovarEscolhidos = porRenovar.length > 0 && porRenovar.every((a) => selecionados.has(a.id));
  const alternarTodos = () =>
    setSelecionados(todosPorRenovarEscolhidos ? new Set() : new Set(porRenovar.map((a) => a.id)));

  const renovarMutation = useMutation({
    mutationFn: () => renovarMatriculas(escolhidos, anoAtivo!),
    onSuccess: () => {
      const n = escolhidos.length;
      setMensagem({
        tipo: 'success',
        texto: `${n} matrícula${n !== 1 ? 's' : ''} renovada${n !== 1 ? 's' : ''} para ${anoAtivo}. Falta atribuir os catequistas em Matrículas.`
      });
      setSelecionados(new Set());
      setConfirmRenovar(false);
      queryClient.invalidateQueries({ queryKey: ['alunos'] });
    },
    onError: (erro: Error) => {
      setMensagem({ tipo: 'error', texto: `Não foi possível renovar: ${erro.message}` });
      setConfirmRenovar(false);
    }
  });

  const saveMutation = useMutation({
    mutationFn: saveAluno,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alunos'] });
      setModalAluno(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAluno,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alunos'] });
      setConfirmDelete(false);
      setModalAluno(null);
    }
  });

  const colunas = [
    {
      key: 'selecao',
      header: '',
      render: (row: Aluno) =>
        renovados.has(row.id) ? null : (
          // Escolher para renovar não deve abrir a ficha.
          <span className="select-cell" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selecionados.has(row.id)}
              onChange={() => alternar(row.id)}
              aria-label={`Escolher ${row.nome_aluno}`}
            />
          </span>
        )
    },
    ...colunasAluno(catequistas, centros),
    {
      key: 'estado',
      header: 'Estado',
      render: (row: Aluno) =>
        renovados.has(row.id)
          ? <span className="tag tag--success">Renovada</span>
          : <span className="tag tag--muted">Por renovar</span>
    }
  ];

  const temFiltros = Boolean(filterAnoCatecismo || filterCatequista || filterEstado || search);
  const limparFiltros = () => {
    setFilterAnoCatecismo('');
    setFilterCatequista('');
    setFilterEstado('');
    setSearch('');
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Anos anteriores</h1>
          <p className="page-subtitle">
            As matrículas dos anos que já passaram. Escolhe os alunos que continuam e renova a matrícula para {anoAtivo}.
          </p>
        </div>
        {ano !== null && (
          <button className="button secondary" type="button" onClick={() => navigate(`/listagens?ano=${ano}`)}>
            Listagens de {ano}
          </button>
        )}
      </header>

      {loadingAnos ? (
        <div className="table-state"><div className="spinner" /><span>A carregar…</span></div>
      ) : anos.length === 0 ? (
        <section className="card">
          <div className="table-state">
            <span>
              Ainda não há anos anteriores. Quando começares um ano novo nas Definições, as matrículas de {anoAtivo} passam para aqui.
            </span>
          </div>
        </section>
      ) : (
        <>
          {/* Escolher o ano */}
          <div className="ano-tabs">
            {anos.map((a) => (
              <button
                key={a.ano}
                type="button"
                className={`ano-tab${a.ano === ano ? ' ano-tab--active' : ''}`}
                onClick={() => escolherAno(a.ano)}
              >
                <span className="ano-tab-ano">{a.ano}</span>
                <span className="ano-tab-total">{a.total} aluno{a.total !== 1 ? 's' : ''}</span>
              </button>
            ))}
          </div>

          {mensagem && <div className={`alert ${mensagem.tipo}`}>{mensagem.texto}</div>}

          <section className="search-panel">
            <div className="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Procurar nas matrículas de ${ano}…`}
              />
            </div>
            <div className="chips chips--lg">
              <ChipSelect label="Catecismo" value={filterAnoCatecismo} onChange={setFilterAnoCatecismo} options={anoCatecismoOptions} />
              <ChipSelect label="Catequista" value={filterCatequista} onChange={setFilterCatequista} options={opcoesTodas(catequistas)} />
              <ChipSelect label="Estado" value={filterEstado} onChange={setFilterEstado} options={estadoOptions} />
            </div>
          </section>

          <section className="card card--flush">
            <div className="card-toolbar">
              <span className="defn-card-title">
                {loadingAlunos
                  ? 'A carregar…'
                  : `${visiveis.length} aluno${visiveis.length !== 1 ? 's' : ''} · ${porRenovar.length} por renovar`}
              </span>
              <div className="toolbar-actions">
                {temFiltros && (
                  <button type="button" className="chip-clear" onClick={limparFiltros}>
                    Limpar filtros
                  </button>
                )}
                {porRenovar.length > 0 && (
                  <button type="button" className="button secondary button--sm" onClick={alternarTodos}>
                    {todosPorRenovarEscolhidos ? 'Limpar seleção' : 'Escolher todos por renovar'}
                  </button>
                )}
                <button
                  type="button"
                  className="button button--sm"
                  onClick={() => setConfirmRenovar(true)}
                  disabled={!escolhidos.length || anoAtivo === undefined}
                >
                  Renovar {escolhidos.length || ''} para {anoAtivo}
                </button>
              </div>
            </div>
            <DataTable
              columns={colunas}
              rows={visiveis}
              getRowId={(row) => row.id}
              selectedId={modalAluno?.id}
              onRowClick={setModalAluno}
              loading={loadingAlunos}
              emptyMessage="Nenhum aluno com estes filtros."
            />
          </section>
        </>
      )}

      {modalAluno && anoAtivo !== undefined && (
        <AlunoModal
          aluno={modalAluno}
          anoAtivo={anoAtivo}
          onClose={() => setModalAluno(null)}
          onSave={(data) => saveMutation.mutate(data)}
          onDelete={() => setConfirmDelete(true)}
          paroquias={paroquias}
          escolas={escolas}
          centros={centros}
          catequistas={catequistas}
          saving={saveMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={confirmRenovar}
        title={`Renovar ${escolhidos.length} matrícula${escolhidos.length !== 1 ? 's' : ''} para ${anoAtivo}`}
        description={
          <>
            <p>Vão ser criadas matrículas novas em {anoAtivo}, com os dados da ficha copiados e:</p>
            <ul className="confirm-list">
              <li>o ano de catecismo e o ano escolar a subir um ano;</li>
              <li>sem catequista, para atribuíres em Matrículas;</li>
              <li>um número de matrícula novo.</li>
            </ul>
            <p>As matrículas de {ano} ficam como estão.</p>
          </>
        }
        confirmLabel="Renovar"
        danger={false}
        busy={renovarMutation.isPending}
        onCancel={() => setConfirmRenovar(false)}
        onConfirm={() => renovarMutation.mutate()}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Confirmar remoção"
        description="Tem a certeza que quer eliminar esta matrícula? Esta ação é irreversível."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => modalAluno?.id && deleteMutation.mutate(modalAluno.id)}
      />
    </div>
  );
}
