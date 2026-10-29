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

const anoAtual = new Date().getFullYear();

/** Anos de matrícula para escolher: do próximo ano até seis anos atrás. */
export const anoMatriculaOptions = Array.from({ length: 8 }, (_, i) => {
  const ano = String(anoAtual + 1 - i);
  return { value: ano, label: ano };
});

export const anoCatecismoOptions = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}º ano`
}));
