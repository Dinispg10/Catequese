import type { ReactNode } from 'react';

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
  return (
    <table className="table">
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
          return (
            <tr
              key={id}
              className={selectedId === id ? 'selected' : ''}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : (row as Record<string, ReactNode>)[column.key]}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
