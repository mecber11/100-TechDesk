import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { StatusBadge } from "./StatusBadge";

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  badge?: boolean;
};

export function DataTable<T extends object>({
  columns,
  rows,
  loading,
  error,
  empty = "Sin registros",
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  error?: boolean;
  empty?: string;
}) {
  return (
    <div className="interactive-surface overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card dark:border-white/[0.06] dark:bg-navy">
      <div className="divide-y divide-black/5 dark:divide-white/[0.05] md:hidden">
        {loading && <div className="p-5 text-sm text-slate-500">Cargando…</div>}
        {error && <div className="p-5 text-sm font-semibold text-red-600">No se pudo cargar la información.</div>}
        {!loading && !error && rows.length === 0 && <div className="p-6 text-center text-sm text-slate-500">{empty}</div>}
        {rows.map((row, index) => (
          <motion.article
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.035, 0.25) }}
            className="space-y-3 p-4 transition-colors hover:bg-cyan-50/40 dark:hover:bg-cyan-400/[0.035]"
          >
            {columns.map((column) => {
              const raw = (row as Record<string, unknown>)[column.key];
              const content = column.render ? column.render(row) : column.badge ? <StatusBadge value={String(raw ?? "")} /> : String(raw ?? "—");
              return (
                <div key={column.key} className={column.label ? "grid grid-cols-[92px_minmax(0,1fr)] items-start gap-3" : "pt-1"}>
                  {column.label && <span className="pt-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{column.label}</span>}
                  <div className="min-w-0 break-words text-sm font-semibold text-slate-700 dark:text-slate-200">{content}</div>
                </div>
              );
            })}
          </motion.article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-black/5 bg-gradient-to-r from-slate-50/90 to-cyan-50/40 text-left text-[11px] uppercase tracking-wide text-slate-500 dark:border-white/[0.06] dark:from-white/[0.035] dark:to-cyan-400/[0.025]">
            {columns.map((c) => (
              <th key={c.key} className="p-3">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td className="p-4 text-slate-500" colSpan={columns.length}>
                Cargando…
              </td>
            </tr>
          )}
          {error && (
            <tr>
              <td className="p-4 text-red-600" colSpan={columns.length}>
                No se pudo cargar la información.
              </td>
            </tr>
          )}
          {!loading && !error && rows.length === 0 && (
            <tr>
              <td className="p-4 text-slate-500" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <motion.tr
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.4) }}
              whileHover={{ x: 2 }}
              className="border-b border-black/5 transition-colors duration-200 hover:bg-cyan-50/60 dark:border-white/[0.045] dark:hover:bg-cyan-400/[0.045]"
            >
              {columns.map((c) => {
                const raw = (row as Record<string, unknown>)[c.key];
                return (
                  <td key={c.key} className="p-3 font-medium align-middle">
                    {c.render ? c.render(row) : c.badge ? <StatusBadge value={String(raw ?? "")} /> : String(raw ?? "—")}
                  </td>
                );
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
