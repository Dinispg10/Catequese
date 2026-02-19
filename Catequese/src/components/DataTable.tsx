import { useEffect, useMemo, useRef, type ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  selectedId?: string;
  getRowId: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
}

function Spinner() {
  return (
    <div className="table-state">
      <div className="spinner" />
      <span>A carregar…</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="table-state">
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
        <rect x="6" y="10" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
        <path d="M6 18h36" stroke="currentColor" strokeWidth="2" />
        <path d="M16 28h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 34h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export default function DataTable<T>({ columns, rows, onRowClick, selectedId, getRowId, loading, emptyMessage = 'Nenhum registo encontrado' }: DataTableProps<T>) {
  const tableRef = useRef<HTMLTableElement | null>(null);

  const ids = useMemo(() => rows.map((r) => getRowId(r)), [rows, getRowId]);

  const selectedIndex = useMemo(() => {
    if (!selectedId) return -1;
    return ids.indexOf(selectedId);
  }, [ids, selectedId]);

  useEffect(() => {
    if (!tableRef.current || selectedIndex < 0) return;
    const rowEl = tableRef.current.querySelectorAll('tbody tr')[selectedIndex] as HTMLTableRowElement | undefined;
    rowEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!rows.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min((selectedIndex >= 0 ? selectedIndex : -1) + 1, rows.length - 1);
      onRowClick?.(rows[nextIndex]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max((selectedIndex >= 0 ? selectedIndex : rows.length) - 1, 0);
      onRowClick?.(rows[prevIndex]);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      onRowClick?.(rows[selectedIndex]);
    }
  };

  if (loading) return <Spinner />;
  if (!rows.length) return <EmptyState message={emptyMessage} />;

  return (
    <table
      ref={tableRef}
      className="table"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Tabela de dados"
      style={{ outline: 'none' }}
    >
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const id = getRowId(row);
          const isSelected = selectedId === id;
          return (
            <tr
              key={id}
              className={isSelected ? 'selected clickable-row' : 'clickable-row'}
              onClick={() => onRowClick?.(row)}
              role="row"
              aria-selected={isSelected}
            >
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row) : (row as Record<string, ReactNode>)[column.key]}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
