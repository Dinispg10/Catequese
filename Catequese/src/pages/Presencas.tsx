import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Aluno, Presenca, PresencaMensal } from '../lib/types';
import { fetchCatequistas } from '../lib/api';
import { anoCatecismoOptions, anoMatriculaOptions, iniciais } from '../lib/format';
import { months, totalPresencas, type SlotKey } from '../lib/presencas';
import ChipSelect from '../components/ChipSelect';
import PresencaCell from '../components/PresencaCell';

interface PresencaRow extends PresencaMensal {
  aluno_nome: string;
}

/** Cria as linhas de presenças que faltam para os alunos (só os que têm ano de catecismo). */
async function ensurePresencas(alunos: Aluno[]) {
  const payload = alunos
    .filter((aluno) => aluno.ano_catecismo !== null)
    .map((aluno) => ({
      aluno_id: aluno.id,
      ano_matricula: aluno.ano_matricula,
      catequista_id: aluno.catequista_id,
      ano_catecismo: aluno.ano_catecismo
    }));
  if (payload.length === 0) return;
  await supabase.from('presencas_mensais').upsert(payload, { onConflict: 'aluno_id,ano_matricula,ano_catecismo' });
}

export default function Presencas() {
  const [filterCatequista, setFilterCatequista] = useState('');
  const [filterAnoMatricula, setFilterAnoMatricula] = useState('');
  const [filterAnoCatecismo, setFilterAnoCatecismo] = useState('');
  const [rows, setRows] = useState<PresencaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const refreshTimeout = useRef<number | null>(null);

  const { data: catequistas = [] } = useQuery({ queryKey: ['catequistas'], queryFn: fetchCatequistas });

  const carregar = async (criarEmFalta: boolean) => {
    let alunosQuery = supabase.from('alunos').select('*');
    if (filterCatequista) alunosQuery = alunosQuery.eq('catequista_id', filterCatequista);
    if (filterAnoMatricula) alunosQuery = alunosQuery.eq('ano_matricula', Number(filterAnoMatricula));
    if (filterAnoCatecismo) alunosQuery = alunosQuery.eq('ano_catecismo', Number(filterAnoCatecismo));
    const { data: alunosData } = await alunosQuery;
    const alunos = alunosData ?? [];

    if (criarEmFalta) await ensurePresencas(alunos);

    let presencasQuery = supabase.from('presencas_mensais').select('*');
    if (filterCatequista) presencasQuery = presencasQuery.eq('catequista_id', filterCatequista);
    if (filterAnoMatricula) presencasQuery = presencasQuery.eq('ano_matricula', Number(filterAnoMatricula));
    if (filterAnoCatecismo) presencasQuery = presencasQuery.eq('ano_catecismo', Number(filterAnoCatecismo));
    const { data: presencasData } = await presencasQuery;

    const nomes = new Map(alunos.map((aluno) => [aluno.id, aluno.nome_aluno]));
    setRows(
      (presencasData ?? [])
        .map((presenca) => ({ ...presenca, aluno_nome: nomes.get(presenca.aluno_id) ?? 'Sem nome' }))
        .sort((a, b) => a.aluno_nome.localeCompare(b.aluno_nome, 'pt'))
    );
  };

  useEffect(() => {
    setLoading(true);
    carregar(true).finally(() => setLoading(false));
  }, [filterCatequista, filterAnoMatricula, filterAnoCatecismo]);

  useEffect(() => {
    const channel = supabase
      .channel('presencas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presencas_mensais' }, () => {
        if (refreshTimeout.current) window.clearTimeout(refreshTimeout.current);
        refreshTimeout.current = window.setTimeout(() => carregar(false), 300);
      })
      .subscribe();
    return () => {
      if (refreshTimeout.current) window.clearTimeout(refreshTimeout.current);
      supabase.removeChannel(channel);
    };
  }, [filterCatequista, filterAnoMatricula, filterAnoCatecismo]);

  const handleToggle = async (id: string, slot: SlotKey, value: Presenca) => {
    // Atualização otimista; se falhar, volta a ler da base de dados.
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [slot]: value } : row)));
    const { error } = await supabase.from('presencas_mensais').update({ [slot]: value }).eq('id', id);
    if (error) carregar(false);
  };

  // Carregar no cabeçalho de uma sessão marca todos presentes; se já estavam todos,
  // volta a pôr a sessão toda por marcar.
  const marcarSessao = async (slot: SlotKey) => {
    if (!filterCatequista || !rows.length) return;
    const valor: Presenca = rows.every((row) => row[slot] === true) ? null : true;
    const ids = rows.map((row) => row.id);
    setRows((prev) => prev.map((row) => ({ ...row, [slot]: valor })));
    const { error } = await supabase.from('presencas_mensais').update({ [slot]: valor }).in('id', ids);
    if (error) carregar(false);
  };

  const catequistaOptions = useMemo(
    () => catequistas.map((item) => ({ value: item.id, label: item.nome })),
    [catequistas]
  );

  const presentesPorSessao = (slot: SlotKey) => rows.filter((row) => row[slot] === true).length;

  const temFiltros = Boolean(filterCatequista || filterAnoMatricula || filterAnoCatecismo);
  const limparFiltros = () => {
    setFilterCatequista('');
    setFilterAnoMatricula('');
    setFilterAnoCatecismo('');
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Mapa de Presenças</h1>
          <p className="page-subtitle">
            Carrega num quadrado para marcar a presença. Com um catequista escolhido, carregar em "1ª" ou "2ª" marca a sessão toda.
          </p>
        </div>
      </header>

      <div className="chips">
        <ChipSelect label="Catequista" value={filterCatequista} onChange={setFilterCatequista} options={catequistaOptions} />
        <ChipSelect label="Ano" value={filterAnoMatricula} onChange={setFilterAnoMatricula} options={anoMatriculaOptions} />
        <ChipSelect label="Catecismo" value={filterAnoCatecismo} onChange={setFilterAnoCatecismo} options={anoCatecismoOptions} />
        {temFiltros && (
          <button type="button" className="chip-clear" onClick={limparFiltros}>
            Limpar filtros
          </button>
        )}
      </div>

      <section className="card card--flush">
        <div className="card-toolbar">
          <span className="defn-card-title">
            {loading ? 'A carregar…' : `${rows.length} aluno${rows.length !== 1 ? 's' : ''}`}
          </span>
          <div className="presenca-legend">
            <span className="presenca-legend-item"><PresencaCell valor={null} /> Por marcar</span>
            <span className="presenca-legend-item"><PresencaCell valor /> Presente</span>
            <span className="presenca-legend-item"><PresencaCell valor={false} /> Falta</span>
          </div>
        </div>

        {loading ? (
          <div className="table-state">
            <div className="spinner" />
            <span>A carregar presenças…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="table-state">
            <svg viewBox="0 0 48 48" fill="none" width="40" height="40">
              <rect x="6" y="10" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
              <path d="M6 18h36" stroke="currentColor" strokeWidth="2" />
              <path d="M16 28h16M16 34h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>Nenhum aluno com estes filtros. Os alunos só aparecem aqui depois de terem o ano de catecismo preenchido.</span>
          </div>
        ) : (
          <div className="table-scroll presenca-scroll">
            <table className="table presenca-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  {months.map((m) => (
                    <th key={m.label} className="center presenca-month-header">
                      <div>{m.label}</div>
                      <div className="presenca-slot-pair">
                        {m.slots.map((slot, i) => (
                          <button
                            key={slot}
                            type="button"
                            className="sessao-btn"
                            onClick={() => marcarSessao(slot)}
                            disabled={!filterCatequista}
                            title={filterCatequista ? 'Marcar a sessão toda' : 'Escolhe um catequista para marcar a sessão toda'}
                          >
                            {i + 1}ª
                          </button>
                        ))}
                      </div>
                    </th>
                  ))}
                  <th className="center">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="aluno-cell">
                        <span className="avatar avatar--sm">{iniciais(row.aluno_nome)}</span>
                        <div>
                          <div className="aluno-nome">{row.aluno_nome}</div>
                          {row.ano_catecismo && <div className="cell-sub">{row.ano_catecismo}º ano</div>}
                        </div>
                      </div>
                    </td>
                    {months.map((m) => (
                      <td key={m.label} className="center presenca-month-cell">
                        <div className="presenca-slot-pair">
                          {m.slots.map((slot) => (
                            <PresencaCell
                              key={slot}
                              valor={row[slot] ?? null}
                              onChange={(v) => handleToggle(row.id, slot, v)}
                            />
                          ))}
                        </div>
                      </td>
                    ))}
                    <td className="center">
                      <span className="presenca-total">{totalPresencas(row)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="presenca-foot-label">Presentes</td>
                  {months.map((m) => (
                    <td key={m.label} className="center presenca-month-cell">
                      <div className="presenca-slot-pair">
                        {m.slots.map((slot) => (
                          <span key={slot} className="presenca-foot-count">{presentesPorSessao(slot) || ''}</span>
                        ))}
                      </div>
                    </td>
                  ))}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
