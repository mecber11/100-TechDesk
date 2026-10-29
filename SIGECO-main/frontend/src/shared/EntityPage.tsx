import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiList } from "../lib/api";
import { PageHeader } from "./PageHeader";
import { DataTable, type Column } from "./DataTable";

export function EntityPage<T extends object>({
  title,
  subtitle,
  endpoint,
  columns,
}: {
  title: string;
  subtitle: string;
  endpoint: string;
  columns: Column<T>[];
}) {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: [endpoint, search],
    queryFn: () => apiList<T>(endpoint, search),
  });

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <form
        className="mb-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar…"
          className="h-11 w-full flex-1 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-teal dark:border-white/10 dark:bg-navy sm:max-w-sm"
        />
        <button type="submit" className="h-11 w-full rounded-xl bg-navy px-4 text-sm font-semibold text-white hover:bg-navy/90 dark:bg-teal dark:text-navy sm:w-auto">
          Buscar
        </button>
      </form>
      <DataTable columns={columns} rows={data?.data ?? []} loading={isLoading} error={isError} />
      {data && <p className="text-xs text-slate-400 mt-3">{data.total} registro(s)</p>}
    </div>
  );
}
