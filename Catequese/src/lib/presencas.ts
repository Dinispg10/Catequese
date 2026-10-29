import type { Presenca, PresencaMensal } from './types';

/** 1 coluna por mês, 2 sessões (quinzenas) dentro */
export const months = [
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

export type SlotKey = (typeof months)[number]['slots'][number];

export const slotKeys: SlotKey[] = months.flatMap((m) => [...m.slots]);

export const totalPresencas = (row: PresencaMensal) => slotKeys.filter((slot) => row[slot] === true).length;

/** Cada clique avança: por marcar → presente → falta → por marcar. */
export function proximaPresenca(atual: Presenca): Presenca {
  if (atual === null || atual === undefined) return true;
  return atual ? false : null;
}
