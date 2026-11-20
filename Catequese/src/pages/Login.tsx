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

// O Supabase usa códigos de 6 dígitos por omissão (pode estar configurado até 10).
const codeSchema = z.object({
  code: z.string().trim().regex(/^\d{6,10}$/, 'O código são os números que vieram no email'),
  password: z.string().min(6, 'A password deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});

type Mode = 'login' | 'forgot' | 'code';

export default function Login() {
  const { signIn, resetPassword, verifyRecoveryCode, updatePassword, session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // O código certo já inicia sessão; só se entra na app depois de mudar a password.
  useEffect(() => {
    if (session && mode === 'login') navigate('/alunos');
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
      codeSchema
    ),
    defaultValues: { email: '', password: '', confirmPassword: '', code: '' }
  });

  const irPara = (novo: Mode, email = getValues('email')) => {
    setMode(novo);
    setError(null);
    setSuccess(null);
    reset({ email, password: '', confirmPassword: '', code: '' });
  };

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

  const enviarCodigo = async (email: string) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    const message = await resetPassword(email);
    setLoading(false);
    if (message) {
      setError('Não foi possível enviar o email. Tenta daqui a uns minutos.');
      return false;
    }
    return true;
  };

  const onForgotSubmit = async (data: any) => {
    if (!(await enviarCodigo(data.email))) return;
    setEmailRecuperacao(data.email);
    irPara('code', data.email);
    setSuccess(`Se ${data.email} tiver conta, vai receber um email com um código. Veja também o spam.`);
  };

  const reenviarCodigo = async () => {
    if (await enviarCodigo(emailRecuperacao)) setSuccess('Enviámos um código novo.');
  };

  const onCodeSubmit = async (data: any) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    const codigoErro = await verifyRecoveryCode(emailRecuperacao, data.code.trim());
    if (codigoErro) {
      setLoading(false);
      setError('Código errado ou expirado. Confirme os números ou peça um código novo.');
      return;
    }
    const passwordErro = await updatePassword(data.password);
    setLoading(false);
    if (passwordErro) {
      setError('Não foi possível guardar a password nova: ' + passwordErro);
      return;
    }
    navigate('/alunos');
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
              <span className="login-link" onClick={() => irPara('forgot')}>
                Esqueci-me da password
              </span>
            </div>
          </form>
        ) : mode === 'forgot' ? (
          <form className="login-form" onSubmit={handleSubmit(onForgotSubmit, () => setError('Introduza um email válido'))}>
            <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--gray-600)', marginBottom: '8px' }}>
              Introduza o seu email para receber um código de recuperação.
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

            <button type="submit" className="button" disabled={loading}>
              {loading ? 'A enviar…' : 'Enviar código'}
            </button>

            <div className="login-footer">
              <span className="login-link" onClick={() => irPara('login')}>
                Voltar ao Login
              </span>
            </div>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleSubmit(onCodeSubmit)}>
            <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--gray-600)', marginBottom: '8px' }}>
              Escreva o código que recebeu por email e escolha a password nova.
            </p>

            <Controller
              name="code"
              control={control}
              render={({ field, fieldState }) => (
                <FormField
                  {...field}
                  label="Código do email"
                  placeholder="123456"
                  error={fieldState.error?.message}
                />
              )}
            />

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
              {loading ? 'A guardar…' : 'Guardar password e entrar'}
            </button>

            <div className="login-footer">
              <span className="login-link" onClick={reenviarCodigo}>
                Enviar outro código
              </span>
              {' · '}
              <span className="login-link" onClick={() => irPara('login', emailRecuperacao)}>
                Voltar ao Login
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
