import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Aluno, SimpleEntity } from '../lib/types';
import FormField from '../components/FormField';
import SelectField from '../components/SelectField';
import CheckboxField from '../components/CheckboxField';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';

const emptyAluno: Aluno = {
  id: '',
  nr_matricula: 0,
  ano_matricula: new Date().getFullYear(),
  paroquia_id: null,
  escola_id: null,
  centro_id: null,
  catequista_id: null,
  nome_aluno: '',
  nome_pai: null,
  nome_mae: null,
  data_nascimento: null,
  naturalidade: null,
  batizado: false,
  data_batismo: null,
  lugar_batismo: null,
  encarregado_nome: null,
  morada: null,
  localidade: null,
  codigo_postal: null,
  telemovel: null,
  email: null,
  ano_catecismo: null,
  ano_escolar: null
};

export default function Alunos() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [selected, setSelected] = useState<Aluno>(emptyAluno);
  const [paroquias, setParoquias] = useState<SimpleEntity[]>([]);
  const [escolas, setEscolas] = useState<SimpleEntity[]>([]);
  const [catequistas, setCatequistas] = useState<SimpleEntity[]>([]);
  const [centros, setCentros] = useState<SimpleEntity[]>([]);
  const [filterAno, setFilterAno] = useState<string>('');
  const [filterCatequista, setFilterCatequista] = useState<string>('');
  const [filterCentro, setFilterCentro] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const refreshTimeout = useRef<number | null>(null);

  const loadReference = async () => {
    const [
      { data: paroquiasData },
      { data: escolasData },
      { data: catequistasData },
      { data: centrosData }
    ] = await Promise.all([
      supabase.from('paroquias').select('*').order('nome'),
      supabase.from('escolas').select('*').order('nome'),
      supabase.from('catequistas').select('*').order('nome'),
      supabase.from('centros_catequese').select('*').order('nome')
    ]);

    setParoquias(paroquiasData ?? []);
    setEscolas(escolasData ?? []);
    setCatequistas(catequistasData ?? []);
    setCentros(centrosData ?? []);
  };

  const loadAlunos = async () => {
    let query = supabase.from('alunos').select('*').order('nr_matricula').order('nome_aluno');

    if (filterAno) query = query.eq('ano_matricula', Number(filterAno));
    if (filterCatequista) query = query.eq('catequista_id', filterCatequista);
    if (filterCentro) query = query.eq('centro_id', filterCentro);
    if (search.trim()) query = query.ilike('nome_aluno', `%${search.trim()}%`);

    const { data } = await query;
    setAlunos(data ?? []);
  };

  useEffect(() => {
    loadReference();
  }, []);

  useEffect(() => {
    loadAlunos();
  }, [filterAno, filterCatequista, filterCentro, search]);

  useEffect(() => {
    const channel = supabase
      .channel('alunos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alunos' },
        () => {
          if (refreshTimeout.current) window.clearTimeout(refreshTimeout.current);
          refreshTimeout.current = window.setTimeout(() => loadAlunos(), 300);
        }
      )
      .subscribe();

    return () => {
      if (refreshTimeout.current) window.clearTimeout(refreshTimeout.current);
      supabase.removeChannel(channel);
    };
  }, [filterAno, filterCatequista, filterCentro, search]);

  const handleSave = async () => {
    setStatus(null);

    if (!selected.nome_aluno.trim()) {
      setStatus('O nome do aluno é obrigatório.');
      return;
    }
    if (!selected.ano_matricula) {
      setStatus('O ano de matrícula é obrigatório.');
      return;
    }

    const payload = {
      ano_matricula: Number(selected.ano_matricula),
      paroquia_id: selected.paroquia_id,
      escola_id: selected.escola_id,
      centro_id: selected.centro_id,
      catequista_id: selected.catequista_id,
      nome_aluno: selected.nome_aluno,
      nome_pai: selected.nome_pai,
      nome_mae: selected.nome_mae,
      data_nascimento: selected.data_nascimento,
      naturalidade: selected.naturalidade,
      batizado: selected.batizado,
      data_batismo: selected.batizado ? selected.data_batismo : null,
      lugar_batismo: selected.batizado ? selected.lugar_batismo : null,
      encarregado_nome: selected.encarregado_nome,
      morada: selected.morada,
      localidade: selected.localidade,
      codigo_postal: selected.codigo_postal,
      telemovel: selected.telemovel,
      email: selected.email,
      ano_catecismo: selected.ano_catecismo ? Number(selected.ano_catecismo) : null,
      ano_escolar: selected.ano_escolar ? Number(selected.ano_escolar) : null
    };

    if (selected.id) {
      await supabase.from('alunos').update(payload).eq('id', selected.id);
      setStatus('Guardado com sucesso.');
    } else {
      const { data } = await supabase.from('alunos').insert(payload).select('*').single();
      if (data) setSelected(data as Aluno);
      setStatus('Criado com sucesso.');
    }

    window.setTimeout(() => setStatus(null), 1500);
    await loadAlunos();
  };

  const handleDelete = async () => {
    if (!selected.id) return;

    await supabase.from('alunos').delete().eq('id', selected.id);
    setSelected(emptyAluno);
    setConfirmDelete(false);
    await loadAlunos();
  };

  const catequistaOptions = useMemo(
    () => catequistas.map((item) => ({ value: item.id, label: item.nome })),
    [catequistas]
  );
  const centroOptions = useMemo(
    () => centros.map((item) => ({ value: item.id, label: item.nome })),
    [centros]
  );
  const paroquiaOptions = useMemo(
    () => paroquias.map((item) => ({ value: item.id, label: item.nome })),
    [paroquias]
  );
  const escolaOptions = useMemo(
    () => escolas.map((item) => ({ value: item.id, label: item.nome })),
    [escolas]
  );

  return (
    <div className="page">
      <header className="page-header">
        <h1>Matrículas / Alunos</h1>
        {status && <span className="alert">{status}</span>}
      </header>

      <section className="card">
        <h2>Filtros</h2>
        <div className="filters">
          <FormField label="Ano matrícula" value={filterAno} onChange={setFilterAno} type="number" />
          <SelectField
            label="Catequista"
            value={filterCatequista}
            onChange={setFilterCatequista}
            options={catequistaOptions}
            placeholder="Todos"
          />
          <SelectField
            label="Centro"
            value={filterCentro}
            onChange={setFilterCentro}
            options={centroOptions}
            placeholder="Todos"
          />
          <FormField label="Pesquisar" value={search} onChange={setSearch} placeholder="Nome do aluno" />
        </div>
      </section>

      <section className="split">
        <div className="card">
          <h2>Alunos</h2>
          <div className="card-body-scroll">
            <DataTable
              columns={[
                { key: 'nr_matricula', header: 'Nº' },
                { key: 'nome_aluno', header: 'Nome' },
                { key: 'ano_matricula', header: 'Ano' },
                {
                  key: 'catequista_id',
                  header: 'Catequista',
                  render: (row) => catequistas.find((item) => item.id === row.catequista_id)?.nome ?? '-'
                }
              ]}
              rows={alunos}
              getRowId={(row) => row.id}
              selectedId={selected.id}
              onRowClick={(row) => setSelected(row)}
            />
          </div>
        </div>

        <div className="card">
          <h2>Ficha do aluno</h2>
          <div className="card-body-scroll">
            <div className="form">
              <div className="section-title">Matrícula</div>
              <FormField label="Nº matrícula" value={selected.nr_matricula || ''} onChange={() => undefined} disabled />
              <FormField
                label="Ano matrícula"
                value={selected.ano_matricula || ''}
                onChange={(value) => setSelected({ ...selected, ano_matricula: Number(value) })}
                type="number"
                required
              />
              <SelectField
                label="Paróquia"
                value={selected.paroquia_id ?? ''}
                onChange={(value) => setSelected({ ...selected, paroquia_id: value || null })}
                options={paroquiaOptions}
                placeholder="Selecionar"
              />
              <SelectField
                label="Escola"
                value={selected.escola_id ?? ''}
                onChange={(value) => setSelected({ ...selected, escola_id: value || null })}
                options={escolaOptions}
                placeholder="Selecionar"
              />
              <SelectField
                label="Centro"
                value={selected.centro_id ?? ''}
                onChange={(value) => setSelected({ ...selected, centro_id: value || null })}
                options={centroOptions}
                placeholder="Selecionar"
              />
              <SelectField
                label="Catequista"
                value={selected.catequista_id ?? ''}
                onChange={(value) => setSelected({ ...selected, catequista_id: value || null })}
                options={catequistaOptions}
                placeholder="Selecionar"
              />

              <div className="section-title">Dados pessoais</div>
              <FormField
                label="Nome do aluno"
                value={selected.nome_aluno}
                onChange={(value) => setSelected({ ...selected, nome_aluno: value })}
                required
              />
              <div className="grid two">
                <FormField
                  label="Nome do pai"
                  value={selected.nome_pai ?? ''}
                  onChange={(value) => setSelected({ ...selected, nome_pai: value })}
                />
                <FormField
                  label="Nome da mãe"
                  value={selected.nome_mae ?? ''}
                  onChange={(value) => setSelected({ ...selected, nome_mae: value })}
                />
              </div>
              <div className="grid two">
                <FormField
                  label="Data nascimento"
                  value={selected.data_nascimento ?? ''}
                  onChange={(value) => setSelected({ ...selected, data_nascimento: value })}
                  type="date"
                />
                <FormField
                  label="Naturalidade"
                  value={selected.naturalidade ?? ''}
                  onChange={(value) => setSelected({ ...selected, naturalidade: value })}
                />
              </div>

              <CheckboxField
                label="Batizado"
                checked={selected.batizado}
                onChange={(value) => setSelected({ ...selected, batizado: value })}
              />

              {selected.batizado && (
                <div className="grid two">
                  <FormField
                    label="Data batismo"
                    value={selected.data_batismo ?? ''}
                    onChange={(value) => setSelected({ ...selected, data_batismo: value })}
                    type="date"
                  />
                  <FormField
                    label="Lugar batismo"
                    value={selected.lugar_batismo ?? ''}
                    onChange={(value) => setSelected({ ...selected, lugar_batismo: value })}
                  />
                </div>
              )}

              <div className="section-title">Contactos</div>
              <FormField
                label="Encarregado"
                value={selected.encarregado_nome ?? ''}
                onChange={(value) => setSelected({ ...selected, encarregado_nome: value })}
              />
              <FormField
                label="Morada"
                value={selected.morada ?? ''}
                onChange={(value) => setSelected({ ...selected, morada: value })}
              />
              <div className="grid two">
                <FormField
                  label="Localidade"
                  value={selected.localidade ?? ''}
                  onChange={(value) => setSelected({ ...selected, localidade: value })}
                />
                <FormField
                  label="Código postal"
                  value={selected.codigo_postal ?? ''}
                  onChange={(value) => setSelected({ ...selected, codigo_postal: value })}
                />
              </div>
              <div className="grid two">
                <FormField
                  label="Telemóvel"
                  value={selected.telemovel ?? ''}
                  onChange={(value) => setSelected({ ...selected, telemovel: value })}
                />
                <FormField
                  label="Email"
                  value={selected.email ?? ''}
                  onChange={(value) => setSelected({ ...selected, email: value })}
                />
              </div>

              <div className="section-title">Catequese</div>
              <div className="grid two">
                <FormField
                  label="Ano catecismo"
                  value={selected.ano_catecismo ?? ''}
                  onChange={(value) => setSelected({ ...selected, ano_catecismo: value ? Number(value) : null })}
                  type="number"
                />
                <FormField
                  label="Ano escolar"
                  value={selected.ano_escolar ?? ''}
                  onChange={(value) => setSelected({ ...selected, ano_escolar: value ? Number(value) : null })}
                  type="number"
                />
              </div>

              <div className="form-actions">
                <button className="button secondary" type="button" onClick={() => setSelected(emptyAluno)}>
                  Novo
                </button>
                <button className="button" type="button" onClick={handleSave}>
                  Guardar
                </button>
                <button
                  className="button danger"
                  type="button"
                  disabled={!selected.id}
                  onClick={() => setConfirmDelete(true)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="Confirmar remoção"
        description="Tem a certeza que quer apagar este aluno?"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
