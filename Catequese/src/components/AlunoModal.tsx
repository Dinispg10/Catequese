import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Aluno, SimpleEntity } from '../lib/types';
import { opcoesAtivas } from '../lib/format';
import FormField from './FormField';
import SelectField from './SelectField';
import CheckboxField from './CheckboxField';

// Esquema de validação com Zod
const alunoSchema = z.object({
  id: z.string().optional(),
  nr_matricula: z.number().optional(),
  ano_matricula: z.coerce.number().min(1900, 'Ano inválido'),
  paroquia_id: z.string().nullable(),
  escola_id: z.string().nullable(),
  centro_id: z.string().nullable(),
  catequista_id: z.string().nullable(),
  nome_aluno: z.string().min(1, 'O nome do aluno é obrigatório'),
  nome_pai: z.string().nullable(),
  nome_mae: z.string().nullable(),
  data_nascimento: z.string().nullable(),
  naturalidade: z.string().nullable(),
  batizado: z.boolean().default(false),
  data_batismo: z.string().nullable(),
  lugar_batismo: z.string().nullable(),
  encarregado_nome: z.string().nullable(),
  morada: z.string().nullable(),
  localidade: z.string().nullable(),
  codigo_postal: z.string().nullable(),
  telemovel: z.string().nullable(),
  email: z.string().email('Email inválido').or(z.literal('')).nullable(),
  ano_catecismo: z.coerce.number().nullable(),
  ano_escolar: z.coerce.number().nullable(),
});

export type AlunoFormData = z.infer<typeof alunoSchema>;

const emptyAluno: AlunoFormData = {
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
  email: '',
  ano_catecismo: null,
  ano_escolar: null,
};

// ──────────────────────────────────────────────────────────────
// Modal do formulário do aluno
// ──────────────────────────────────────────────────────────────
interface AlunoModalProps {
  aluno: Aluno | null;
  /** O ano ativo: as fichas novas ficam nele, e as de anos anteriores levam um aviso. */
  anoAtivo: number;
  onClose: () => void;
  onSave: (data: AlunoFormData) => void;
  onDelete: () => void;
  paroquias: SimpleEntity[];
  escolas: SimpleEntity[];
  centros: SimpleEntity[];
  catequistas: SimpleEntity[];
  saving: boolean;
}

