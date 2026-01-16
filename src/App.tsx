import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Alunos from './pages/Alunos';
import Definicoes from './pages/Definicoes';
import Presencas from './pages/Presencas';
import Listagens from './pages/Listagens';
import AppShell from './components/AppShell';
import { useAuth } from './lib/auth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return <div className="page">A carregar...</div>;
  }
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/alunos" replace />} />
        <Route path="alunos" element={<Alunos />} />
        <Route path="definicoes" element={<Definicoes />} />
        <Route path="presencas" element={<Presencas />} />
        <Route path="listagens" element={<Listagens />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
