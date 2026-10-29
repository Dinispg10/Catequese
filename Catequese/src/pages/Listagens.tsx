import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Aluno, PresencaMensal } from '../lib/types';
import { fetchAlunos, fetchCatequistas, fetchCentros, fetchEscolas, fetchParoquias } from '../lib/api';
import { anoCatecismoOptions, anoMatriculaOptions, formatDate, join } from '../lib/format';
import { months, totalPresencas } from '../lib/presencas';
import SelectField from '../components/SelectField';
import CheckboxField from '../components/CheckboxField';
import PresencaCell from '../components/PresencaCell';

type DocKey = 'catequistas' | 'fichas' | 'contactos' | 'presencas';

const documentos: { key: DocKey; titulo: string; descricao: string; deitado: boolean; icon: ReactNode }[] = [
  {
    key: 'catequistas',
    titulo: 'Lista por catequista',
    descricao: 'Os alunos de cada catequista, com espaço para observações.',
    deitado: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  },
  {
    key: 'fichas',
    titulo: 'Fichas completas',
    descricao: 'Todos os dados da ficha de inscrição de cada aluno.',
    deitado: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    )
  },
  {
    key: 'contactos',
    titulo: 'Contactos dos encarregados',
    descricao: 'Encarregado, pais, telemóvel, email e morada.',
    deitado: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    )
  },
  {
    key: 'presencas',
    titulo: 'Mapa de presenças',
    descricao: 'Presenças quinzenais de outubro a junho.',
    deitado: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    )
  }
];

type PresencaComAluno = PresencaMensal & { aluno_nome: string };

interface Filtros {
  ano: string;
  anoCatecismo: string;
  catequista: string;
  centro: string;
}

async function fetchPresencas(filtros: Filtros): Promise<PresencaComAluno[]> {
  let query = supabase.from('presencas_mensais').select('*');

  if (filtros.catequista) query = query.eq('catequista_id', filtros.catequista);
  if (filtros.ano) query = query.eq('ano_matricula', Number(filtros.ano));
  if (filtros.anoCatecismo) query = query.eq('ano_catecismo', Number(filtros.anoCatecismo));

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const presencasData = (data ?? []) as PresencaMensal[];

  const alunosIds = presencasData.map((row) => row.aluno_id);
  const { data: alunosData } = alunosIds.length
    ? await supabase.from('alunos').select('id,nome_aluno,centro_id').in('id', alunosIds)
    : { data: [] };

  const alunosMap = new Map((alunosData ?? []).map((aluno) => [aluno.id, aluno]));

  return presencasData
    // As presenças não guardam o centro; vê-se pelo aluno.
    .filter((row) => !filtros.centro || alunosMap.get(row.aluno_id)?.centro_id === filtros.centro)
    .map((row) => ({ ...row, aluno_nome: alunosMap.get(row.aluno_id)?.nome_aluno ?? 'Sem nome' }))
    .sort((a, b) => a.aluno_nome.localeCompare(b.aluno_nome, 'pt'));
}

