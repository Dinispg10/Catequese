import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Aluno, PresencaMensal, SimpleEntity } from '../lib/types';
import SelectField from '../components/SelectField';
import FormField from '../components/FormField';

interface PresencaRow extends PresencaMensal {
  aluno_nome: string;
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
  { label: 'Jun', slots: ['jun_1', 'jun_2'] as const }
] as const;

type SlotKey = (typeof months)[number]['slots'][number];

export default function Presencas() {
  const [catequistas, setCatequistas] = useState<SimpleEntity[]>([]);
  const [filterCatequista, setFilterCatequista] = useState('');
  const [filterAnoMatricula, setFilterAnoMatricula] = useState('');
  const [filterAnoCatecismo, setFilterAnoCatecismo] = useState('');
  const [rows, setRows] = useState<PresencaRow[]>([]);
  const refreshTimeout = useRef<number | null>(null);

  const loadReference = async () => {
    const [{ data: catequistasData }] = await Promise.all([supabase.from('catequistas').select('*').order('nome')]);
    setCatequistas(catequistasData ?? []);
  };

  const ensurePresencas = async (alunos: Aluno[]) => {
    const payload = alunos.map((aluno) => ({
      aluno_id: aluno.id,
      ano_matricula: aluno.ano_matricula,
      catequista_id: aluno.catequista_id,
      ano_catecismo: aluno.ano_catecismo
    }));
    if (payload.length === 0) return;

    await supabase.from('presencas_mensais').upsert(payload, {
      onConflict: 'aluno_id,ano_matricula,catequista_id,ano_catecismo'
    });
  };

  const loadPresencas = async () => {
    if (!filterCatequista || !filterAnoMatricula) {
      setRows([]);
      return;
    }

    let alunosQuery = supabase
      .from('alunos')
      .select('*')
      .eq('catequista_id', filterCatequista)
      .eq('ano_matricula', Number(filterAnoMatricula));

    if (filterAnoCatecismo) {
      alunosQuery = alunosQuery.eq('ano_catecismo', Number(filterAnoCatecismo));
    }

    const { data: alunosData } = await alunosQuery;
    const alunos = alunosData ?? [];

    await ensurePresencas(alunos);

    let presencasQuery = supabase
      .from('presencas_mensais')
      .select('*')
      .eq('catequista_id', filterCatequista)
      .eq('ano_matricula', Number(filterAnoMatricula));

    if (filterAnoCatecismo) {
      presencasQuery = presencasQuery.eq('ano_catecismo', Number(filterAnoCatecismo));
    }

    const { data: presencasData } = await presencasQuery;
    const presencas = presencasData ?? [];

    const rowsWithNome = presencas.map((presenca) => ({
      ...presenca,
      aluno_nome: alunos.find((aluno) => aluno.id === presenca.aluno_id)?.nome_aluno ?? 'Sem nome'
    }));

    setRows(rowsWithNome.sort((a, b) => a.aluno_nome.localeCompare(b.aluno_nome)));
  };

  useEffect(() => {
    loadReference();
  }, []);

  useEffect(() => {
    loadPresencas();
  }, [filterCatequista, filterAnoMatricula, filterAnoCatecismo]);

  useEffect(() => {
    const channel = supabase
      .channel('presencas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presencas_mensais' }, () => {
        if (refreshTimeout.current) window.clearTimeout(refreshTimeout.current);
        refreshTimeout.current = window.setTimeout(() => loadPresencas(), 300);
      })
      .subscribe();

    return () => {
      if (refreshTimeout.current) window.clearTimeout(refreshTimeout.current);
      supabase.removeChannel(channel);
    };
  }, [filterCatequista, filterAnoMatricula, filterAnoCatecismo]);

  const handleToggle = async (id: string, key: SlotKey, value: boolean) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
    await supabase.from('presencas_mensais').update({ [key]: value }).eq('id', id);
  };

  const catequistaOptions = useMemo(
    () => catequistas.map((item) => ({ value: item.id, label: item.nome })),
    [catequistas]
  );

  return (
    <div className="page">
      <header className="page-header">
        <h1>Mapa de Presenças</h1>
      </header>

      <section className="card">
        <h2>Filtros</h2>
        <div className="filters">
          <SelectField
            label="Catequista"
            value={filterCatequista}
            onChange={setFilterCatequista}
            options={catequistaOptions}
            placeholder="Selecionar"
            required
          />
          <FormField label="Ano matrícula" value={filterAnoMatricula} onChange={setFilterAnoMatricula} type="number" required />
          <FormField label="Ano catecismo" value={filterAnoCatecismo} onChange={setFilterAnoCatecismo} type="number" />
        </div>
      </section>

      <section className="card">
        <h2>Presenças mensais</h2>
        {!filterCatequista || !filterAnoMatricula ? (
          <p>Selecione o catequista e o ano para ver o mapa.</p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  {months.map((m) => (
                    <th key={m.label} className="center">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.aluno_nome}</td>

                    {months.map((m) => (
                      <td key={m.label} className="center">
                        <div className="slot-cell">
                          <input
                            type="checkbox"
                            checked={Boolean((row as any)[m.slots[0]])}
                            onChange={(e) => handleToggle(row.id, m.slots[0], e.target.checked)}
                          />
                          <input
                            type="checkbox"
                            checked={Boolean((row as any)[m.slots[1]])}
                            onChange={(e) => handleToggle(row.id, m.slots[1], e.target.checked)}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
