import type { Presenca } from '../lib/types';
import { proximaPresenca } from '../lib/presencas';

function estado(valor: Presenca) {
  if (valor === true) return 'presente';
  if (valor === false) return 'falta';
  return 'vazio';
}

const titulos = {
  presente: 'Presente — clique para marcar falta',
  falta: 'Falta — clique para limpar',
  vazio: 'Por marcar — clique para marcar presença'
};

function Icone({ valor }: { valor: Presenca }) {
  if (valor === true) {
    return (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2.5 8 6 11.5 13.5 4" />
      </svg>
    );
  }
  if (valor === false) {
    return (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="5" x2="11" y2="11" /><line x1="11" y1="5" x2="5" y2="11" />
      </svg>
    );
  }
  return null;
}

/** Quadrado de uma sessão. Com `onChange` é um botão; sem ele, só mostra (listagens). */
export default function PresencaCell({ valor, onChange }: { valor: Presenca; onChange?: (valor: Presenca) => void }) {
  const className = `presenca-cell presenca-cell--${estado(valor)}`;

  if (!onChange) {
    return (
      <span className={`${className} presenca-cell--tiny`}>
        <Icone valor={valor} />
      </span>
    );
  }

  return (
    <button type="button" className={className} onClick={() => onChange(proximaPresenca(valor))} title={titulos[estado(valor)]}>
      <Icone valor={valor} />
    </button>
  );
}
