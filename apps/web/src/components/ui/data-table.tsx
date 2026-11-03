import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  header: React.ReactNode;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor?: (item: T, index: number) => string | number;
  emptyMessage?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No data available',
  className,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        'w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm',
        className,
      )}
    >
      <table className="w-full caption-bottom text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
          <tr>
            {columns.map((col, index) => (
              <th
                key={index}
                scope="col"
                className={cn('px-4 py-3 text-left font-medium', col.headerClassName)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-24 text-center text-sm text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => {
              const rowKey = keyExtractor ? keyExtractor(row, rowIndex) : rowIndex;
              return (
                <tr key={rowKey} className="transition-colors hover:bg-slate-50/70">
                  {columns.map((col, colIndex) => {
                    const content =
                      typeof col.accessor === 'function'
                        ? col.accessor(row)
                        : (row[col.accessor] as React.ReactNode);

                    return (
                      <td key={colIndex} className={cn('px-4 py-3 align-middle', col.className)}>
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
