import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
import { useAnoAtivo } from '../lib/anoAtivo';
import { anoCatecismoOptions, opcoesAtivas } from '../lib/format';

import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import ChipSelect from '../components/ChipSelect';
import AlunoModal from '../components/AlunoModal';
import { colunasAluno } from '../components/alunoColumns';

export default function Alunos() {
  const queryClient = useQueryClient();
  const { anoAtivo } = useAnoAtivo();
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

  // Só as matrículas do ano ativo; as outras estão em "Anos anteriores".
  const { data: alunos = [], isLoading: loadingAlunos } = useQuery({
    queryKey: ['alunos', { anoAtivo, filterAnoCatecismo, filterCatequista, filterCentro, searchDebounced }],
    queryFn: () => fetchAlunos({
      ano_matricula: anoAtivo,
      ano_catecismo: filterAnoCatecismo ? Number(filterAnoCatecismo) : undefined,
      catequista_id: filterCatequista || undefined,
      centro_id: filterCentro || undefined,
      search: searchDebounced
    }),
    enabled: anoAtivo !== undefined,
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

  const temFiltros = Boolean(filterAnoCatecismo || filterCatequista || filterCentro || search);
  const limparFiltros = () => {
    setFilterAnoCatecismo('');
    setFilterCatequista('');
    setFilterCentro('');
    setSearch('');
    searchRef.current?.focus();
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Matrículas {anoAtivo}</h1>
          <p className="page-subtitle">Procura um aluno para abrir a ficha, ou cria uma inscrição nova.</p>
        </div>
        <button className="button" type="button" onClick={openNew} disabled={anoAtivo === undefined}>
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
          <ChipSelect label="Catecismo" value={filterAnoCatecismo} onChange={setFilterAnoCatecismo} options={anoCatecismoOptions} />
          <ChipSelect label="Catequista" value={filterCatequista} onChange={setFilterCatequista} options={opcoesAtivas(catequistas, filterCatequista)} />
          <ChipSelect label="Centro" value={filterCentro} onChange={setFilterCentro} options={opcoesAtivas(centros, filterCentro)} />
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
          columns={colunasAluno(catequistas, centros)}
          rows={alunos}
          getRowId={(row) => row.id}
          selectedId={modalAluno?.id}
          onRowClick={openEdit}
          loading={loadingAlunos}
          emptyMessage={temFiltros
            ? 'Nenhum aluno encontrado com esta pesquisa.'
            : `Ainda não há matrículas em ${anoAtivo ?? 'este ano'}. Cria uma nova, ou renova as do ano anterior em "Anos anteriores".`}
        />
      </section>

      {/* Modal do aluno */}
      {modalAluno && anoAtivo !== undefined && (
        <AlunoModal
          aluno={modalAluno.id ? modalAluno : null}
          anoAtivo={anoAtivo}
          onClose={closeModal}
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
        open={confirmDelete}
        title="Confirmar remoção"
        description="Tem a certeza que quer eliminar este aluno? Esta ação é irreversível."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => modalAluno?.id && deleteMutation.mutate(modalAluno.id)}
      />
    </div>
  );
}
