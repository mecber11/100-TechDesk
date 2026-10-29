import { useEffect, useState } from "react";
import { FilePreviewModal } from "./FilePreviewModal";

export function RequestAttachments({ files, onChange, disabled = false, maxFiles = 5 }: { files: File[]; onChange: (files: File[]) => void; disabled?: boolean; maxFiles?: number }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const next = files.map((file) => URL.createObjectURL(file));
    setUrls(next);
    setSelected(null);
    return () => next.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);
  function add(next: File[]) {
    if (files.length + next.length > maxFiles) { setError(`Puedes adjuntar hasta ${maxFiles} archivos.`); return; }
    if (next.some((file) => file.size > 10 * 1024 * 1024)) { setError("Cada archivo debe pesar como máximo 10 MB."); return; }
    if (next.some((file) => !/\.(pdf|docx?|xlsx?|pptx?|txt|csv|jpe?g|png|webp)$/i.test(file.name))) { setError("Selecciona imágenes, PDF, documentos Office, TXT o CSV."); return; }
    setError("");
    onChange([...files, ...next]);
  }
  const preview = selected !== null ? files[selected] : null;
  const url = selected !== null ? urls[selected] : undefined;
  return <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
    <label className="block text-sm font-bold">Archivos adjuntos
      <input className="mt-2 block w-full text-sm" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp" disabled={disabled || files.length >= maxFiles} onChange={(event) => { add(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    </label>
    <p className="text-xs text-slate-500">Hasta {maxFiles} archivos de 10 MB cada uno. Imágenes, PDF, Word, Excel, PowerPoint, TXT y CSV.</p>
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    {files.map((file, index) => <div key={index} className="flex items-center gap-3 rounded-lg bg-slate-50 p-2 dark:bg-white/5">
      {/\.(png|jpe?g|webp)$/i.test(file.name) && urls[index] && <img src={urls[index]} alt={file.name} className="h-12 w-12 rounded object-cover" />}
      <span className="min-w-0 flex-1"><span className="block truncate text-sm">{file.name}</span><span className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</span></span>
      <button type="button" className="text-xs font-bold text-teal" onClick={() => setSelected(index)}>Previsualizar</button>
      <button type="button" disabled={disabled} aria-label={`Quitar ${file.name}`} className="text-xs text-red-500" onClick={() => { setError(""); onChange(files.filter((_, item) => item !== index)); }}>Quitar</button>
    </div>)}
    {preview && url && <FilePreviewModal file={preview} url={url} onClose={() => setSelected(null)} />}
  </section>;
}
