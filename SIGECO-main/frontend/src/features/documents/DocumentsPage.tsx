import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Archive, BookOpen, CheckCircle2, Clock3, FilePlus2, Files, Send, X } from "lucide-react";
import { api, apiList } from "../../lib/api";
import { PageHeader } from "../../shared/PageHeader";
import { DataTable } from "../../shared/DataTable";
import { StatusBadge } from "../../shared/StatusBadge";

type Area = { area_id: number; code: string; name: string };
type DocType = { doc_type_id: number; code: string; name: string };
type Lookups = { areas: Area[]; doc_types: DocType[] };
type Doc = { document_id: number; code: string; title: string; status: string; current_version: number; file_url?: string | null; type?: { name: string }; owner_area?: { name: string } };

const initialForm = { title: "", doc_type_id: "", owner_area_id: "", summary: "", body_text: "" };

export function DocumentsPage() {
  const qc = useQueryClient();
  const lookups = useQuery({ queryKey: ["lookups"], queryFn: () => api<Lookups>("/lookups") });
  const list = useQuery({ queryKey: ["documents"], queryFn: () => apiList<Doc>("/documents") });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [registryError, setRegistryError] = useState<string | null>(null);

  function clearForm() {
    setForm(initialForm);
    setFile(null);
    setError(null);
    if (fileInput.current) fileInput.current.value = "";
  }
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<Doc | null>(null);
  const [savedPreview, setSavedPreview] = useState<{ url: string; type: string } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setFilePreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    setSavedPreview(null);
    setPreviewError(null);
    if (!preview?.file_url) return;
    if (!preview.file_url.startsWith("/api/v1/documents/")) {
      setPreviewError("Este documento utiliza un enlace externo. Ábrelo para consultar el archivo.");
      return;
    }
    const controller = new AbortController();
    let objectUrl: string | undefined;
    fetch(`${preview.file_url}?preview=1`, { credentials: "same-origin", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo cargar la vista previa del documento.");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setSavedPreview({ url: objectUrl, type: blob.type });
      }).catch((error: Error) => { if (!controller.signal.aborted) setPreviewError(error.message); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [preview]);

  useEffect(() => {
    if (!preview) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setPreview(null); };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = originalOverflow; document.removeEventListener("keydown", onKeyDown); };
  }, [preview]);

  const create = useMutation({
    mutationFn: () => {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      if (file) payload.append("file", file);
      return api("/documents", { method: "POST", body: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["ops"] });
      setOpen(false);
      setForm(initialForm);
      setFile(null);
      setError(null);
    },
    onError: (caught: Error) => setError(caught.message),
  });

  const publish = useMutation({
    mutationFn: (id: number) => api(`/documents/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["ops"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => api(`/documents/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["ops"] });
      if (preview?.document_id === id) setPreview(null);
      setRegistryError(null);
    },
    onError: (caught: Error) => setRegistryError(caught.message),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    create.mutate();
  }

  const documents = list.data?.data ?? [];
  const active = documents.filter((document) => document.status === "Vigente").length;
  const drafts = documents.filter((document) => document.status === "Borrador").length;
  const fieldClass = "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-navy outline-none transition focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10 dark:border-white/10 dark:bg-white/[0.045] dark:text-white dark:focus:border-teal dark:focus:bg-white/[0.065]";

  return (
    <div>
      <PageHeader title="Documentación de la empresa" subtitle="Archivo institucional versionado · el área dueña conserva la vigencia" />

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Documentos", value: list.data?.total ?? 0, icon: Files, tone: "text-cyan-600 bg-cyan-50 dark:text-cyan-300 dark:bg-cyan-400/10" },
          { label: "Vigentes", value: active, icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-400/10" },
          { label: "Borradores", value: drafts, icon: Clock3, tone: "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-400/10" },
        ].map(({ label, value, icon: Icon, tone }, index) => <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/[0.07] dark:bg-navy"><span className={`grid size-11 place-items-center rounded-2xl ${tone}`}><Icon size={20} /></span><div><p className="text-2xl font-black text-navy dark:text-white">{value}</p><p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p></div></motion.div>)}
      </section>

      <div className="mb-4 flex justify-end">
        <button disabled={create.isPending} onClick={() => { clearForm(); setOpen((current) => !current); }} className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition sm:w-auto ${open ? "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300" : "bg-teal text-navy shadow-md shadow-cyan-500/10 hover:-translate-y-0.5"}`}>{open ? <><X size={17} /> Cerrar formulario</> : <><FilePlus2 size={17} /> Registrar documento</>}</button>
      </div>

      {open && (
        <motion.form onSubmit={onSubmit} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card dark:border-white/[0.07] dark:bg-navy">
          <div className="relative overflow-hidden border-b border-slate-200 px-5 py-5 dark:border-white/[0.07] sm:px-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_5%_0%,rgba(34,211,238,0.12),transparent_32%),linear-gradient(120deg,transparent,rgba(139,92,246,0.05))]" />
            <div className="relative flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-teal/10 text-teal ring-1 ring-teal/20"><BookOpen size={21} /></span><div><h2 className="text-base font-black text-navy dark:text-white">Nuevo documento institucional</h2><p className="mt-0.5 text-xs text-slate-500">Registra la información base; luego podrás controlar su publicación y vigencia.</p></div></div>
          </div>

          <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-2">
            <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300 md:col-span-2">Título del documento<input required className={fieldClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ej. Política de seguridad de la información" /></label>
            <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Tipo de documento<select required className={fieldClass} value={form.doc_type_id} onChange={(event) => setForm({ ...form, doc_type_id: event.target.value })}><option value="">Seleccionar tipo</option>{lookups.data?.doc_types.map((type) => <option className="dark:bg-[#142131]" key={type.doc_type_id} value={type.doc_type_id}>{type.name}</option>)}</select></label>
            <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Área responsable<select required className={fieldClass} value={form.owner_area_id} onChange={(event) => setForm({ ...form, owner_area_id: event.target.value })}><option value="">Seleccionar área</option>{lookups.data?.areas.map((area) => <option className="dark:bg-[#142131]" key={area.area_id} value={area.area_id}>{area.name}</option>)}</select></label>
            <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300 md:col-span-2">Resumen ejecutivo<input className={fieldClass} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="Describe brevemente el propósito del documento" /></label>
            <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300 md:col-span-2">Contenido<textarea className={`${fieldClass} min-h-36 resize-y py-3 leading-6`} value={form.body_text} onChange={(event) => setForm({ ...form, body_text: event.target.value })} placeholder="Escribe el contenido inicial del documento..." /></label>
            <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300 md:col-span-2">Adjuntar documento
              <input ref={fileInput} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png" disabled={create.isPending} className={`${fieldClass} h-auto py-3 file:mr-3 file:rounded-lg file:border-0 file:bg-teal/15 file:px-3 file:py-2 file:font-bold file:text-teal-dark dark:file:text-teal`} onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                if (selected && selected.size > 10 * 1024 * 1024) {
                  setError("El archivo debe pesar como máximo 10 MB.");
                  event.target.value = "";
                  setFile(null);
                  return;
                }
                setError(null);
                setFile(selected);
              }} />
              <span className="mt-2 block font-normal text-slate-500 dark:text-slate-400">Resoluciones u otros documentos en PDF, Word, Excel, PowerPoint o imagen. Máximo 10 MB. Opcional.</span>
              {file && <span className="mt-2 block text-teal-dark dark:text-teal">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB <button type="button" disabled={create.isPending} onClick={() => { setFile(null); setError(null); if (fileInput.current) fileInput.current.value = ""; }} className="ml-3 text-rose-600 hover:underline dark:text-rose-400">Quitar archivo</button></span>}
            </label>
            {file && filePreviewUrl && <div className="md:col-span-2"><p className="mb-2 text-xs font-extrabold text-slate-600 dark:text-slate-300">Vista previa · {file.name}</p><DocumentPreview url={filePreviewUrl} type={file.type} /></div>}
            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/[0.07] dark:text-rose-200 md:col-span-2">{error}</p>}
          </div>
          <div className="flex justify-end border-t border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-white/[0.07] dark:bg-white/[0.02] sm:px-6"><button disabled={create.isPending} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-navy px-6 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:opacity-50 dark:bg-teal dark:text-navy sm:w-auto">{create.isPending ? "Guardando…" : <><Archive size={17} /> Guardar en el archivo</>}</button></div>
        </motion.form>
      )}

      {registryError && <p role="alert" className="mb-4 text-sm text-rose-600 dark:text-rose-400">{registryError}</p>}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.07] dark:bg-navy">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/[0.06]"><div><h2 className="text-sm font-black text-navy dark:text-white">Archivo institucional</h2><p className="mt-0.5 text-[10px] text-slate-400">Documentos, versiones y estado de publicación</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500 dark:bg-white/[0.06]">{list.data?.total ?? 0} registros</span></div>
        <DataTable columns={[{ key: "code", label: "Código" }, { key: "title", label: "Documento" }, { key: "type", label: "Tipo", render: (row: Doc) => row.type?.name ?? "—" }, { key: "owner_area", label: "Área", render: (row: Doc) => row.owner_area?.name ?? "—" }, { key: "file_url", label: "Archivo", render: (row: Doc) => row.file_url ? <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => setPreview(row)} className="font-bold text-teal-dark hover:underline dark:text-teal">Vista previa</button><a href={row.file_url} target="_blank" rel="noreferrer" className="font-bold text-teal-dark hover:underline dark:text-teal">Descargar documento</a></div> : <span className="text-xs text-slate-400">Sin adjunto</span> }, { key: "current_version", label: "Versión", render: (row: Doc) => <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">v{row.current_version}</span> }, { key: "status", label: "Estado", render: (row: Doc) => <StatusBadge value={row.status} /> }, { key: "actions", label: "Acción", render: (row: Doc) => <div className="flex flex-wrap gap-2">{row.status === "Borrador" && <button onClick={() => publish.mutate(row.document_id)} disabled={publish.isPending} className="inline-flex items-center gap-1.5 rounded-lg border border-teal/30 bg-teal/10 px-3 py-2 text-xs font-black text-teal-dark transition hover:bg-teal hover:text-navy disabled:opacity-50 dark:text-teal"><Send size={13} /> Publicar</button>}<button type="button" disabled={remove.isPending} onClick={() => { if (window.confirm(`¿Eliminar el documento "${row.title}" y sus archivos?`)) remove.mutate(row.document_id); }} className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-400">Eliminar</button></div> }]} rows={documents} loading={list.isLoading} error={list.isError} empty="Aún no hay documentos institucionales." />
      </section>
      {preview && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6" onClick={() => setPreview(null)}>
          <section role="dialog" aria-modal="true" aria-label={`Vista previa: ${preview.title}`} className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-navy" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-white/10"><h2 className="font-bold text-navy dark:text-white">{preview.title}</h2><button autoFocus type="button" aria-label="Cerrar vista previa" onClick={() => setPreview(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X size={20} /></button></div>
            <div className="overflow-auto p-4">{previewError ? <p role="alert" className="text-sm text-slate-500">{previewError}</p> : savedPreview ? <DocumentPreview url={savedPreview.url} type={savedPreview.type} /> : <p className="text-sm text-slate-500">Cargando vista previa…</p>}</div>
            <div className="border-t border-slate-200 p-4 dark:border-white/10"><a href={preview.file_url ?? undefined} target="_blank" rel="noreferrer" className="font-bold text-teal-dark hover:underline dark:text-teal">Descargar documento</a></div>
          </section>
        </div>, document.body
      )}
    </div>
  );
}

function DocumentPreview({ url, type }: { url: string; type: string }) {
  if (type === "application/pdf") return <iframe title="Vista previa del documento PDF" src={url} className="h-[60vh] min-h-80 w-full rounded-xl border border-slate-200 bg-white" />;
  if (["image/jpeg", "image/png"].includes(type)) return <img src={url} alt="Vista previa del documento adjunto" className="mx-auto max-h-[60vh] max-w-full rounded-xl object-contain" />;
  return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-400">La vista previa está disponible para PDF e imágenes. Descarga este archivo para abrirlo en su aplicación.</p>;
}
