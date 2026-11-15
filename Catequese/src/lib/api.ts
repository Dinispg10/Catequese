import { supabase } from './supabase';
import { Aluno } from './types';

// Tipos para os filtros
export interface AlunoFilters {
  ano_matricula?: number;
  catequista_id?: string;
  centro_id?: string;
  ano_catecismo?: number;
  search?: string;
}

// Colunas onde a pesquisa procura: o aluno, a família e o telemóvel.
const searchColumns = ['nome_aluno', 'nome_pai', 'nome_mae', 'encarregado_nome', 'telemovel'];

export async function fetchParoquias() {
  const { data, error } = await supabase.from('paroquias').select('*').order('nome');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchEscolas() {
  const { data, error } = await supabase.from('escolas').select('*').order('nome');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchCatequistas() {
  const { data, error } = await supabase.from('catequistas').select('*').order('nome');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchCentros() {
  const { data, error } = await supabase.from('centros_catequese').select('*').order('nome');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAlunos(filters: AlunoFilters) {
  let query = supabase.from('alunos').select('*').order('nr_matricula').order('nome_aluno');

  if (filters.ano_matricula) query = query.eq('ano_matricula', filters.ano_matricula);
  if (filters.catequista_id) query = query.eq('catequista_id', filters.catequista_id);
  if (filters.centro_id) query = query.eq('centro_id', filters.centro_id);
  if (filters.ano_catecismo) query = query.eq('ano_catecismo', filters.ano_catecismo);

  // Vírgulas, parênteses e afins têm significado no filtro "or" do Supabase.
  const search = filters.search?.replace(/[,()*%\\"]/g, ' ').trim();
  if (search) query = query.or(searchColumns.map((col) => `${col}.ilike.%${search}%`).join(','));

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveAluno(aluno: Partial<Aluno>) {
  if (aluno.id) {
    const { data, error } = await supabase.from('alunos').update(aluno).eq('id', aluno.id).select().single();
    if (error) throw new Error(error.message);
    return data;
  } else {
    const { data, error } = await supabase.from('alunos').insert(aluno).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
}

export async function deleteAluno(id: string) {
  const { error } = await supabase.from('alunos').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

// ──────────────────────────────────────────────────────────────
// Anos catequéticos
// ──────────────────────────────────────────────────────────────

/** O ano ativo, guardado na base de dados para ser igual em todos os computadores. */
export async function fetchAnoAtivo(): Promise<number> {
  const { data, error } = await supabase.from('configuracao').select('ano_ativo').eq('id', 1).single();
  if (error) throw new Error(error.message);
  return data.ano_ativo as number;
}

export async function setAnoAtivo(ano: number) {
  const { error } = await supabase.from('configuracao').update({ ano_ativo: ano }).eq('id', 1);
  if (error) throw new Error(error.message);
}

/**
 * O Supabase devolve no máximo 1000 linhas por pedido; com vários anos de matrículas
 * isso chega-se a passar, por isso aqui lê-se aos bocados até ao fim.
 */
export async function lerTodosAlunos<T>(colunas: string, filtrar?: (q: any) => any): Promise<T[]> {
  const tamanho = 1000;
  const linhas: T[] = [];
  for (let de = 0; ; de += tamanho) {
    let query = supabase.from('alunos').select(colunas).order('id').range(de, de + tamanho - 1);
    if (filtrar) query = filtrar(query);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    linhas.push(...((data ?? []) as T[]));
    if (!data || data.length < tamanho) return linhas;
  }
}

/** Quantas matrículas há em cada ano, do mais recente para o mais antigo. */
export async function fetchContagemPorAno(): Promise<{ ano: number; total: number }[]> {
  const linhas = await lerTodosAlunos<{ ano_matricula: number }>('ano_matricula');
  const contagem = new Map<number, number>();
  for (const row of linhas) contagem.set(row.ano_matricula, (contagem.get(row.ano_matricula) ?? 0) + 1);
  return [...contagem.entries()].map(([ano, total]) => ({ ano, total })).sort((a, b) => b.ano - a.ano);
}

/** As matrículas que já foram renovadas (os ids de onde partiram as renovações). */
export async function fetchIdsRenovados(): Promise<Set<string>> {
  const linhas = await lerTodosAlunos<{ renovada_de: string }>('renovada_de', (q) => q.not('renovada_de', 'is', null));
  return new Set(linhas.map((row) => row.renovada_de));
}

/**
 * Cria a matrícula do ano novo a partir da do ano anterior: copia a ficha, sobe um
 * ano no catecismo e na escola, e fica sem catequista para se atribuir de novo.
 * O número de matrícula é novo.
 */
export async function renovarMatriculas(alunos: Aluno[], anoNovo: number) {
  const payload = alunos.map((a) => ({
    ano_matricula: anoNovo,
    renovada_de: a.id,
    paroquia_id: a.paroquia_id,
    escola_id: a.escola_id,
    centro_id: a.centro_id,
    catequista_id: null,
    nome_aluno: a.nome_aluno,
    nome_pai: a.nome_pai,
    nome_mae: a.nome_mae,
    data_nascimento: a.data_nascimento,
    naturalidade: a.naturalidade,
    batizado: a.batizado,
    data_batismo: a.data_batismo,
    lugar_batismo: a.lugar_batismo,
    encarregado_nome: a.encarregado_nome,
    morada: a.morada,
    localidade: a.localidade,
    codigo_postal: a.codigo_postal,
    telemovel: a.telemovel,
    email: a.email,
    ano_catecismo: a.ano_catecismo ? a.ano_catecismo + 1 : null,
    ano_escolar: a.ano_escolar ? a.ano_escolar + 1 : null
  }));
  const { error } = await supabase.from('alunos').insert(payload);
  if (error) {
    if (error.code === '23505') throw new Error('Alguma destas matrículas já tinha sido renovada.');
    throw new Error(error.message);
  }
}

const tabelasDefinicoes = {
  catequista: 'catequistas',
  centro: 'centros_catequese',
  paroquia: 'paroquias',
  escola: 'escolas'
} as const;

/** Desativar (ou voltar a ativar) um catequista, centro, escola ou paróquia. */
export async function setAtivo(tipo: keyof typeof tabelasDefinicoes, id: string, ativo: boolean) {
  const { error } = await supabase.from(tabelasDefinicoes[tipo]).update({ ativo }).eq('id', id);
  if (error) throw new Error(error.message);
}