/** Linha secundária, mais pequena, dentro de uma célula. */
function Sub({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <div className="paper-sub">{children}</div>;
}

export default function Listagens() {
  const [doc, setDoc] = useState<DocKey>('catequistas');
  const [filtros, setFiltros] = useState<Filtros>({ ano: '', anoCatecismo: '', catequista: '', centro: '' });
  const [grupoPorPagina, setGrupoPorPagina] = useState(true);

  const setFiltro = (campo: keyof Filtros) => (valor: string) => setFiltros((f) => ({ ...f, [campo]: valor }));

  const { data: catequistas = [] } = useQuery({ queryKey: ['catequistas'], queryFn: fetchCatequistas });
  const { data: centros = [] } = useQuery({ queryKey: ['centros'], queryFn: fetchCentros });
  const { data: paroquias = [] } = useQuery({ queryKey: ['paroquias'], queryFn: fetchParoquias });
  const { data: escolas = [] } = useQuery({ queryKey: ['escolas'], queryFn: fetchEscolas });

  const { data: alunos = [], isLoading: loadingAlunos } = useQuery({
    queryKey: ['alunos', 'listagem', filtros],
    queryFn: () => fetchAlunos({
      ano_matricula: filtros.ano ? Number(filtros.ano) : undefined,
      ano_catecismo: filtros.anoCatecismo ? Number(filtros.anoCatecismo) : undefined,
      catequista_id: filtros.catequista || undefined,
      centro_id: filtros.centro || undefined
    }),
    enabled: doc !== 'presencas'
  });

  const { data: presencas = [], isLoading: loadingPresencas } = useQuery({
    queryKey: ['presencas-listagem', filtros],
    queryFn: () => fetchPresencas(filtros),
    enabled: doc === 'presencas'
  });

  const nomeDe = (lista: { id: string; nome: string }[], id: string | null) =>
    (id && lista.find((item) => item.id === id)?.nome) || '';

  const catequistaOptions = useMemo(() => catequistas.map((i) => ({ value: i.id, label: i.nome })), [catequistas]);
  const centroOptions = useMemo(() => centros.map((i) => ({ value: i.id, label: i.nome })), [centros]);

  // Um grupo por catequista (os alunos sem catequista ficam no fim), alunos por ordem alfabética.
  const gruposCatequista = useMemo(() => {
    const grupos = new Map<string, Aluno[]>();
    for (const aluno of alunos) {
      const chave = aluno.catequista_id ?? '';
      grupos.set(chave, [...(grupos.get(chave) ?? []), aluno]);
    }
    return [...grupos.entries()]
      .map(([catequistaId, lista]) => {
        const anos = [...new Set(lista.map((a) => a.ano_catecismo).filter((a): a is number => a !== null))].sort((a, b) => a - b);
        const nomesCentros = [...new Set(lista.map((a) => nomeDe(centros, a.centro_id)).filter(Boolean))];
        return {
          catequistaId,
          nome: nomeDe(catequistas, catequistaId || null) || 'Sem catequista',
          detalhe: join([anos.map((a) => `${a}º`).join(', ') + (anos.length ? ' ano' : ''), nomesCentros.join(', ')]),
          alunos: [...lista].sort((a, b) => a.nome_aluno.localeCompare(b.nome_aluno, 'pt'))
        };
      })
      .sort((a, b) => (!a.catequistaId ? 1 : !b.catequistaId ? -1 : a.nome.localeCompare(b.nome, 'pt')));
  }, [alunos, catequistas, centros]);

  const docAtual = documentos.find((d) => d.key === doc)!;
  const loading = doc === 'presencas' ? loadingPresencas : loadingAlunos;
  const total = doc === 'presencas' ? presencas.length : alunos.length;

  // Só aparecem no cabeçalho da folha os filtros escolhidos.
  const meta = [
    filtros.ano && { label: 'Ano de matrícula', valor: filtros.ano },
    filtros.anoCatecismo && { label: 'Catecismo', valor: `${filtros.anoCatecismo}º ano` },
    filtros.catequista && { label: 'Catequista', valor: nomeDe(catequistas, filtros.catequista) },
    filtros.centro && { label: 'Centro', valor: nomeDe(centros, filtros.centro) }
  ].filter(Boolean) as { label: string; valor: string }[];

  const hoje = new Date().toLocaleDateString('pt-PT');

  return (
    <div className="page">
      <header className="page-header no-print">
        <div>
          <h1>Listagens</h1>
          <p className="page-subtitle">Escolhe um documento, ajusta os filtros e imprime.</p>
        </div>
      </header>

      <div className="side-layout">
        {/* Painel da esquerda: escolher o documento e os filtros */}
        <aside className="docs-panel no-print">
          <div className="docs-panel-title">Documento</div>
          <div className="doc-options">
            {documentos.map((d) => (
              <button
                key={d.key}
                type="button"
                className={`doc-option${doc === d.key ? ' doc-option--active' : ''}`}
                onClick={() => setDoc(d.key)}
              >
                <span className="doc-option-icon">{d.icon}</span>
                <span>
                  <span className="doc-option-title">{d.titulo}</span>
                  <span className="doc-option-desc">{d.descricao}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="docs-panel-title">Filtros</div>
          <div className="form">
            <SelectField label="Ano matrícula" value={filtros.ano} onChange={setFiltro('ano')} options={anoMatriculaOptions} placeholder="Todos" />
            <SelectField label="Ano catecismo" value={filtros.anoCatecismo} onChange={setFiltro('anoCatecismo')} options={anoCatecismoOptions} placeholder="Todos" />
            <SelectField label="Catequista" value={filtros.catequista} onChange={setFiltro('catequista')} options={catequistaOptions} placeholder="Todos" />
            <SelectField label="Centro" value={filtros.centro} onChange={setFiltro('centro')} options={centroOptions} placeholder="Todos" />
            {doc === 'catequistas' && (
              <CheckboxField label="Cada catequista numa folha" checked={grupoPorPagina} onChange={setGrupoPorPagina} />
            )}
          </div>

          <button className="button docs-print" type="button" onClick={() => window.print()} disabled={loading || !total}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Imprimir
          </button>
        </aside>

        {/* Pré-visualização: o que aparece aqui é o que sai na impressora */}
        <div className="paper-wrap">
          {docAtual.deitado && <style>{'@media print { @page { size: A4 landscape; } }'}</style>}
          <article className={`paper${docAtual.deitado ? ' paper--landscape' : ''}`}>
            <header className="paper-header">
              <div>
                <div className="paper-brand">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                    <path d="M11 2h2v5h5v2h-5v13h-2v-13h-5v-2h5z" />
                  </svg>
                  Catequese · Gestão Paroquial
                </div>
                <h2 className="paper-title">{docAtual.titulo}</h2>
                {meta.length > 0 && (
                  <div className="paper-meta">
                    {meta.map((m) => (
                      <span key={m.label}><b>{m.label}:</b> {m.valor}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="paper-header-side">
                <div>{loading ? '…' : `${total} aluno${total !== 1 ? 's' : ''}`}</div>
                <div>{hoje}</div>
              </div>
            </header>

            {loading ? (
              <div className="paper-empty">A carregar…</div>
            ) : !total ? (
              <div className="paper-empty">Nenhum aluno com estes filtros.</div>
            ) : (
              <>
                {doc === 'catequistas' &&
                  gruposCatequista.map((grupo, i) => (
                    <section key={grupo.catequistaId} className={`grupo${grupoPorPagina && i > 0 ? ' grupo--nova-folha' : ''}`}>
                      <h3 className="grupo-title">
                        <span>
                          {grupo.nome}
                          {grupo.detalhe && <span className="grupo-detalhe"> — {grupo.detalhe}</span>}
                        </span>
                        <span className="grupo-count">{grupo.alunos.length} aluno{grupo.alunos.length !== 1 ? 's' : ''}</span>
                      </h3>
                      <table className="paper-table">
                        <thead>
                          <tr>
                            <th className="col-n">#</th>
                            <th>Nome</th>
                            <th>Catecismo</th>
                            <th>Nascimento</th>
                            <th>Encarregado</th>
                            <th>Telemóvel</th>
                            <th className="col-obs">Observações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grupo.alunos.map((aluno, idx) => (
                            <tr key={aluno.id}>
                              <td className="col-n">{idx + 1}</td>
                              <td><strong>{aluno.nome_aluno}</strong></td>
                              <td className="nowrap">{aluno.ano_catecismo ? `${aluno.ano_catecismo}º ano` : ''}</td>
                              <td>{formatDate(aluno.data_nascimento)}</td>
                              <td>{aluno.encarregado_nome}</td>
                              <td>{aluno.telemovel}</td>
                              <td className="col-obs" />
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  ))}

                {doc === 'fichas' && (
                  <table className="paper-table">
                    <thead>
                      <tr>
                        <th>Nº</th>
                        <th>Aluno</th>
                        <th>Filiação</th>
                        <th>Encarregado</th>
                        <th>Morada</th>
                        <th>Contactos</th>
                        <th>Batismo</th>
                        <th>Escola</th>
                        <th>Catequese</th>
                        <th>Paróquia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alunos.map((aluno) => (
                        <tr key={aluno.id}>
                          <td className="nowrap">
                            {aluno.nr_matricula}
                            <Sub>{aluno.ano_matricula}</Sub>
                          </td>
                          <td>
                            <strong>{aluno.nome_aluno}</strong>
                            <Sub>{join([formatDate(aluno.data_nascimento), aluno.naturalidade])}</Sub>
                          </td>
                          <td>
                            {aluno.nome_pai && <div><span className="paper-label">Pai:</span> {aluno.nome_pai}</div>}
                            {aluno.nome_mae && <div><span className="paper-label">Mãe:</span> {aluno.nome_mae}</div>}
                          </td>
                          <td>{aluno.encarregado_nome}</td>
                          <td>
                            {aluno.morada}
                            <Sub>{join([aluno.codigo_postal, aluno.localidade], ' ')}</Sub>
                          </td>
                          <td>
                            {aluno.telemovel}
                            <Sub>{aluno.email}</Sub>
                          </td>
                          <td>
                            {aluno.batizado ? 'Sim' : 'Não'}
                            {aluno.batizado && <Sub>{join([formatDate(aluno.data_batismo), aluno.lugar_batismo])}</Sub>}
                          </td>
                          <td>
                            {nomeDe(escolas, aluno.escola_id)}
                            <Sub>{aluno.ano_escolar ? `${aluno.ano_escolar}º ano` : ''}</Sub>
                          </td>
                          <td>
                            {aluno.ano_catecismo ? `${aluno.ano_catecismo}º ano` : ''}
                            <Sub>{join([nomeDe(catequistas, aluno.catequista_id), nomeDe(centros, aluno.centro_id)])}</Sub>
                          </td>
                          <td>{nomeDe(paroquias, aluno.paroquia_id)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {doc === 'contactos' && (
                  <table className="paper-table">
                    <thead>
                      <tr>
                        <th>Aluno</th>
                        <th>Encarregado</th>
                        <th>Pais</th>
                        <th>Telemóvel</th>
                        <th>Email</th>
                        <th>Morada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...alunos]
                        .sort((a, b) => a.nome_aluno.localeCompare(b.nome_aluno, 'pt'))
                        .map((aluno) => (
                          <tr key={aluno.id}>
                            <td>
                              <strong>{aluno.nome_aluno}</strong>
                              <Sub>{aluno.ano_catecismo ? `${aluno.ano_catecismo}º ano` : ''}</Sub>
                            </td>
                            <td>{aluno.encarregado_nome}</td>
                            <td>
                              {aluno.nome_pai && <div>{aluno.nome_pai}</div>}
                              {aluno.nome_mae && <div>{aluno.nome_mae}</div>}
                            </td>
                            <td className="nowrap">{aluno.telemovel}</td>
                            <td>{aluno.email}</td>
                            <td>
                              {aluno.morada}
                              <Sub>{join([aluno.codigo_postal, aluno.localidade], ' ')}</Sub>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}

                {doc === 'presencas' && (
                  <>
                    <table className="paper-table presenca-table">
                      <thead>
                        <tr>
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
                        {presencas.map((row) => (
                          <tr key={row.id}>
                            <td><strong>{row.aluno_nome}</strong></td>
                            {months.map((m) => (
                              <td key={m.label} className="center presenca-month-cell">
                                <div className="presenca-slot-pair">
                                  {m.slots.map((slot) => (
                                    <PresencaCell key={slot} valor={row[slot] ?? null} />
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
                    </table>
                  </>
                )}
              </>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
