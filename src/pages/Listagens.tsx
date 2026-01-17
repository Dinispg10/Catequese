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

function Box({ checked }: { checked: boolean }) {
  return <span className={checked ? 'box checked' : 'box'} />;
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
 
  return (
    <div className="page">
      <header className="page-header print-area">
        <h1>Listagens</h1>
        <button className="button" type="button" onClick={handlePrint}>
          Imprimir
        </button>
      </header>

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

      <section className="card print-area">
        <h2>Filtros</h2>
        <div className="filters">
          {activeTab === 'alunos' && (
            <>
              <SelectField
                label="Catequista"
                value={filterCatequista}
                onChange={setFilterCatequista}
                options={catequistaOptions}
                placeholder="Selecionar"
              />
              <FormField label="Ano matrícula" value={filterAno} onChange={setFilterAno} type="number" />
              <FormField label="Ano catecismo" value={filterAnoCatecismo} onChange={setFilterAnoCatecismo} type="number" />
            </>
          )}
    
          {activeTab === 'presencas' && (
            <>
              <SelectField
                label="Catequista"
                value={filterCatequista}
                onChange={setFilterCatequista}
                options={catequistaOptions}
                placeholder="Selecionar"
              />
              <FormField label="Ano matrícula" value={filterAno} onChange={setFilterAno} type="number" />
              <FormField label="Ano catecismo" value={filterAnoCatecismo} onChange={setFilterAnoCatecismo} type="number" />
            </>
          )}
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
          <h2>Mapa de Presenças</h2>

          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Nº matrícula</th>
                  <th>Aluno</th>
                  {months.map((m) => (
                    <th key={m.label} className="center">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {presencas.map((row) => (
                  <tr key={row.id}>
                    <td>{row.aluno_nr_matricula ?? '-'}</td>
                    <td>{row.aluno_nome}</td>

                    {months.map((m) => {
                      const v1 = Boolean((row as any)[m.slots[0]]);
                      const v2 = Boolean((row as any)[m.slots[1]]);
                      return (
                        <td key={m.label} className="center">
                          <span className="box-pair">
                            <Box checked={v1} />
                            <Box checked={v2} />
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
