import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, X } from "lucide-react";

export function FilePreviewModal({ file, url, onClose }: { file: File; url: string; onClose: () => void }) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); onClose(); }
      if (event.key === "Tab") {
        const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button, a[href], iframe') ?? []);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", keydown, true);
    return () => {
      document.removeEventListener("keydown", keydown, true);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose]);
  const image = /\.(png|jpe?g|webp)$/i.test(file.name);
  const pdf = /\.pdf$/i.test(file.name);
  return createPortal(
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-6" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex h-[85dvh] max-h-[900px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl dark:bg-[#0b1829]">
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 p-4 dark:border-white/10 sm:px-6">
          <span className="hidden rounded-xl bg-teal/10 p-3 text-teal sm:block"><FileText size={22} /></span>
          <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Vista previa</p><h2 id={titleId} className="truncate text-sm font-bold text-navy dark:text-white sm:text-base">{file.name}</h2><p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p></div>
          <button ref={close} type="button" aria-label="Cerrar vista previa" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-rose-100 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal dark:bg-white/10 dark:text-white"><X size={22} /></button>
        </header>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-100 p-3 dark:bg-black/20 sm:p-5">
          {image ? <img src={url} alt={file.name} className="h-full w-full object-contain" />
            : pdf ? <iframe src={url} title={file.name} className="h-full w-full rounded-lg border-0 bg-white" />
            : <div className="max-w-sm space-y-3 text-center"><FileText size={48} className="mx-auto text-teal" /><p className="font-semibold text-navy dark:text-white">{file.name}</p><p className="text-sm text-slate-500">Abre este archivo con su aplicación correspondiente para ver su contenido.</p></div>}
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 dark:border-white/10 sm:px-6">
          <a href={url} download={file.name} className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-navy"><Download size={16} />Descargar</a>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5">Cerrar vista previa</button>
        </footer>
      </div>
    </div>, document.body,
  );
}
