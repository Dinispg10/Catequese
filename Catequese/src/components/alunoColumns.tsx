import type { ReactNode } from 'react';
import { Aluno, SimpleEntity } from '../lib/types';
import { idade, iniciais, join } from '../lib/format';

interface Coluna {
  key: string;
  header: string;
  render: (row: Aluno) => ReactNode;
}

/** As colunas da lista de alunos, usadas em Matrículas e em Anos anteriores. */
export function colunasAluno(catequistas: SimpleEntity[], centros: SimpleEntity[]): Coluna[] {
  const nomeDe = (lista: SimpleEntity[], id: string | null) => lista.find((i) => i.id === id)?.nome;

  return [
    {
      key: 'nr_matricula',
      header: 'Nº',
      render: (row) => <span className="cell-num">{row.nr_matricula}</span>,
    },
    {
      key: 'nome_aluno',
      header: 'Aluno',
      render: (row) => {
        const anos = idade(row.data_nascimento);
        return (
          <div className="aluno-cell">
            <span className="avatar">{iniciais(row.nome_aluno)}</span>
            <div>
              <div className="aluno-nome">
                {row.nome_aluno}
                {!row.batizado && <span className="tag tag--warning">Por batizar</span>}
              </div>
              <div className="cell-sub">{join([anos !== null ? `${anos} anos` : null, row.naturalidade])}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'ano_catecismo',
      header: 'Catecismo',
      render: (row) => (
        <>
          {row.ano_catecismo ? <span className="tag tag--brand">{row.ano_catecismo}º ano</span> : <span className="cell-empty">—</span>}
          <div className="cell-sub">Matrícula {row.ano_matricula}</div>
        </>
      ),
    },
    {
      key: 'catequista_id',
      header: 'Catequista',
      render: (row) => (
        <>
          {nomeDe(catequistas, row.catequista_id) ?? <span className="cell-empty">Sem catequista</span>}
          <div className="cell-sub">{nomeDe(centros, row.centro_id)}</div>
        </>
      ),
    },
    {
      key: 'telemovel',
      header: 'Contacto',
      render: (row) => (
        <>
          {row.telemovel || row.email || <span className="cell-empty">Sem contacto</span>}
          <div className="cell-sub">{row.encarregado_nome}</div>
        </>
      ),
    },
  ];
}
