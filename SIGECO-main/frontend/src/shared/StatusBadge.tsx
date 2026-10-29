const tones: Record<string, string> = {
  Borrador: "bg-slate-200 text-slate-800 dark:bg-slate-400/20 dark:text-slate-100",
  Enviado: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
  EnAtencion: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  Escalado: "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200",
  Atendido: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  Rechazado: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
  Cerrado: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
  Vigente: "bg-emerald-100 text-emerald-800",
  Obsoleto: "bg-slate-200 text-slate-600",
  Urgente: "bg-rose-100 text-rose-800",
  Alta: "bg-amber-100 text-amber-800",
  Media: "bg-sky-100 text-sky-800",
  Baja: "bg-slate-100 text-slate-600",
  Open: "bg-teal/15 text-teal-dark",
  Scheduled: "bg-sky-100 text-sky-800",
  Confirmed: "bg-emerald-100 text-emerald-800",
  InProgress: "bg-amber-100 text-amber-800",
  Paid: "bg-emerald-100 text-emerald-800",
  Issued: "bg-sky-100 text-sky-800",
  Partial: "bg-amber-100 text-amber-800",
  Reserved: "bg-indigo-100 text-indigo-800",
  Completed: "bg-navy/10 text-navy",
  New: "bg-teal/15 text-teal-dark",
  Contacted: "bg-sky-100 text-sky-800",
  Qualified: "bg-violet-100 text-violet-800",
  Won: "bg-emerald-100 text-emerald-800",
  Lost: "bg-rose-100 text-rose-800",
  InReview: "bg-amber-100 text-amber-800",
  Answered: "bg-emerald-100 text-emerald-800",
  Closed: "bg-slate-200 text-slate-700",
  Cancelled: "bg-rose-100 text-rose-800",
  Draft: "bg-slate-100 text-slate-600",
};

export function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-slate-400">—</span>;
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold leading-none ring-1 ring-inset ring-black/5 dark:ring-white/10 ${tones[value] ?? "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"}`}>
      {value}
    </span>
  );
}
