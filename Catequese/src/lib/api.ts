import { supabase } from './supabase';
import { Aluno } from './types';

// Tipos para os filtros
export interface AlunoFilters {
  ano_matricula?: number;
  catequista_id?: string;
  centro_id?: string;
  search?: string;
}

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
  if (filters.search?.trim()) query = query.ilike('nome_aluno', `%${filters.search.trim()}%`);

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
