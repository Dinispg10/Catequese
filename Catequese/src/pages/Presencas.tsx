import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Aluno, PresencaMensal, SimpleEntity } from '../lib/types';
import SelectField from '../components/SelectField';
import FormField from '../components/FormField';

interface PresencaRow extends PresencaMensal {
  aluno_nome: string;
  aluno_nr_matricula: number | null;
}

const months = [
  { label: 'Out', slots: ['out_1', 'out_2'] as const },
  { label: 'Nov', slots: ['nov_1', 'nov_2'] as const },
  { label: 'Dez', slots: ['dez_1', 'dez_2'] as const },
  { label: 'Jan', slots: ['jan_1', 'jan_2'] as const },
  { label: 'Fev', slots: ['fev_1', 'fev_2'] as const },
  { label: 'Mar', slots: ['mar_1', 'mar_2'] as const },
  { label: 'Abr', slots: ['abr_1', 'abr_2'] as const },
  { label: 'Mai', slots: ['mai_1', 'mai_2'] as const },
  { label: 'Jun', slots: ['jun_1', 'jun_2'] as const },
] as const;

type SlotKey = (typeof months)[number]['slots'][number];

// Célula de presença clicável e colorida
function PresencaCell({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={`presenca-cell${value ? ' presenca-cell--present' : ''}`}
      onClick={() => onChange(!value)}
      title={value ? 'Presente — clique para marcar falta' : 'Falta — clique para marcar presença'}
    >
      {value ? (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2.5 8 6 11.5 13.5 4" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="5" x2="11" y2="11" /><line x1="11" y1="5" x2="5" y2="11" />
        </svg>
      )}
    </button>
  );
}

