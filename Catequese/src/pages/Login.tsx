import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import FormField from '../components/FormField';

const loginSchema = z.object({
  email: z.string().email().min(1),
  password: z.string().min(1),
});

const forgotSchema = z.object({
  email: z.string().email().min(1),
});

const resetSchema = z.object({
  password: z.string().min(6, 'A password deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type ForgotFormData = z.infer<typeof forgotSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

export default function Login() {
  const { signIn, resetPassword, updatePassword, session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Detetar token de recuperação no URL (#access_token=...)
    if (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token=')) {
      setMode('reset');
    }
  }, []);

  useEffect(() => {
    if (session && mode !== 'reset') navigate('/alunos');
  }, [session, navigate, mode]);

  const {
    control,
    handleSubmit,
    reset,
    getValues
  } = useForm({
    resolver: zodResolver(
      mode === 'login' ? loginSchema : 
      mode === 'forgot' ? forgotSchema : 
      resetSchema
    ),
    defaultValues: { email: '', password: '', confirmPassword: '' }
  });

  const onLoginSubmit = async (data: any) => {
    setError(null);
    setLoading(true);
    const message = await signIn(data.email, data.password);
    setLoading(false);
    if (message) {
      setError('Credenciais inválidas');
      return;
    }
    navigate('/alunos');
  };

  const onForgotSubmit = async (data: any) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    const message = await resetPassword(data.email);
    setLoading(false);
    if (message) {
      setError('Ocorreu um erro ao enviar o email.');
    } else {
      setSuccess('Enviamos um link de recuperação para o seu email.');
    }
  };

  const onResetSubmit = async (data: any) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    const message = await updatePassword(data.password);
    setLoading(false);
    if (message) {
      setError('Ocorreu um erro ao atualizar a password: ' + message);
    } else {
      setSuccess('Password atualizada com sucesso! Já pode entrar.');
      setTimeout(() => {
        setMode('login');
        setSuccess(null);
        window.location.hash = ''; // Limpar o hash
      }, 3000);
    }
  };

  const toggleMode = () => {
    const currentEmail = getValues('email');
    setMode(prev => prev === 'login' ? 'forgot' : 'login');
    setError(null);
    setSuccess(null);
    // Preservar o email ao trocar de modo
    reset({ email: currentEmail, password: '', confirmPassword: '' });
  };

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
              <path d="M11 2h2v5h5v2h-5v13h-2v-13h-5v-2h5z" />
            </svg>
          </div>
          <h1>Catequese</h1>
        </div>

        {mode === 'login' ? (
          <form className="login-form" onSubmit={handleSubmit(onLoginSubmit, () => setError('Credenciais inválidas'))}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <FormField
                  {...field}
                  label="Email"
                  placeholder="o-seu@email.com"
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <FormField
                  {...field}
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                />
              )}
            />

            {error && <div className="alert">{error}</div>}

            <button type="submit" className="button" disabled={loading}>
              {loading ? 'A entrar…' : 'Entrar'}
            </button>

            <div className="login-footer">
              <span className="login-link" onClick={toggleMode}>
                Esqueci-me da password
              </span>
            </div>
          </form>
        ) : mode === 'forgot' ? (
          <form className="login-form" onSubmit={handleSubmit(onForgotSubmit, () => setError('Introduza um email válido'))}>
            <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--gray-600)', marginBottom: '8px' }}>
              Introduza o seu email para receber um link de recuperação.
            </p>
            
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <FormField
                  {...field}
                  label="Email"
                  placeholder="o-seu@email.com"
                />
              )}
            />

            {error && <div className="alert">{error}</div>}
            {success && <div className="alert info">{success}</div>}

            <button type="submit" className="button" disabled={loading}>
              {loading ? 'A enviar…' : 'Enviar Link'}
            </button>

            <div className="login-footer">
              <span className="login-link" onClick={toggleMode}>
                Voltar ao Login
              </span>
            </div>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleSubmit(onResetSubmit)}>
            <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--gray-600)', marginBottom: '8px' }}>
              Defina a sua nova password de acesso.
            </p>
            
            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => (
                <FormField
                  {...field}
                  label="Nova Password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              render={({ field, fieldState }) => (
                <FormField
                  {...field}
                  label="Confirmar Password"
                  type="password"
                  placeholder="Repita a password"
                  error={fieldState.error?.message}
                />
              )}
            />

            {error && <div className="alert">{error}</div>}
            {success && <div className="alert info">{success}</div>}

            <button type="submit" className="button" disabled={loading}>
              {loading ? 'A guardar…' : 'Guardar Nova Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
