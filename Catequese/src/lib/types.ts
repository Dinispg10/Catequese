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
  out_1: boolean; out_2: boolean;
  nov_1: boolean; nov_2: boolean;
  dez_1: boolean; dez_2: boolean;
  jan_1: boolean; jan_2: boolean;
  fev_1: boolean; fev_2: boolean;
  mar_1: boolean; mar_2: boolean;
  abr_1: boolean; abr_2: boolean;
  mai_1: boolean; mai_2: boolean;
  jun_1: boolean; jun_2: boolean;

}
