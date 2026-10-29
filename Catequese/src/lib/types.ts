export interface SimpleEntity {
  id: string;
  nome: string;
}

export interface Aluno {
  id: string;
  nr_matricula: number;
  ano_matricula: number;
  paroquia_id: string | null;
  escola_id: string | null;
  centro_id: string | null;
  catequista_id: string | null;
  nome_aluno: string;
  nome_pai: string | null;
  nome_mae: string | null;
  data_nascimento: string | null;
  naturalidade: string | null;
  batizado: boolean;
  data_batismo: string | null;
  lugar_batismo: string | null;
  encarregado_nome: string | null;
  morada: string | null;
  localidade: string | null;
  codigo_postal: string | null;
  telemovel: string | null;
  email: string | null;
  ano_catecismo: number | null;
  ano_escolar: number | null;
}

/** Uma sessão: null = ainda não marcada, true = presente, false = falta. */
export type Presenca = boolean | null;

export interface PresencaMensal {
  id: string;
  aluno_id: string;
  ano_matricula: number;
  catequista_id: string | null;
  ano_catecismo: number | null;
  out: boolean;
  nov: boolean;
  dez: boolean;
  jan: boolean;
  fev: boolean;
  mar: boolean;
  abr: boolean;
  mai: boolean;
  jun: boolean;
  out_1: Presenca; out_2: Presenca;
  nov_1: Presenca; nov_2: Presenca;
  dez_1: Presenca; dez_2: Presenca;
  jan_1: Presenca; jan_2: Presenca;
  fev_1: Presenca; fev_2: Presenca;
  mar_1: Presenca; mar_2: Presenca;
  abr_1: Presenca; abr_2: Presenca;
  mai_1: Presenca; mai_2: Presenca;
  jun_1: Presenca; jun_2: Presenca;

}
