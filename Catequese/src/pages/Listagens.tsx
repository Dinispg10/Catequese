import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Aluno, PresencaMensal, SimpleEntity } from '../lib/types';
import SelectField from '../components/SelectField';
import FormField from '../components/FormField';

const tabs = [
  { key: 'alunos', label: 'Listagem de Alunos' },
  { key: 'presencas', label: 'Mapa de Presenças' }
] as const;

type TabKey = (typeof tabs)[number]['key'];

/** 1 coluna por mês, 2 "slots" dentro */
const months = [
  { label: 'Out', slots: ['out_1', 'out_2'] as const },
  { label: 'Nov', slots: ['nov_1', 'nov_2'] as const },
  { label: 'Dez', slots: ['dez_1', 'dez_2'] as const },
  { label: 'Jan', slots: ['jan_1', 'jan_2'] as const },
  { label: 'Fev', slots: ['fev_1', 'fev_2'] as const },
  { label: 'Mar', slots: ['mar_1', 'mar_2'] as const },
  { label: 'Abr', slots: ['abr_1', 'abr_2'] as const },
  { label: 'Mai', slots: ['mai_1', 'mai_2'] as const },
  { label: 'Jun', slots: ['jun_1', 'jun_2'] as const }
] as const;

const slotKeys = months.flatMap((m) => m.slots);

function PresencaCell({ value }: { value: boolean }) {
  return (
    <div className={`presenca-cell presenca-cell--tiny${value ? ' presenca-cell--present' : ''}`}>
      {value ? (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2.5 8 6 11.5 13.5 4" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="5" x2="11" y2="11" /><line x1="11" y1="5" x2="5" y2="11" />
        </svg>
      )}
    </div>
  );
}

