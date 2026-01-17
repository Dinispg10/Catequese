import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Aluno, PresencaMensal, SimpleEntity } from '../lib/types';
import SelectField from '../components/SelectField';
import FormField from '../components/FormField';

const tabs = [
  { key: 'ano', label: 'Por Ano' },
  { key: 'catequista', label: 'Por Catequista' },
  { key: 'centro', label: 'Por Centro' },
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
  const [activeTab, setActiveTab] = useState<TabKey>('ano');
  const [catequistas, setCatequistas] = useState<SimpleEntity[]>([]);
  const [centros, setCentros] = useState<SimpleEntity[]>([]);
  const [filterAno, setFilterAno] = useState('');
  const [filterCatequista, setFilterCatequista] = useState('');
  const [filterCentro, setFilterCentro] = useState('');
  const [filterAnoCatecismo, setFilterAnoCatecismo] = useState('');
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [presencas, setPresencas] = useState<(PresencaMensal & { aluno_nome: string })[]>([]);

  const loadReference = async () => {
    const [{ data: catequistasData }, { data: centrosData }] = await Promise.all([
      supabase.from('catequistas').select('*').order('nome'),
      supabase.from('centros_catequese').select('*').order('nome')
    ]);
    setCatequistas(catequistasData ?? []);
    setCentros(centrosData ?? []);
  };

  const loadAlunos = async () => {
    let query = supabase.from('alunos').select('*').order('nome_aluno');

    if (activeTab === 'ano' && filterAno) query = query.eq('ano_matricula', Number(filterAno));
    if (activeTab === 'catequista' && filterCatequista) query = query.eq('catequista_id', filterCatequista);
    if (activeTab === 'centro' && filterCentro) query = query.eq('centro_id', filterCentro);

    const { data } = await query;
    setAlunos(data ?? []);
  };

  const loadPresencas = async () => {
    if (!filterCatequista || !filterAno) {
      setPresencas([]);
      return;
    }

    let query = supabase
      .from('presencas_mensais')
      .select('*')
      .eq('catequista_id', filterCatequista)
      .eq('ano_matricula', Number(filterAno));

    if (filterAnoCatecismo) query = query.eq('ano_catecismo', Number(filterAnoCatecismo));

    const { data } = await query;
    const presencasData = data ?? [];

    const alunosIds = presencasData.map((row) => row.aluno_id);
    const { data: alunosData } = await supabase.from('alunos').select('id,nome_aluno').in('id', alunosIds);

    const alunosMap = new Map((alunosData ?? []).map((aluno) => [aluno.id, aluno.nome_aluno]));
    setPresencas(
      presencasData.map((row) => ({
        ...row,
        aluno_nome: alunosMap.get(row.aluno_id) ?? row.aluno_id
      }))
    );
  };

  useEffect(() => {
    loadReference();
  }, []);

  useEffect(() => {
    if (activeTab === 'presencas') loadPresencas();
    else loadAlunos();
  }, [activeTab, filterAno, filterCatequista, filterCentro, filterAnoCatecismo]);

  const handlePrint = () => window.print();

  const catequistaOptions = useMemo(
    () => catequistas.map((item) => ({ value: item.id, label: item.nome })),
    [catequistas]
  );
  const centroOptions = useMemo(
    () => centros.map((item) => ({ value: item.id, label: item.nome })),
    [centros]
  );

  return (
    <div className="page">
      <header className="page-header">
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

      <section className="card">
        <h2>Filtros</h2>
        <div className="filters">
          {activeTab === 'ano' && (
            <FormField label="Ano matrícula" value={filterAno} onChange={setFilterAno} type="number" />
          )}

          {activeTab === 'catequista' && (
            <SelectField
              label="Catequista"
              value={filterCatequista}
              onChange={setFilterCatequista}
              options={catequistaOptions}
              placeholder="Selecionar"
            />
          )}

          {activeTab === 'centro' && (
            <SelectField
              label="Centro"
              value={filterCentro}
              onChange={setFilterCentro}
              options={centroOptions}
              placeholder="Selecionar"
            />
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

      {activeTab !== 'presencas' && (
        <section className="card print-area">
          <h2>Resultados</h2>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Nº matrícula</th>
                  <th>Nome</th>
                  <th>Ano matrícula</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno) => (
                  <tr key={aluno.id}>
                    <td>{aluno.nr_matricula}</td>
                    <td>{aluno.nome_aluno}</td>
                    <td>{aluno.ano_matricula}</td>
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
