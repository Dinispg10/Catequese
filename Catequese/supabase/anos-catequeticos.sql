-- Anos catequéticos (correr UMA vez no SQL Editor do Supabase).
-- Não apaga nada: só acrescenta o "ano ativo", o "ativo" nas listas e a ligação
-- entre a matrícula renovada e a do ano anterior.

-- 1. O ano ativo, igual em todos os computadores. Começa no ano mais recente com matrículas.
create table if not exists configuracao (
  id integer primary key default 1 check (id = 1),
  ano_ativo integer not null
);

insert into configuracao (id, ano_ativo)
select 1, coalesce(max(ano_matricula), extract(year from now())::integer) from alunos
on conflict (id) do nothing;

alter table configuracao enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'configuracao' and policyname = 'authenticated_select'
  ) then
    create policy "authenticated_select" on configuracao for select to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'configuracao' and policyname = 'authenticated_update'
  ) then
    create policy "authenticated_update" on configuracao for update to authenticated using (true);
  end if;
  -- Os outros computadores ficam a saber logo quando se começa um ano novo.
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'configuracao'
  ) then
    alter publication supabase_realtime add table configuracao;
  end if;
end $$;

-- 2. Catequistas, centros, escolas e paróquias podem deixar de estar ativos sem se
--    apagarem: deixam de aparecer no ano novo, mas os anos anteriores ficam intactos.
alter table catequistas add column if not exists ativo boolean not null default true;
alter table centros_catequese add column if not exists ativo boolean not null default true;
alter table escolas add column if not exists ativo boolean not null default true;
alter table paroquias add column if not exists ativo boolean not null default true;

-- 3. A matrícula renovada aponta para a do ano anterior. O índice único impede
--    renovar a mesma matrícula duas vezes.
alter table alunos add column if not exists renovada_de uuid references alunos(id) on delete set null;
create unique index if not exists alunos_renovada_de_unique on alunos(renovada_de) where renovada_de is not null;
