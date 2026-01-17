import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SimpleEntity } from '../lib/types';
import FormField from '../components/FormField';
import SelectField from '../components/SelectField';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';

interface CentroCatequese extends SimpleEntity {
  paroquia_id: string | null;
}

const emptyEntity: SimpleEntity = { id: '', nome: '' };

export default function Definicoes() {
  const [paroquias, setParoquias] = useState<SimpleEntity[]>([]);
  const [escolas, setEscolas] = useState<SimpleEntity[]>([]);
  const [catequistas, setCatequistas] = useState<SimpleEntity[]>([]);
  const [centros, setCentros] = useState<CentroCatequese[]>([]);
  const [selectedParoquia, setSelectedParoquia] = useState<SimpleEntity>(emptyEntity);
  const [selectedEscola, setSelectedEscola] = useState<SimpleEntity>(emptyEntity);
  const [selectedCatequista, setSelectedCatequista] = useState<SimpleEntity>(emptyEntity);
  const [selectedCentro, setSelectedCentro] = useState<CentroCatequese>({ ...emptyEntity, paroquia_id: null });
  const [confirm, setConfirm] = useState<{ open: boolean; type: 'paroquia' | 'escola' | 'catequista' | 'centro' } | null>(
    null
  );
  const [status, setStatus] = useState<string | null>(null);

  const paroquiaOptions = useMemo(
    () => paroquias.map((paroquia) => ({ value: paroquia.id, label: paroquia.nome })),
    [paroquias]
  );

  const loadAll = async () => {
    const [{ data: paroquiasData }, { data: escolasData }, { data: catequistasData }, { data: centrosData }] =
      await Promise.all([
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

  useEffect(() => {
    loadAll();
  }, []);

  const handleSave = async (type: 'paroquia' | 'escola' | 'catequista' | 'centro') => {
    setStatus(null);
    if (type === 'paroquia') {
      if (!selectedParoquia.nome.trim()) {
        setStatus('O nome da paróquia é obrigatório.');
        return;
      }
      if (paroquias.some((paroquia) => paroquia.nome.toLowerCase() === selectedParoquia.nome.toLowerCase() && paroquia.id !== selectedParoquia.id)) {
        setStatus('Já existe uma paróquia com esse nome.');
        return;
      }
      if (selectedParoquia.id) {
        await supabase.from('paroquias').update({ nome: selectedParoquia.nome }).eq('id', selectedParoquia.id);
      } else {
        await supabase.from('paroquias').insert({ nome: selectedParoquia.nome });
      }
      setSelectedParoquia(emptyEntity);
    }

    if (type === 'escola') {
      if (!selectedEscola.nome.trim()) {
        setStatus('O nome da escola é obrigatório.');
        return;
      }
      if (escolas.some((escola) => escola.nome.toLowerCase() === selectedEscola.nome.toLowerCase() && escola.id !== selectedEscola.id)) {
        setStatus('Já existe uma escola com esse nome.');
        return;
      }
      if (selectedEscola.id) {
        await supabase.from('escolas').update({ nome: selectedEscola.nome }).eq('id', selectedEscola.id);
      } else {
        await supabase.from('escolas').insert({ nome: selectedEscola.nome });
      }
      setSelectedEscola(emptyEntity);
    }

    if (type === 'catequista') {
      if (!selectedCatequista.nome.trim()) {
        setStatus('O nome do catequista é obrigatório.');
        return;
      }
      if (
        catequistas.some(
          (catequista) => catequista.nome.toLowerCase() === selectedCatequista.nome.toLowerCase() && catequista.id !== selectedCatequista.id
        )
      ) {
        setStatus('Já existe um catequista com esse nome.');
        return;
      }
      if (selectedCatequista.id) {
        await supabase.from('catequistas').update({ nome: selectedCatequista.nome }).eq('id', selectedCatequista.id);
      } else {
        await supabase.from('catequistas').insert({ nome: selectedCatequista.nome });
      }
      setSelectedCatequista(emptyEntity);
    }

    if (type === 'centro') {
      if (!selectedCentro.nome.trim()) {
        setStatus('O nome do centro é obrigatório.');
        return;
      }
      if (centros.some((centro) => centro.nome.toLowerCase() === selectedCentro.nome.toLowerCase() && centro.id !== selectedCentro.id)) {
        setStatus('Já existe um centro com esse nome.');
        return;
      }
      if (selectedCentro.id) {
        await supabase.from('centros_catequese').update({ nome: selectedCentro.nome, paroquia_id: selectedCentro.paroquia_id }).eq('id', selectedCentro.id);
      } else {
        await supabase.from('centros_catequese').insert({ nome: selectedCentro.nome, paroquia_id: selectedCentro.paroquia_id });
      }
      setSelectedCentro({ ...emptyEntity, paroquia_id: null });
    }

    await loadAll();
  };

  const handleDelete = async () => {
    if (!confirm) {
      return;
    }
    if (confirm.type === 'paroquia' && selectedParoquia.id) {
      await supabase.from('paroquias').delete().eq('id', selectedParoquia.id);
      setSelectedParoquia(emptyEntity);
    }
    if (confirm.type === 'escola' && selectedEscola.id) {
      await supabase.from('escolas').delete().eq('id', selectedEscola.id);
      setSelectedEscola(emptyEntity);
    }
    if (confirm.type === 'catequista' && selectedCatequista.id) {
      await supabase.from('catequistas').delete().eq('id', selectedCatequista.id);
      setSelectedCatequista(emptyEntity);
    }
    if (confirm.type === 'centro' && selectedCentro.id) {
      await supabase.from('centros_catequese').delete().eq('id', selectedCentro.id);
      setSelectedCentro({ ...emptyEntity, paroquia_id: null });
    }
    setConfirm(null);
    await loadAll();
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Definições</h1>
        {status && <span className="alert">{status}</span>}
      </header>

      <section className="grid two">
        <div className="card">
          <h2>Paróquias</h2>
          <div className="split vertical">
            <DataTable
              columns={[{ key: 'nome', header: 'Nome' }]}
              rows={paroquias}
              getRowId={(row) => row.id}
              selectedId={selectedParoquia.id}
              onRowClick={(row) => setSelectedParoquia(row)}
            />
            <div className="form">
              <FormField label="Nome" value={selectedParoquia.nome} onChange={(value) => setSelectedParoquia({ ...selectedParoquia, nome: value })} />
              <div className="form-actions">
                <button className="button" type="button" onClick={() => setSelectedParoquia(emptyEntity)}>
                  Novo
                </button>
                <button className="button" type="button" onClick={() => handleSave('paroquia')}>
                  Guardar
                </button>
                <button
                  className="button danger"
                  type="button"
                  disabled={!selectedParoquia.id}
                  onClick={() => setConfirm({ open: true, type: 'paroquia' })}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Escolas</h2>
           <div className="split vertical">
            <DataTable
              columns={[{ key: 'nome', header: 'Nome' }]}
              rows={escolas}
              getRowId={(row) => row.id}
              selectedId={selectedEscola.id}
              onRowClick={(row) => setSelectedEscola(row)}
            />
            <div className="form">
              <FormField label="Nome" value={selectedEscola.nome} onChange={(value) => setSelectedEscola({ ...selectedEscola, nome: value })} />
              <div className="form-actions">
                <button className="button" type="button" onClick={() => setSelectedEscola(emptyEntity)}>
                  Novo
                </button>
                <button className="button" type="button" onClick={() => handleSave('escola')}>
                  Guardar
                </button>
                <button
                  className="button danger"
                  type="button"
                  disabled={!selectedEscola.id}
                  onClick={() => setConfirm({ open: true, type: 'escola' })}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Catequistas</h2>
          <div className="split vertical">
            <DataTable
              columns={[{ key: 'nome', header: 'Nome' }]}
              rows={catequistas}
              getRowId={(row) => row.id}
              selectedId={selectedCatequista.id}
              onRowClick={(row) => setSelectedCatequista(row)}
            />
            <div className="form">
              <FormField label="Nome" value={selectedCatequista.nome} onChange={(value) => setSelectedCatequista({ ...selectedCatequista, nome: value })} />
              <div className="form-actions">
                <button className="button" type="button" onClick={() => setSelectedCatequista(emptyEntity)}>
                  Novo
                </button>
                <button className="button" type="button" onClick={() => handleSave('catequista')}>
                  Guardar
                </button>
                <button
                  className="button danger"
                  type="button"
                  disabled={!selectedCatequista.id}
                  onClick={() => setConfirm({ open: true, type: 'catequista' })}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Centros de Catequese</h2>
          <div className="split vertical">
            <DataTable
              columns={[
                { key: 'nome', header: 'Nome' },
                {
                  key: 'paroquia_id',
                  header: 'Paróquia',
                  render: (row) => paroquias.find((paroquia) => paroquia.id === row.paroquia_id)?.nome ?? '-'
                }
              ]}
              rows={centros}
              getRowId={(row) => row.id}
              selectedId={selectedCentro.id}
              onRowClick={(row) => setSelectedCentro(row)}
            />
            <div className="form">
              <FormField label="Nome" value={selectedCentro.nome} onChange={(value) => setSelectedCentro({ ...selectedCentro, nome: value })} />
              <SelectField
                label="Paróquia"
                value={selectedCentro.paroquia_id ?? ''}
                onChange={(value) => setSelectedCentro({ ...selectedCentro, paroquia_id: value || null })}
                options={paroquiaOptions}
                placeholder="Sem paróquia"
              />
              <div className="form-actions">
                <button className="button" type="button" onClick={() => setSelectedCentro({ ...emptyEntity, paroquia_id: null })}>
                  Novo
                </button>
                <button className="button" type="button" onClick={() => handleSave('centro')}>
                  Guardar
                </button>
                <button
                  className="button danger"
                  type="button"
                  disabled={!selectedCentro.id}
                  onClick={() => setConfirm({ open: true, type: 'centro' })}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirm?.open ?? false}
        title="Confirmar remoção"
        description="Tem a certeza que quer apagar este registo?"
        onCancel={() => setConfirm(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
