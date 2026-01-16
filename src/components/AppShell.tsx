import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function AppShell() {
  const { signOut } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-title">Catequese</div>
        <nav className="nav">
          <NavLink to="/alunos" className={({ isActive }) => (isActive ? 'active' : '')}>
            Matrículas/Alunos
          </NavLink>
          <NavLink to="/definicoes" className={({ isActive }) => (isActive ? 'active' : '')}>
            Definições
          </NavLink>
          <NavLink to="/presencas" className={({ isActive }) => (isActive ? 'active' : '')}>
            Mapa de Presenças
          </NavLink>
          <NavLink to="/listagens" className={({ isActive }) => (isActive ? 'active' : '')}>
            Listagens
          </NavLink>
        </nav>
        <button className="button secondary" onClick={signOut} type="button">
          Terminar sessão
        </button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