export default function Listagens() {
  const [activeTab, setActiveTab] = useState<TabKey>('alunos');
  const [catequistas, setCatequistas] = useState<SimpleEntity[]>([]);
  const [filterAno, setFilterAno] = useState('');
  const [filterCatequista, setFilterCatequista] = useState('');
  const [filterAnoCatecismo, setFilterAnoCatecismo] = useState('');
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [presencas, setPresencas] = useState<(PresencaMensal & { aluno_nome: string; aluno_nr_matricula: number | null })[]>([]);

  const loadReference = async () => {
    const { data: catequistasData } = await supabase.from('catequistas').select('*').order('nome');
    setCatequistas(catequistasData ?? []);
  };

  const loadAlunos = async () => {
    let query = supabase.from('alunos').select('*').order('nr_matricula').order('nome_aluno');

    if (filterAno) query = query.eq('ano_matricula', Number(filterAno));
    if (filterCatequista) query = query.eq('catequista_id', filterCatequista);
    if (filterAnoCatecismo) query = query.eq('ano_catecismo', Number(filterAnoCatecismo));

    const { data } = await query;
    setAlunos(data ?? []);
  };

  const loadPresencas = async () => {
    let query = supabase.from('presencas_mensais').select('*');

    if (filterCatequista) query = query.eq('catequista_id', filterCatequista);
    if (filterAno) query = query.eq('ano_matricula', Number(filterAno));
    if (filterAnoCatecismo) query = query.eq('ano_catecismo', Number(filterAnoCatecismo));

    const { data } = await query;
    const presencasData = data ?? [];

    const alunosIds = presencasData.map((row) => row.aluno_id);
    const { data: alunosData } = alunosIds.length
      ? await supabase.from('alunos').select('id,nome_aluno,nr_matricula').in('id', alunosIds)
      : { data: [] };

    const alunosMap = new Map(
      (alunosData ?? []).map((aluno) => [aluno.id, { nome: aluno.nome_aluno, nr_matricula: aluno.nr_matricula }])
    );
    setPresencas(
      presencasData
        .map((row) => {
          const aluno = alunosMap.get(row.aluno_id);
          return {
            ...row,
            aluno_nome: aluno?.nome ?? row.aluno_id,
            aluno_nr_matricula: aluno?.nr_matricula ?? null
          };
        })
        .sort((a, b) => {
          const matriculaA = a.aluno_nr_matricula ?? Number.MAX_SAFE_INTEGER;
          const matriculaB = b.aluno_nr_matricula ?? Number.MAX_SAFE_INTEGER;
          if (matriculaA !== matriculaB) return matriculaA - matriculaB;
          return a.aluno_nome.localeCompare(b.aluno_nome);
        })
    );
  };

  useEffect(() => {
    loadReference();
  }, []);

  useEffect(() => {
    if (activeTab === 'presencas') loadPresencas();
    else loadAlunos();
  }, [activeTab, filterAno, filterCatequista, filterAnoCatecismo]);

  const handlePrint = () => window.print();

  const catequistaOptions = useMemo(
    () => catequistas.map((item) => ({ value: item.id, label: item.nome })),
    [catequistas]
  );

  const totalPresencas = (row: PresencaMensal) =>
    slotKeys.filter((k) => Boolean((row as any)[k])).length;

  return (
    <div className="page">
      <header className="page-header print-area">
        <h1>Listagens</h1>
        <button className="button" type="button" onClick={handlePrint}>
          Imprimir
        </button>
      </header>

      <div className="print-only print-filter-summary">
        <div className="print-filter-item">
          <span className="print-filter-label">Catequista:</span>
          <span>{catequistas.find(c => c.id === filterCatequista)?.nome || 'Todos'}</span>
        </div>
        <div className="print-filter-item">
          <span className="print-filter-label">Ano matrícula:</span>
          <span>{filterAno || 'Todos'}</span>
        </div>
        <div className="print-filter-item">
          <span className="print-filter-label">Ano catecismo:</span>
          <span>{filterAnoCatecismo || 'Todos'}</span>
        </div>
      </div>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="card no-print">
        <h2>Filtros</h2>
        <div className="filters">
          <SelectField
            label="Catequista"
            value={filterCatequista}
            onChange={setFilterCatequista}
            options={catequistaOptions}
            placeholder="Selecionar"
          />
          <FormField label="Ano matrícula" value={filterAno} onChange={setFilterAno} type="number" />
          <FormField label="Ano catecismo" value={filterAnoCatecismo} onChange={setFilterAnoCatecismo} type="number" />
        </div>
      </section>

      {activeTab === 'alunos' && (
        <section className="card print-area">
          <h2>Resultados</h2>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Nº matrícula</th>
                  <th>Nome</th>
                  <th>Ano matrícula</th>
                  <th>Catequista</th>
                  <th>Ano catequese</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno) => (
                  <tr key={aluno.id}>
                    <td>{aluno.nr_matricula}</td>
                    <td>{aluno.nome_aluno}</td>
                    <td>{aluno.ano_matricula}</td>
                    <td>{catequistas.find((item) => item.id === aluno.catequista_id)?.nome ?? '-'}</td>
                    <td>{aluno.ano_catecismo ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'presencas' && (
        <section className="card print-area">
          <div className="defn-card-header">
            <h2 style={{ marginBottom: 0 }}>Mapa de Presenças</h2>
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

          <div className="table-scroll">
            <table className="table presenca-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Nº</th>
                  <th>Aluno</th>
                  {months.map((m) => (
                    <th key={m.label} className="center presenca-month-header">
                      {m.label}
                    </th>
                  ))}
                  <th className="center" style={{ width: 54 }}>Total</th>
                </tr>
              </thead>

              <tbody>
                {presencas.map((row) => {
                  const total = totalPresencas(row);
                  const pct = Math.round((total / slotKeys.length) * 100);
                  return (
                    <tr key={row.id}>
                      <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{row.aluno_nr_matricula ?? '—'}</td>
                      <td style={{ fontWeight: 500 }}>{row.aluno_nome}</td>

                      {months.map((m) => {
                        const v1 = Boolean((row as any)[m.slots[0]]);
                        const v2 = Boolean((row as any)[m.slots[1]]);
                        return (
                          <td key={m.label} className="center presenca-month-cell">
                            <div className="presenca-slot-pair">
                              <PresencaCell value={v1} />
                              <PresencaCell value={v2} />
                            </div>
                          </td>
                        );
                      })}
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
        </section>
      )}
    </div>
  );
}