export default function AlunoModal({
  aluno, anoAtivo, onClose, onSave, onDelete,
  paroquias, escolas, centros, catequistas,
  saving,
}: AlunoModalProps) {
  const isNew = !aluno?.id;
  const anoAnterior = !isNew && aluno.ano_matricula < anoAtivo;

  const { control, handleSubmit, watch, formState: { errors } } = useForm<AlunoFormData>({
    resolver: zodResolver(alunoSchema) as any,
    defaultValues: (aluno || { ...emptyAluno, ano_matricula: anoAtivo }) as AlunoFormData,
  });

  // Só aparecem os registos ativos, mais o que a ficha já tiver (mesmo que já não esteja ativo).
  const paroquiaOptions = opcoesAtivas(paroquias, aluno?.paroquia_id);
  const escolaOptions = opcoesAtivas(escolas, aluno?.escola_id);
  const centroOptions = opcoesAtivas(centros, aluno?.centro_id);
  const catequistaOptions = opcoesAtivas(catequistas, aluno?.catequista_id);

  const isBatizado = watch('batizado');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <form 
        className="modal aluno-modal" 
        onMouseDown={(e) => e.stopPropagation()} 
        onSubmit={handleSubmit((data) => onSave(data as AlunoFormData))}
      >
        {/* Header */}
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
            {isNew ? 'Novo Aluno' : aluno?.nome_aluno || 'Editar Aluno'}
            {!isNew && <span className="edit-modal-badge">Editar</span>}
          </h3>
          <button className="modal-close-btn" onClick={onClose} type="button" aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body com scroll */}
        <div className="modal-body aluno-modal-body">
          {anoAnterior && (
            <div className="alert warning" style={{ marginBottom: 12 }}>
              Estás a editar uma matrícula de {aluno.ano_matricula}. O ano ativo é {anoAtivo}.
            </div>
          )}
          <div className="form">
            {/* Matrícula */}
            <div className="section-title">Matrícula</div>
            <div className="grid two">
              <Controller
                name="nr_matricula"
                control={control}
                render={({ field }) => (
                  <FormField label="Nº matrícula" {...field} value={field.value || ''} disabled />
                )}
              />
              <Controller
                name="ano_matricula"
                control={control}
                render={({ field }) => (
                  <FormField 
                    label="Ano matrícula" 
                    {...field} 
                    type="number" 
                    required 
                    error={errors.ano_matricula?.message}
                  />
                )}
              />
            </div>

            <div className="grid two">
              <Controller
                name="paroquia_id"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label="Paróquia"
                    {...field}
                    value={field.value ?? ''}
                    options={paroquiaOptions}
                    placeholder="Selecionar"
                  />
                )}
              />
              <Controller
                name="escola_id"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label="Escola"
                    {...field}
                    value={field.value ?? ''}
                    options={escolaOptions}
                    placeholder="Selecionar"
                  />
                )}
              />
            </div>

            <div className="grid two">
              <Controller
                name="centro_id"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label="Centro"
                    {...field}
                    value={field.value ?? ''}
                    options={centroOptions}
                    placeholder="Selecionar"
                  />
                )}
              />
              <Controller
                name="catequista_id"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label="Catequista"
                    {...field}
                    value={field.value ?? ''}
                    options={catequistaOptions}
                    placeholder="Selecionar"
                  />
                )}
              />
            </div>

            {/* Dados pessoais */}
            <div className="section-title">Dados pessoais</div>
            <Controller
              name="nome_aluno"
              control={control}
              render={({ field }) => (
                <FormField 
                  label="Nome do aluno" 
                  {...field} 
                  required 
                  error={errors.nome_aluno?.message}
                />
              )}
            />

            <div className="grid two">
              <Controller
                name="nome_pai"
                control={control}
                render={({ field }) => (
                  <FormField label="Nome do pai" {...field} value={field.value ?? ''} />
                )}
              />
              <Controller
                name="nome_mae"
                control={control}
                render={({ field }) => (
                  <FormField label="Nome da mãe" {...field} value={field.value ?? ''} />
                )}
              />
            </div>

            <div className="grid two">
              <Controller
                name="data_nascimento"
                control={control}
                render={({ field }) => (
                  <FormField label="Data nascimento" {...field} value={field.value ?? ''} type="date" />
                )}
              />
              <Controller
                name="naturalidade"
                control={control}
                render={({ field }) => (
                  <FormField label="Naturalidade" {...field} value={field.value ?? ''} />
                )}
              />
            </div>

            <Controller
              name="batizado"
              control={control}
              render={({ field }) => (
                <CheckboxField
                  label="Batizado(a)"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            {isBatizado && (
              <div className="grid two">
                <Controller
                  name="data_batismo"
                  control={control}
                  render={({ field }) => (
                    <FormField label="Data batismo" {...field} value={field.value ?? ''} type="date" />
                  )}
                />
                <Controller
                  name="lugar_batismo"
                  control={control}
                  render={({ field }) => (
                    <FormField label="Lugar batismo" {...field} value={field.value ?? ''} />
                  )}
                />
              </div>
            )}

            {/* Contactos */}
            <div className="section-title">Contactos</div>
            <Controller
              name="encarregado_nome"
              control={control}
              render={({ field }) => (
                <FormField label="Encarregado" {...field} value={field.value ?? ''} />
              )}
            />
            <Controller
              name="morada"
              control={control}
              render={({ field }) => (
                <FormField label="Morada" {...field} value={field.value ?? ''} />
              )}
            />
            <div className="grid two">
              <Controller
                name="localidade"
                control={control}
                render={({ field }) => (
                  <FormField label="Localidade" {...field} value={field.value ?? ''} />
                )}
              />
              <Controller
                name="codigo_postal"
                control={control}
                render={({ field }) => (
                  <FormField label="Código postal" {...field} value={field.value ?? ''} />
                )}
              />
            </div>
            <div className="grid two">
              <Controller
                name="telemovel"
                control={control}
                render={({ field }) => (
                  <FormField label="Telemóvel" {...field} value={field.value ?? ''} />
                )}
              />
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <FormField 
                    label="Email" 
                    {...field} 
                    value={field.value ?? ''} 
                    error={errors.email?.message}
                  />
                )}
              />
            </div>

            {/* Catequese */}
            <div className="section-title">Catequese</div>
            <div className="grid two">
              <Controller
                name="ano_catecismo"
                control={control}
                render={({ field }) => (
                  <FormField label="Ano catecismo" {...field} value={field.value ?? ''} type="number" />
                )}
              />
              <Controller
                name="ano_escolar"
                control={control}
                render={({ field }) => (
                  <FormField label="Ano escolar" {...field} value={field.value ?? ''} type="number" />
                )}
              />
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="modal-actions">
          {!isNew && (
            <button type="button" className="button danger" onClick={onDelete}>
              Eliminar
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="button" disabled={saving}>
            {saving ? 'A guardar…' : isNew ? 'Criar' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
