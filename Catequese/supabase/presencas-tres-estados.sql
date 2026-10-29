-- Presenças com três estados (correr UMA vez no SQL Editor do Supabase):
--   null  = por marcar (cinzento)
--   true  = presente   (verde)
--   false = falta      (vermelho)
--
-- Até agora "false" queria dizer tanto "faltou" como "ainda não marcado". Por isso
-- tudo o que estava a false passa a "por marcar"; as presenças ficam como estão.

do $$
declare
  coluna text;
begin
  foreach coluna in array array[
    'out_1', 'out_2', 'nov_1', 'nov_2', 'dez_1', 'dez_2', 'jan_1', 'jan_2', 'fev_1', 'fev_2',
    'mar_1', 'mar_2', 'abr_1', 'abr_2', 'mai_1', 'mai_2', 'jun_1', 'jun_2'
  ]
  loop
    execute format('alter table presencas_mensais add column if not exists %I boolean', coluna);
    execute format('alter table presencas_mensais alter column %I drop not null', coluna);
    execute format('alter table presencas_mensais alter column %I set default null', coluna);
    execute format('update presencas_mensais set %I = null where %I = false', coluna, coluna);
  end loop;
end $$;
