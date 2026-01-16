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
}

export default function DataTable<T>({ columns, rows, onRowClick, selectedId, getRowId }: DataTableProps<T>) {
  const tableRef = useRef<HTMLTableElement | null>(null);

  const ids = useMemo(() => rows.map((r) => getRowId(r)), [rows, getRowId]);

  const selectedIndex = useMemo(() => {
    if (!selectedId) return -1;
    return ids.indexOf(selectedId);
  }, [ids, selectedId]);

  // Opcional: quando muda seleção, tenta manter a linha visível
  useEffect(() => {
    if (!tableRef.current) return;
    if (selectedIndex < 0) return;

    const rowEl = tableRef.current.querySelectorAll('tbody tr')[selectedIndex] as HTMLTableRowElement | undefined;
    rowEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!rows.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min((selectedIndex >= 0 ? selectedIndex : -1) + 1, rows.length - 1);
      onRowClick?.(rows[nextIndex]);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max((selectedIndex >= 0 ? selectedIndex : rows.length) - 1, 0);
      onRowClick?.(rows[prevIndex]);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) onRowClick?.(rows[selectedIndex]);
    }
  };

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