export default function Presencas() {
  const [catequistas, setCatequistas] = useState<SimpleEntity[]>([]);
  const [filterCatequista, setFilterCatequista] = useState('');
  const [filterAnoMatricula, setFilterAnoMatricula] = useState('');
  const [filterAnoCatecismo, setFilterAnoCatecismo] = useState('');
  const [rows, setRows] = useState<PresencaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const refreshTimeout = useRef<number | null>(null);

  const loadReference = async () => {
    const [{ data: catequistasData }] = await Promise.all([supabase.from('catequistas').select('*').order('nome')]);
    setCatequistas(catequistasData ?? []);
  };

  const ensurePresencas = async (alunos: Aluno[]) => {
    const payload = alunos
      .filter((aluno) => aluno.ano_catecismo !== null)
      .map((aluno) => ({
        aluno_id: aluno.id,
        ano_matricula: aluno.ano_matricula,
        catequista_id: aluno.catequista_id,
        ano_catecismo: aluno.ano_catecismo,
      }));
    if (payload.length === 0) return;
    await supabase.from('presencas_mensais').upsert(payload, { onConflict: 'aluno_id,ano_matricula,ano_catecismo' });
  };

  const loadPresencas = async (isSilent = false) => {
    if (!isSilent) setLoading(true);

    let alunosQuery = supabase.from('alunos').select('*');
    if (filterCatequista) alunosQuery = alunosQuery.eq('catequista_id', filterCatequista);
    if (filterAnoMatricula) alunosQuery = alunosQuery.eq('ano_matricula', Number(filterAnoMatricula));
    if (filterAnoCatecismo) alunosQuery = alunosQuery.eq('ano_catecismo', Number(filterAnoCatecismo));

    const { data: alunosData } = await alunosQuery;
    const alunos = alunosData ?? [];

    let presencasQuery = supabase.from('presencas_mensais').select('*');
    if (filterCatequista) presencasQuery = presencasQuery.eq('catequista_id', filterCatequista);
    if (filterAnoMatricula) presencasQuery = presencasQuery.eq('ano_matricula', Number(filterAnoMatricula));
    if (filterAnoCatecismo) presencasQuery = presencasQuery.eq('ano_catecismo', Number(filterAnoCatecismo));

    const { data: presencasData } = await presencasQuery;
    const presencas = presencasData ?? [];

    const rowsWithNome = presencas.map((presenca) => {
      const aluno = alunos.find((item) => item.id === presenca.aluno_id);
      return {
        ...presenca,
        aluno_nome: aluno?.nome_aluno ?? 'Sem nome',
        aluno_nr_matricula: aluno?.nr_matricula ?? null,
      };
    });

    setRows(
      rowsWithNome.sort((a, b) => {
        const matriculaA = a.aluno_nr_matricula ?? Number.MAX_SAFE_INTEGER;
        const matriculaB = b.aluno_nr_matricula ?? Number.MAX_SAFE_INTEGER;
        if (matriculaA !== matriculaB) return matriculaA - matriculaB;
        return a.aluno_nome.localeCompare(b.aluno_nome);
      })
    );
    if (!isSilent) setLoading(false);
  };

  useEffect(() => { loadReference(); }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      // Carrega alunos primeiro para saber quem deve ter presenças
      let query = supabase.from('alunos').select('*');
      if (filterCatequista) query = query.eq('catequista_id', filterCatequista);
      if (filterAnoMatricula) query = query.eq('ano_matricula', Number(filterAnoMatricula));
      if (filterAnoCatecismo) query = query.eq('ano_catecismo', Number(filterAnoCatecismo));
      const { data } = await query;
      if (data) await ensurePresencas(data);

      await loadPresencas(true);
      setLoading(false);
    };
    init();
  }, [filterCatequista, filterAnoMatricula, filterAnoCatecismo]);

  useEffect(() => {
    const channel = supabase
      .channel('presencas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presencas_mensais' }, () => {
        if (refreshTimeout.current) window.clearTimeout(refreshTimeout.current);
        refreshTimeout.current = window.setTimeout(() => loadPresencas(true), 300);
      })
      .subscribe();
    return () => {
      if (refreshTimeout.current) window.clearTimeout(refreshTimeout.current);
      supabase.removeChannel(channel);
    };
  }, [filterCatequista, filterAnoMatricula, filterAnoCatecismo]);

  const handleToggle = async (id: string, key: SlotKey, value: boolean) => {
    // Atualização otimista
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
    await supabase.from('presencas_mensais').update({ [key]: value }).eq('id', id);
  };

  const catequistaOptions = useMemo(
    () => catequistas.map((item) => ({ value: item.id, label: item.nome })),
    [catequistas]
  );

  // Totais por aluno
  const slotKeys = months.flatMap((m) => m.slots);
  const totalPresencas = (row: PresencaRow) =>
    slotKeys.filter((k) => Boolean((row as any)[k])).length;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Mapa de Presenças</h1>
      </header>

      <div className="print-only print-filter-summary">
        <div className="print-filter-item">
          <span className="print-filter-label">Catequista:</span>
          <span>{catequistas.find(c => c.id === filterCatequista)?.nome || 'Todos'}</span>
        </div>
        <div className="print-filter-item">
          <span className="print-filter-label">Ano matrícula:</span>
          <span>{filterAnoMatricula || 'Todos'}</span>
        </div>
        <div className="print-filter-item">
          <span className="print-filter-label">Ano catecismo:</span>
          <span>{filterAnoCatecismo || 'Todos'}</span>
        </div>
      </div>

      <section className="card no-print">
        <div className="defn-card-header" style={{ marginBottom: 0 }}>
          <span className="defn-card-title">Filtros</span>
        </div>
        <div className="filters" style={{ marginTop: 12 }}>
          <SelectField
            label="Catequista"
            value={filterCatequista}
            onChange={setFilterCatequista}
            options={catequistaOptions}
            placeholder="Selecionar"
          />
          <FormField label="Ano matrícula" value={filterAnoMatricula} onChange={setFilterAnoMatricula} type="number" />
          <FormField label="Ano catecismo" value={filterAnoCatecismo} onChange={setFilterAnoCatecismo} type="number" />
        </div>
      </section>

      <section className="card">
        <div className="defn-card-header">
          <span className="defn-card-title">Presenças mensais</span>
          <div className="presenca-legend">
            <span className="presenca-legend-item">
              <span className="presenca-cell presenca-cell--present presenca-cell--tiny">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="8" height="8">
                  <polyline points="2.5 8 6 11.5 13.5 4" />
                </svg>
              </span>
              Presente
            </span>
            <span className="presenca-legend-item">
              <span className="presenca-cell presenca-cell--tiny">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="8" height="8">
                  <line x1="5" y1="5" x2="11" y2="11" /><line x1="11" y1="5" x2="5" y2="11" />
                </svg>
              </span>
              Falta
            </span>
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
            <span>Nenhum registo encontrado. Ajusta os filtros acima.</span>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="table presenca-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Nº</th>
                  <th>Aluno</th>
                  {months.map((m) => (
                    <th key={m.label} className="center presenca-month-header">{m.label}</th>
                  ))}
                  <th className="center" style={{ width: 54 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const total = totalPresencas(row);
                  const pct = Math.round((total / (slotKeys.length)) * 100);
                  return (
                    <tr key={row.id}>
                      <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{row.aluno_nr_matricula ?? '—'}</td>
                      <td style={{ fontWeight: 500 }}>{row.aluno_nome}</td>
                      {months.map((m) => (
                        <td key={m.label} className="center presenca-month-cell">
                          <div className="presenca-slot-pair">
                            <PresencaCell
                              value={Boolean((row as any)[m.slots[0]])}
                              onChange={(v) => handleToggle(row.id, m.slots[0], v)}
                            />
                            <PresencaCell
                              value={Boolean((row as any)[m.slots[1]])}
                              onChange={(v) => handleToggle(row.id, m.slots[1], v)}
                            />
                          </div>
                        </td>
                      ))}
                      <td className="center">
                        <span
                          className="presenca-total"
                          style={{
                            background: pct >= 75
                              ? 'var(--success-bg)'
                              : pct >= 40
                                ? 'var(--warning-bg)'
                                : 'var(--error-bg)',
                            color: pct >= 75
                              ? 'var(--success-txt)'
                              : pct >= 40
                                ? 'var(--warning-txt)'
                                : 'var(--error-txt)',
                          }}
                        >
                          {total}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
