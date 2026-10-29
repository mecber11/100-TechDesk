import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

type Configuration = {
  nombre_empresa: string;
  ia_habilitada: boolean;
  documentos_habilitados: boolean;
  slack_habilitado: boolean;
};

export function PlatformPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["platform-settings"], queryFn: () => api<Configuration>("/platform/settings") });
  const [draft, setDraft] = useState<Configuration | null>(null);
  const values = draft ?? query.data;
  const save = useMutation({
    mutationFn: (configuration: Configuration) => api<Configuration>("/platform/settings", { method: "PUT", body: JSON.stringify(configuration) }),
    onSuccess: (configuration) => {
      client.setQueryData(["platform-settings"], configuration);
      setDraft(null);
      void client.invalidateQueries({ queryKey: ["modules"] });
    },
  });
  if (query.isPending) return <p>Cargando configuración…</p>;
  if (!values) return <p role="alert">No se pudo cargar la configuración.</p>;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">Configuración de plataforma</h1><p className="mt-2 text-sm text-slate-500">Administra los módulos disponibles para esta empresa.</p></div>
      <form className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-navy" onSubmit={(event) => { event.preventDefault(); save.mutate(values); }}>
        <label className="block text-sm font-semibold">Empresa
          <input required maxLength={160} value={values.nombre_empresa} disabled={save.isPending} onChange={(event) => { setDraft({ ...values, nombre_empresa: event.target.value }); save.reset(); }} className="mt-2 w-full rounded-lg border border-slate-300 bg-transparent p-3 dark:border-white/20" />
        </label>
        {([
          ["ia_habilitada", "Asistente IA", "Asistente flotante y análisis de solicitudes."],
          ["documentos_habilitados", "Documentos", "Gestión de archivos, publicación y versiones."],
          ["slack_habilitado", "Avisos Slack", "Entrega y reintentos de avisos privados."],
        ] as const).map(([key, title, description]) => (
          <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-white/10">
            <span><span className="block font-semibold">{title}</span><span className="text-sm text-slate-500">{description}</span></span>
            <input type="checkbox" checked={values[key]} disabled={save.isPending} onChange={(event) => { setDraft({ ...values, [key]: event.target.checked }); save.reset(); }} className="h-5 w-5 accent-teal" />
          </label>
        ))}
        <p className="text-sm text-slate-500">Desactivar un módulo conserva sus datos. Pedidos, áreas y usuarios continúan disponibles.</p>
        {save.error && <p role="alert" className="text-red-500">{save.error.message}</p>}
        {save.isSuccess && <p role="status" className="text-teal">Configuración guardada.</p>}
        <button disabled={save.isPending} className="rounded-lg bg-teal px-5 py-3 font-bold text-navy disabled:opacity-50">{save.isPending ? "Guardando…" : "Guardar cambios"}</button>
      </form>
    </div>
  );
}
