/** As datas vêm do Supabase como AAAA-MM-DD; mostram-se como DD/MM/AAAA. */
export function formatDate(value: string | null) {
  if (!value) return '';
  const [ano, mes, dia] = value.slice(0, 10).split('-');
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : value;
}

/** Idade feita hoje, a partir da data de nascimento (AAAA-MM-DD). */
export function idade(dataNascimento: string | null) {
  if (!dataNascimento) return null;
  const [ano, mes, dia] = dataNascimento.slice(0, 10).split('-').map(Number);
  if (!ano || !mes || !dia) return null;
  const hoje = new Date();
  let anos = hoje.getFullYear() - ano;
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) anos--;
  return anos;
}

/** Junta os valores preenchidos com um separador, ignorando os vazios. */
export function join(values: (string | number | null | undefined)[], sep = ' · ') {
  return values.filter((v) => v !== null && v !== undefined && v !== '').join(sep);
}

/** Primeira e última inicial do nome ("Ana Maria Silva" → "AS"). */
export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

/** Um registo está ativo a menos que tenha sido desativado nas Definições. */
export const estaAtivo = (item: { ativo?: boolean }) => item.ativo !== false;

/**
 * Opções para escolher num formulário ou filtro do ano ativo: só os registos ativos,
 * mais o valor que já lá estiver escolhido (para não "desaparecer" de uma ficha antiga).
 */
export function opcoesAtivas(lista: { id: string; nome: string; ativo?: boolean }[], valorAtual?: string | null) {
  return lista
    .filter((item) => estaAtivo(item) || item.id === valorAtual)
    .map((item) => ({ value: item.id, label: estaAtivo(item) ? item.nome : `${item.nome} (já não ativo)` }));
}

/** Opções com todos os registos, para consultar anos anteriores. */
export function opcoesTodas(lista: { id: string; nome: string; ativo?: boolean }[]) {
  return lista.map((item) => ({ value: item.id, label: estaAtivo(item) ? item.nome : `${item.nome} (já não ativo)` }));
}

export const anoCatecismoOptions = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}º ano`
}));
