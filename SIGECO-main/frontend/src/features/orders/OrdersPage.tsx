import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api, apiList } from "../../lib/api";
import { PageHeader } from "../../shared/PageHeader";
import { DataTable } from "../../shared/DataTable";
import { StatusBadge } from "../../shared/StatusBadge";
import { useAuth } from "../../store/auth";
import { useModules } from "../../lib/modules";
import { RequestAttachments } from "../../shared/RequestAttachments";
import {
  ArrowUpRight,
    Building2,
  CalendarDays,
  Check,
  CheckCircle2,
      ClipboardList,
  Cloud,
  Clock3,
  ExternalLink,
  Eye,
  FileText,
  Info,
  History as HistoryIcon,
  Image as ImageIcon,
    LockKeyhole,
  MessageSquareText,
  Paperclip,
  Play,
  Plus,
  RotateCcw,
  Route,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  UploadCloud,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";

type Area = { area_id: number; code: string; name: string };
type Lookups = { areas: Area[]; request_types: string[]; order_kinds: string[]; priorities: string[] };
type TicketSuggestion = { title: string; description: string; request_type: string; kind: string; priority: string; to_area_code: string | null; confidence: string; reason: string; alternatives: string[]; areas: { code: string; name: string; purpose: string }[] };
type OrderAttachment = {
  attachment_id: number;
  source: "upload" | "google_drive";
  original_name: string;
  mime_type?: string;
  size_bytes?: number;
  download_url?: string;
  external_url?: string;
  created_at: string;
  uploader?: { full_name: string; email: string };
};
type OrderHistory = {
  history_id: number;
  from_status?: string;
  to_status: string;
  note?: string;
  changed_at: string;
  changed_by?: { full_name: string; email: string };
};
type Order = {
  order_id: number;
  order_code: string;
  request_type: string;
  title: string;
  kind: string;
  priority: string;
  status: string;
  description: string;
  response_note?: string;
  escalation_reason?: string;
  created_at?: string;
  due_on?: string;
  from_area?: { name: string };
  to_area?: { name: string };
  requested_by?: { full_name: string; email: string };
  requested_by_name?: string | null;
  requested_by_email?: string | null;
  slack_status?: "pendiente" | "enviado" | "cancelado" | null;
  allowed_transitions?: string[];
  attachments?: OrderAttachment[];
  history?: OrderHistory[];
};

type TransitionDraft = { order: Order; status: string };
type DateFilterType = "all" | "day" | "month" | "year";

type ActionStyle = {
  label: string;
  tooltip?: string;
  icon: LucideIcon;
  className: string;
  layout?: string;
};

const actionStyles: Record<string, ActionStyle> = {
  Enviado: {
    label: "Enviar",
    tooltip: "Enviar solicitud",
    icon: Send,
    className:
      "border-blue-300/80 bg-gradient-to-br from-blue-50 to-cyan-100/70 text-blue-700 shadow-blue-500/10 hover:border-blue-400 hover:from-blue-100 hover:to-cyan-100 dark:border-cyan-400/25 dark:from-cyan-400/20 dark:to-blue-500/10 dark:text-cyan-100 dark:shadow-[0_0_18px_rgba(34,211,238,0.08)] dark:hover:border-cyan-300/55 dark:hover:from-cyan-400/30 dark:hover:to-blue-500/20",
  },
  EnAtencion: {
    label: "Iniciar atención",
    tooltip: "Iniciar atención de la solicitud",
    icon: Play,
    className:
      "border-sky-300/80 bg-gradient-to-br from-sky-50 to-teal-100/70 text-sky-700 shadow-sky-500/10 hover:border-sky-400 hover:from-sky-100 hover:to-teal-100 dark:border-sky-400/25 dark:from-sky-400/20 dark:to-teal-500/10 dark:text-sky-100 dark:shadow-[0_0_18px_rgba(56,189,248,0.08)] dark:hover:border-sky-300/55 dark:hover:from-sky-400/30 dark:hover:to-teal-500/20",
  },
  Escalado: {
    label: "Escalar al administrador",
    tooltip: "Escalar al administrador",
    icon: ArrowUpRight,
    className:
      "border-violet-300/80 bg-gradient-to-r from-violet-50 to-fuchsia-100/70 text-violet-700 shadow-violet-500/10 hover:border-violet-400 hover:from-violet-100 hover:to-fuchsia-100 dark:border-violet-400/25 dark:from-violet-500/20 dark:to-fuchsia-500/10 dark:text-violet-100 dark:shadow-[0_0_20px_rgba(167,139,250,0.09)] dark:hover:border-violet-300/55 dark:hover:from-violet-500/30 dark:hover:to-fuchsia-500/20",
  },
  Atendido: {
    label: "Marcar atendido",
    tooltip: "Aceptar / Marcar como atendido",
    icon: Check,
    className:
      "border-emerald-300/80 bg-gradient-to-br from-emerald-50 to-lime-100/60 text-emerald-700 shadow-emerald-500/10 hover:border-emerald-400 hover:from-emerald-100 hover:to-lime-100 dark:border-emerald-400/25 dark:from-emerald-400/20 dark:to-lime-500/10 dark:text-emerald-100 dark:shadow-[0_0_18px_rgba(52,211,153,0.08)] dark:hover:border-emerald-300/55 dark:hover:from-emerald-400/30 dark:hover:to-lime-500/20",
  },
  Rechazado: {
    label: "Rechazar",
    tooltip: "Rechazar solicitud",
    icon: X,
    className:
      "border-rose-300/80 bg-gradient-to-br from-rose-50 to-orange-100/60 text-rose-700 shadow-rose-500/10 hover:border-rose-400 hover:from-rose-100 hover:to-orange-100 dark:border-rose-400/25 dark:from-rose-400/20 dark:to-orange-500/10 dark:text-rose-100 dark:shadow-[0_0_18px_rgba(251,113,133,0.08)] dark:hover:border-rose-300/55 dark:hover:from-rose-400/30 dark:hover:to-orange-500/20",
  },
  Cerrado: {
    label: "Cerrar",
    tooltip: "Cerrar solicitud definitivamente",
    icon: LockKeyhole,
    className:
      "border-indigo-300/80 bg-gradient-to-br from-indigo-50 to-slate-100 text-indigo-700 shadow-indigo-500/10 hover:border-indigo-400 hover:from-indigo-100 hover:to-slate-200 dark:border-indigo-400/25 dark:from-indigo-400/20 dark:to-slate-500/10 dark:text-indigo-100 dark:shadow-[0_0_18px_rgba(129,140,248,0.08)] dark:hover:border-indigo-300/55 dark:hover:from-indigo-400/30 dark:hover:to-slate-500/20",
  },
};

const fallbackAction: ActionStyle = {
  label: "Actualizar",
  icon: Info,
  className:
    "border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700 hover:border-slate-400 dark:border-white/15 dark:from-white/15 dark:to-white/5 dark:text-slate-100 dark:hover:border-white/30",
};

const historyStatusStyles: Record<string, { card: string; dot: string; title: string }> = {
  Borrador: {
    card: "border-slate-300/70 bg-slate-100/70 dark:border-slate-400/15 dark:bg-slate-400/[0.07]",
    dot: "bg-slate-500 text-white dark:bg-slate-400/25 dark:text-slate-300",
    title: "text-slate-700 dark:text-slate-200",
  },
  Enviado: {
    card: "border-blue-300/60 bg-blue-50/70 dark:border-blue-400/20 dark:bg-blue-400/[0.08]",
    dot: "bg-blue-500 text-white dark:bg-blue-400/25 dark:text-blue-300",
    title: "text-blue-800 dark:text-blue-200",
  },
  EnAtencion: {
    card: "border-amber-300/60 bg-amber-50/70 dark:border-amber-400/20 dark:bg-amber-400/[0.08]",
    dot: "bg-amber-500 text-white dark:bg-amber-400/25 dark:text-amber-300",
    title: "text-amber-800 dark:text-amber-200",
  },
  Escalado: {
    card: "border-violet-300/60 bg-violet-50/70 dark:border-violet-400/20 dark:bg-violet-400/[0.08]",
    dot: "bg-violet-500 text-white dark:bg-violet-400/25 dark:text-violet-300",
    title: "text-violet-800 dark:text-violet-200",
  },
  Atendido: {
    card: "border-emerald-300/60 bg-emerald-50/70 dark:border-emerald-400/20 dark:bg-emerald-400/[0.08]",
    dot: "bg-emerald-500 text-white dark:bg-emerald-400/25 dark:text-emerald-300",
    title: "text-emerald-800 dark:text-emerald-200",
  },
  Rechazado: {
    card: "border-rose-300/60 bg-rose-50/70 dark:border-rose-400/20 dark:bg-rose-400/[0.08]",
    dot: "bg-rose-500 text-white dark:bg-rose-400/25 dark:text-rose-300",
    title: "text-rose-800 dark:text-rose-200",
  },
  Cerrado: {
    card: "border-indigo-300/60 bg-indigo-50/70 dark:border-indigo-400/20 dark:bg-indigo-400/[0.08]",
    dot: "bg-indigo-500 text-white dark:bg-indigo-400/25 dark:text-indigo-300",
    title: "text-indigo-800 dark:text-indigo-200",
  },
};

const fallbackHistoryStatusStyle = {
  card: "border-slate-200 bg-slate-50/70 dark:border-white/[0.08] dark:bg-white/[0.035]",
  dot: "bg-slate-500 text-white dark:bg-slate-400/20 dark:text-slate-300",
  title: "text-slate-800 dark:text-slate-100",
};

export function OrdersPage() {
  const [searchParams] = useSearchParams();
  const linkedTicket = searchParams.get("ticket");
  const linkedTicketQuery = useQuery({
    queryKey: ["internal-orders", "detail", linkedTicket],
    enabled: Boolean(linkedTicket && /^\d+$/.test(linkedTicket)),
    queryFn: () => api<Order>(`/internal-orders/${linkedTicket}`),
  });
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const isTI = user?.roles?.some((r) => r === "TI_Encargado" || r === "TI_Equipo");
  const isSuper = user?.roles?.some((r) => r === "Administrador_Empresa" || r === "SuperAdmin" || r === "Super_Admin");
  const modules = useModules();
  const [creationFiles, setCreationFiles] = useState<File[]>([]);
  const lookups = useQuery({ queryKey: ["lookups"], queryFn: () => api<Lookups>("/lookups") });
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>("all");
  const [dateFilterValue, setDateFilterValue] = useState("");
  const selectedYear = Number(dateFilterValue);
  const dateFilterIsValid = dateFilterType !== "year" || (/^\d{4}$/.test(dateFilterValue) && selectedYear >= 2000 && selectedYear <= 2100);
  const list = useQuery({
    queryKey: ["internal-orders", dateFilterType, dateFilterValue],
    queryFn: () => apiList<Order>("/internal-orders", "", dateFilterType === "all" || !dateFilterValue || !dateFilterIsValid ? {} : { [dateFilterType]: dateFilterValue }),
  });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<TicketSuggestion | null>(null);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [transition, setTransition] = useState<TransitionDraft | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  useEffect(() => { if (linkedTicketQuery.data) setPreviewOrder(linkedTicketQuery.data); }, [linkedTicketQuery.data]);
  const [transitionNote, setTransitionNote] = useState("");
  const [transitionFiles, setTransitionFiles] = useState<File[]>([]);
  const [driveLinks, setDriveLinks] = useState([""]);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<OrderAttachment | null>(null);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);
  const [previewAttachmentLoading, setPreviewAttachmentLoading] = useState(false);
                const [form, setForm] = useState({
    title: "",
    description: "",
    request_type: "Ticket",
    kind: "Servicio",
    priority: "Media",
    due_on: "",
    from_area_id: "",
    to_area_code: "",
  });

  function selectDateFilter(type: DateFilterType) {
    setDateFilterType(type);
    setDateFilterValue("");
  }

  function formatOrderDate(value?: string) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  }

  function formatOrderDateTime(value?: string) {
    if (!value) return "Fecha no registrada";
    return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  }

  const create = useMutation({
    mutationFn: () => {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => { if (value !== "") payload.append(key, String(value)); });
      creationFiles.forEach((file) => payload.append("attachments[]", file));
      return api("/internal-orders", {
        method: "POST",
        body: payload,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["internal-orders"] });
      qc.invalidateQueries({ queryKey: ["ops"] });
      setOpen(false);
      setCreationFiles([]);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });
  const assist = useMutation({
    mutationFn: () => api<TicketSuggestion>("/internal-orders/assist", {
      method: "POST",
      body: JSON.stringify({ description: form.description, from_area_id: form.from_area_id ? Number(form.from_area_id) : null }),
    }),
    onSuccess: (result) => { setSuggestion(result); setAssistantError(null); },
    onError: (e: Error) => setAssistantError(e.message),
  });

  const move = useMutation({
    mutationFn: ({ id, status, note, files, links }: { id: number; status: string; note?: string; files: File[]; links: string[] }) => {
      const payload = new FormData();
      payload.append("status", status);
      if (note) payload.append("note", note);
      files.forEach((file) => payload.append("attachments[]", file));
      links.filter(Boolean).forEach((link) => payload.append("drive_links[]", link));
      return api(`/internal-orders/${id}/move`, { method: "POST", body: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["internal-orders"] });
      qc.invalidateQueries({ queryKey: ["ops"] });
      closeTransition(true);
    },
    onError: (e: Error) => setTransitionError(e.message),
  });

  useEffect(() => {
    if (!transition && !previewOrder) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !move.isPending) {
        if (previewAttachment) closeAttachmentPreview();
        else if (transition) closeTransition();
        else if (previewOrder) setPreviewOrder(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [transition, previewOrder, move.isPending]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    create.mutate();
  }

  function openTransition(order: Order, status: string) {
    setTransition({ order, status });
    setTransitionNote("");
    setTransitionFiles([]);
    setDriveLinks([""]);
    setTransitionError(null);
  }

  function closeTransition(force = false) {
    if (move.isPending && !force) return;
    setTransition(null);
    setTransitionNote("");
    setTransitionFiles([]);
    setDriveLinks([""]);
    setTransitionError(null);
  }

  function submitTransition(event: FormEvent) {
    event.preventDefault();
    if (!transition || move.isPending) return;
    const note = transitionNote.trim();
    const requiresNote = ["Escalado", "Atendido", "Rechazado"].includes(transition.status);
    if (requiresNote && !note) {
      setTransitionError("Escribe un comentario para sustentar esta acción.");
      return;
    }
    setTransitionError(null);
    move.mutate({
      id: transition.order.order_id,
      status: transition.status,
      note: note || undefined,
      files: transitionFiles,
      links: driveLinks.map((link) => link.trim()).filter(Boolean),
    });
  }

  async function openAttachmentPreview(attachment: OrderAttachment) {
    if (attachment.source === "google_drive") {
      window.open(attachment.external_url ?? attachment.download_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (!attachment.download_url) return;

    setPreviewAttachment(attachment);
    setPreviewAttachmentLoading(true);

    try {
      const response = await fetch(attachment.download_url, {
        credentials: "same-origin",
        headers: { Accept: "*/*" },
      });
      if (!response.ok) {
        throw new Error("No se pudo cargar la vista previa del archivo.");
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreviewAttachmentUrl(blobUrl);
    } catch (e: unknown) {
      setTransitionError((e as Error).message);
      closeAttachmentPreview();
    } finally {
      setPreviewAttachmentLoading(false);
    }
  }

  function closeAttachmentPreview() {
    if (previewAttachmentUrl) {
      URL.revokeObjectURL(previewAttachmentUrl);
    }
    setPreviewAttachment(null);
    setPreviewAttachmentUrl(null);
    setPreviewAttachmentLoading(false);
  }

  async function downloadAttachment(attachment: OrderAttachment) {
    if (attachment.source === "google_drive") {
      window.open(attachment.external_url ?? attachment.download_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (!attachment.download_url) return;
    const response = await fetch(attachment.download_url, {
      credentials: "same-origin",
      headers: { Accept: "*/*" },
    });
    if (!response.ok) {
      setTransitionError("No se pudo descargar el archivo.");
      return;
    }
    const blobUrl = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = attachment.original_name;
    anchor.click();
    URL.revokeObjectURL(blobUrl);
  }

  return (
    <div>
      <PageHeader
        title="Pedidos y tickets"
        subtitle={user?.is_manager ? "Supervisa las solicitudes dentro de tu alcance y coordina su atención." : "Sigue tus solicitudes y atiende los pedidos y tickets recibidos por tu área."}
      />
      {linkedTicketQuery.isError && <p role="alert" className="mb-4 text-sm text-rose-600 dark:text-rose-400">No se pudo abrir el ticket del enlace. Comprueba que exista y tengas acceso.</p>}
      <div className="mb-4 flex flex-col justify-end gap-2 sm:flex-row">
        <button onClick={() => window.dispatchEvent(new CustomEvent("sigeco:open-agent"))} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-violet-300/70 bg-violet-50 px-4 text-sm font-extrabold text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200 sm:w-auto">
          <Sparkles size={17} /> Crear con agente virtual
        </button>
        <button onClick={() => setOpen((v) => !v)} className="h-11 w-full rounded-xl bg-teal px-4 text-sm font-extrabold text-navy sm:w-auto">
          {open ? "Cancelar" : "Nueva solicitud"}
        </button>
      </div>
      {open && (
        <form
          onSubmit={onSubmit}
          className="mb-8 space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card dark:border-white/10 dark:bg-navy dark:shadow-[0_20px_50px_rgba(2,8,23,0.5)] sm:p-6"
        >
          {/* Encabezado del Formulario */}
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/15 text-teal dark:bg-teal/20">
                <ClipboardList size={20} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-navy dark:text-white">Nueva Solicitud Interna</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Registra tu pedido o ticket para atención del área correspondiente.</p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-teal/25 bg-teal/5 px-3 py-1 text-xs font-bold text-teal dark:border-teal/30 dark:bg-teal/10">
              <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse" />
              Formulario directo
            </span>
          </div>

          {/* Banner Informativo de Enrutamiento */}
          <div className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 text-sky-800 dark:border-sky-400/20 dark:bg-sky-950/30 dark:text-sky-200">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-300">
              <Info size={16} />
            </div>
            <div className="text-xs sm:text-sm leading-relaxed">
              <p className="font-bold text-sky-950 dark:text-sky-100">
                {isTI ? "Destino del requerimiento" : "Derivación automática o personalizada"}
              </p>
              <p className="mt-0.5 text-xs text-sky-700/90 dark:text-sky-300/80">
                {isTI
                  ? "Elige el área responsable que recibirá el pedido. El administrador de empresa queda disponible para escalamiento."
                  : "Puedes elegir el área responsable. Si no eliges una, SIGECO enviará la solicitud al área de TI por defecto."}
              </p>
            </div>
          </div>

          {/* Áreas: Origen y Destino */}
          <div className={`grid gap-4 ${isSuper ? "md:grid-cols-2" : "grid-cols-1"}`}>
            {isSuper && (
              <label className="block space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Building2 size={14} className="text-teal" />
                  <span>Área de origen</span>
                  <span className="text-rose-500 font-bold">*</span>
                </span>
                <select
                  required
                  value={form.from_area_id}
                  onChange={(e) => setForm({ ...form, from_area_id: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-white/20 dark:focus:border-teal dark:focus:bg-navy dark:focus:ring-teal/20"
                >
                  <option value="" className="bg-white text-slate-800 dark:bg-navy dark:text-white">Seleccionar área solicitante...</option>
                  {lookups.data?.areas.map((area) => (
                    <option key={area.area_id} value={area.area_id} className="bg-white text-slate-800 dark:bg-navy dark:text-white">
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Route size={14} className="text-teal" />
                <span>Área de destino</span>
                {isTI && <span className="text-rose-500 font-bold">*</span>}
              </span>
              <select
                required={!!isTI}
                value={form.to_area_code}
                onChange={(e) => setForm({ ...form, to_area_code: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-white/20 dark:focus:border-teal dark:focus:bg-navy dark:focus:ring-teal/20"
              >
                <option value="" className="bg-white text-slate-800 dark:bg-navy dark:text-white">
                  {isTI ? "Seleccionar área..." : "TI (por defecto)"}
                </option>
                {lookups.data?.areas
                  .filter((area) => area.code !== (isSuper ? lookups.data?.areas.find((entry) => String(entry.area_id) === form.from_area_id)?.code : user?.area?.code) && area.code !== "SUPER")
                  .map((area) => (
                    <option key={area.area_id} value={area.code} className="bg-white text-slate-800 dark:bg-navy dark:text-white">
                      {area.name}
                    </option>
                  ))}
                {isTI && (
                  <option value="SUPER" className="bg-white text-slate-800 dark:bg-navy dark:text-white">
                    Administrador de empresa
                  </option>
                )}
              </select>
            </label>
          </div>

          {/* Asunto */}
          <label className="block space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <FileText size={14} className="text-teal" />
              <span>Asunto</span>
              <span className="text-rose-500 font-bold">*</span>
            </span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ej: Falla en equipo de cómputo, solicitud de acceso o soporte en red"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500 dark:hover:border-white/20 dark:focus:border-teal dark:focus:bg-navy dark:focus:ring-teal/20"
            />
          </label>

          {/* Grid de 4 clasificadores: Clase, Categoría, Prioridad, Fecha */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <ClipboardList size={14} className="text-teal" />
                <span>Clase de solicitud</span>
              </span>
              <select
                value={form.request_type}
                onChange={(e) => setForm({ ...form, request_type: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-white/20 dark:focus:border-teal dark:focus:bg-navy dark:focus:ring-teal/20"
              >
                {lookups.data?.request_types.map((type) => (
                  <option key={type} value={type} className="bg-white text-slate-800 dark:bg-navy dark:text-white">
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Building2 size={14} className="text-teal" />
                <span>Categoría</span>
              </span>
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-white/20 dark:focus:border-teal dark:focus:bg-navy dark:focus:ring-teal/20"
              >
                {lookups.data?.order_kinds.map((k) => (
                  <option key={k} value={k} className="bg-white text-slate-800 dark:bg-navy dark:text-white">
                    {k}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Clock3 size={14} className="text-teal" />
                <span>Prioridad</span>
              </span>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-white/20 dark:focus:border-teal dark:focus:bg-navy dark:focus:ring-teal/20"
              >
                {lookups.data?.priorities.map((k) => (
                  <option key={k} value={k} className="bg-white text-slate-800 dark:bg-navy dark:text-white">
                    {k}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <CalendarDays size={14} className="text-teal" />
                <span>Fecha requerida</span>
              </span>
              <input
                type="date"
                value={form.due_on}
                onChange={(e) => setForm({ ...form, due_on: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-white/20 dark:focus:border-teal dark:focus:bg-navy dark:focus:ring-teal/20"
              />
            </label>
          </div>

          {/* Detalle */}
          <label className="block space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <MessageSquareText size={14} className="text-teal" />
                <span>Detalle o descripción de la necesidad</span>
                <span className="text-rose-500 font-bold">*</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {form.description.length} caracteres
              </span>
            </div>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => {
                setForm({ ...form, description: e.target.value });
                setSuggestion(null);
              }}
              placeholder="Describe detalladamente el problema o requerimiento. Si agregas suficiente contexto, podrás usar el asistente inteligente para categorizar y enrutar la solicitud automáticamente..."
              className="min-h-[110px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-sm font-medium leading-relaxed text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500 dark:hover:border-white/20 dark:focus:border-teal dark:focus:bg-navy dark:focus:ring-teal/20"
            />
          </label>

          {/* Asistente Inteligente de Tickets */}
          <RequestAttachments files={creationFiles} onChange={setCreationFiles} disabled={create.isPending} />
          {modules.ia && <section className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/5 via-teal/5 to-transparent p-4 sm:p-5 dark:border-violet-400/20 dark:from-violet-950/20 dark:via-teal-950/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:bg-violet-400/20 dark:text-violet-300">
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-navy dark:text-white">Asistente de tickets de SIGECO</h3>
                    <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-violet-600 dark:bg-violet-400/20 dark:text-violet-300">Sugerencia IA</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                    Analiza el detalle con reglas locales y propone título, categoría, prioridad y área según sus funciones.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={assist.isPending || form.description.trim().length < 12 || (!!isSuper && !form.from_area_id)}
                onClick={() => assist.mutate()}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white shadow-md shadow-violet-600/25 transition-all hover:bg-violet-500 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              >
                <Sparkles size={15} />
                {assist.isPending ? "Analizando..." : "Analizar solicitud"}
              </button>
            </div>

            {assistantError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <XCircle size={16} className="shrink-0" />
                <span>{assistantError}</span>
              </div>
            )}

            {suggestion && (
              <div className="mt-4 space-y-3 rounded-xl border border-violet-500/20 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-navy/80">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-white/5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Destino sugerido:</span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal/15 px-2.5 py-1 text-xs font-black text-teal">
                      <Building2 size={13} />
                      {suggestion.areas.find((a) => a.code === suggestion.to_area_code)?.name ?? "Elegir manualmente"}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      confianza {suggestion.confidence}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        title: suggestion.title,
                        kind: suggestion.kind,
                        priority: suggestion.priority,
                        request_type: suggestion.request_type,
                        to_area_code: suggestion.to_area_code ?? current.to_area_code,
                      }))
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-black text-navy shadow-sm transition hover:brightness-105 active:scale-95"
                  >
                    <Check size={14} /> Aplicar propuesta
                  </button>
                </div>

                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  <strong className="text-navy dark:text-white">Fundamento: </strong>
                  {suggestion.reason}
                </p>

                <div className="grid gap-2 sm:grid-cols-3 rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-white/[0.03]">
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Propuesta de título</span>
                    <span className="font-semibold text-navy dark:text-white">{suggestion.title}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Categoría</span>
                    <span className="font-semibold text-navy dark:text-white">{suggestion.kind}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Prioridad</span>
                    <span className="font-semibold text-navy dark:text-white">{suggestion.priority}</span>
                  </div>
                </div>

                <details className="text-xs">
                  <summary className="cursor-pointer font-bold text-slate-600 dark:text-slate-400 hover:text-teal transition">
                    Funciones de cada área
                  </summary>
                  <ul className="mt-2 space-y-1 rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/[0.02]">
                    {suggestion.areas.map((area) => (
                      <li key={area.code} className="text-slate-600 dark:text-slate-300">
                        <strong className="text-navy dark:text-white">{area.name}:</strong> {area.purpose}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
          </section>

          }
          {/* Error de Envío */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-sm font-semibold text-rose-600 dark:text-rose-400">
              <XCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-navy dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal px-6 text-sm font-black text-navy shadow-lg shadow-teal/20 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
            >
              <Send size={16} />
              {create.isPending
                ? "Enviando solicitud..."
                : `Enviar solicitud a ${
                    form.to_area_code === "SUPER"
                      ? "Administrador de empresa"
                      : lookups.data?.areas.find((area) => area.code === form.to_area_code)?.name ?? (isTI ? "área" : "TI")
                  }`}
            </button>
          </div>
        </form>
      )}
      <section className="mb-4 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card dark:border-white/[0.06] dark:bg-navy">
        <div className="flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-navy dark:text-white"><CalendarDays size={18} className="text-teal" /> Historial de solicitudes</div>
            <p className="mt-1 text-xs text-slate-500">Filtra tickets y pedidos según su fecha de creación.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Ver por</span>
              <div className="grid grid-cols-4 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[0.035]">
                {([['all', 'Todo'], ['day', 'Día'], ['month', 'Mes'], ['year', 'Año']] as [DateFilterType, string][]).map(([type, label]) => (
                  <button key={type} type="button" onClick={() => selectDateFilter(type)} className={`rounded-lg px-3 py-2 text-xs font-extrabold transition ${dateFilterType === type ? "bg-navy text-white shadow-sm dark:bg-teal dark:text-navy" : "text-slate-500 hover:text-navy dark:hover:text-white"}`}>{label}</button>
                ))}
              </div>
            </div>
            {dateFilterType !== "all" && (
              <label className="block min-w-[180px]">
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{dateFilterType === "day" ? "Selecciona el día" : dateFilterType === "month" ? "Selecciona el mes" : "Escribe el año"}</span>
                <input
                  type={dateFilterType === "day" ? "date" : dateFilterType === "month" ? "month" : "number"}
                  min={dateFilterType === "year" ? "2000" : undefined}
                  max={dateFilterType === "year" ? "2100" : undefined}
                  value={dateFilterValue}
                  onChange={(event) => setDateFilterValue(event.target.value)}
                  placeholder={dateFilterType === "year" ? String(new Date().getFullYear()) : undefined}
                  className="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-navy outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/15 dark:border-white/10 dark:bg-white/[0.045] dark:text-white"
                />
              </label>
            )}
            {dateFilterType !== "all" && <button type="button" onClick={() => selectDateFilter("all")} className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-extrabold text-slate-500 transition hover:border-teal hover:text-teal dark:border-white/10"><RotateCcw size={14} /> Limpiar</button>}
          </div>
        </div>
        <div className="border-t border-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500 dark:border-white/[0.05]">
          {list.isFetching ? "Actualizando historial…" : `${list.data?.total ?? 0} solicitud${(list.data?.total ?? 0) === 1 ? "" : "es"} encontrada${(list.data?.total ?? 0) === 1 ? "" : "s"}`}
        </div>
      </section>

      <DataTable
        columns={[
          { key: "order_code", label: "Pedido" },
          { key: "created_at", label: "Fecha", render: (r: Order) => <span className="whitespace-nowrap text-xs font-bold">{formatOrderDate(r.created_at)}</span> },
          { key: "request_type", label: "Tipo" },
          { key: "title", label: "Asunto" },
          {
            key: "requested_by",
            label: "Solicitante",
            render: (r: Order) => (
              <div className="min-w-0 sm:min-w-44">
                <div className="font-semibold">{r.requested_by_name ?? r.requested_by?.full_name ?? "—"}</div>
                <div className="text-xs text-slate-500">{r.requested_by_email ?? r.requested_by?.email ?? "Sin correo"}</div>
              </div>
            ),
          },
          { key: "from_area", label: "De", render: (r: Order) => r.from_area?.name ?? "—" },
          { key: "to_area", label: "Para", render: (r: Order) => r.to_area?.name ?? "—" },
          { key: "kind", label: "Tipo" },
          { key: "priority", label: "Prioridad", render: (r: Order) => <StatusBadge value={r.priority} /> },
          { key: "status", label: "Estado", render: (r: Order) => <div><StatusBadge value={r.status} />{r.slack_status && <span className={`mt-1 block text-[10px] font-semibold ${r.slack_status === "enviado" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}>Slack: {r.slack_status}</span>}</div> },
          {
            key: "actions",
            label: "Flujo",
            render: (r: Order) => (
              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                {/* Botón Ver detalle y respuesta */}
                <div className="relative group/tooltip">
                  <button
                    type="button"
                    onClick={() => setPreviewOrder(r)}
                    aria-label="Ver detalle y respuesta"
                    title="Ver detalle y respuesta"
                    className="grid size-9 shrink-0 place-items-center rounded-xl border border-cyan-300/80 bg-gradient-to-br from-cyan-50 to-sky-100/70 text-cyan-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400 hover:from-cyan-100 hover:to-sky-100 hover:text-cyan-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-cyan-400/30 dark:from-cyan-400/20 dark:to-blue-500/10 dark:text-cyan-200 dark:shadow-[0_0_15px_rgba(34,211,238,0.1)] dark:hover:border-cyan-300/50 dark:hover:from-cyan-400/30"
                  >
                    <Eye size={17} strokeWidth={2.3} />
                  </button>
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150 translate-y-1 group-hover/tooltip:translate-y-0 z-[70]"
                  >
                    <div className="whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-bold text-white shadow-xl ring-1 ring-white/15 backdrop-blur-sm">
                      Ver detalle y respuesta
                    </div>
                    <div className="-mt-1 size-2 rotate-45 bg-slate-900/95 ring-1 ring-white/15" />
                  </div>
                </div>

                {/* Botones de acción del flujo (solo iconos + tooltips) */}
                {(r.allowed_transitions ?? []).map((status) => {
                  const action = actionStyles[status] ?? { ...fallbackAction, label: status, tooltip: status };
                  const ActionIcon = action.icon;
                  const tooltipText = action.tooltip || action.label;

                  return (
                    <div key={status} className="relative group/tooltip">
                      <button
                        type="button"
                        disabled={move.isPending}
                        onClick={() => openTransition(r, status)}
                        aria-label={tooltipText}
                        title={tooltipText}
                        className={`grid size-9 shrink-0 place-items-center rounded-xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${action.className}`}
                      >
                        <ActionIcon size={17} strokeWidth={status === "Atendido" || status === "Rechazado" ? 3 : 2.6} />
                      </button>
                      <div
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150 translate-y-1 group-hover/tooltip:translate-y-0 z-[70]"
                      >
                        <div className="whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-bold text-white shadow-xl ring-1 ring-white/15 backdrop-blur-sm">
                          {tooltipText}
                        </div>
                        <div className="-mt-1 size-2 rotate-45 bg-slate-900/95 ring-1 ring-white/15" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ),
          },
        ]}
        rows={list.data?.data ?? []}
        loading={list.isLoading}
        error={list.isError}
        empty={dateFilterType === "all" || !dateFilterValue ? "No hay pedidos ni tickets registrados." : "No hay solicitudes registradas en el período seleccionado."}
      />
      {previewOrder && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-preview-title"
          className="fixed inset-0 z-[100] flex min-h-[100dvh] items-end justify-center overflow-hidden bg-slate-950/75 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewOrder(null);
          }}
        >
          <motion.section
            initial={{ opacity: 0, y: 22, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden bg-[#f8fafc] shadow-[0_35px_110px_rgba(2,8,23,0.55)] dark:bg-[#0b1726] sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-[28px] sm:border sm:border-white/10"
          >
            <header className="relative shrink-0 overflow-hidden border-b border-slate-200 px-4 py-5 pt-[max(1rem,env(safe-area-inset-top))] dark:border-white/[0.08] sm:px-7 sm:py-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.17),transparent_34%),linear-gradient(120deg,rgba(8,47,73,0.04),rgba(99,102,241,0.05))] dark:bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.13),transparent_35%),linear-gradient(120deg,#11273b,#11182c)]" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-teal shadow-[0_10px_35px_rgba(6,182,212,0.12)] sm:size-14">
                    <ClipboardList size={25} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal">Vista previa del ticket</p>
                    <h2 id="order-preview-title" className="mt-1.5 text-xl font-black leading-tight text-navy dark:text-white sm:text-[26px]">{previewOrder.title}</h2>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg border border-slate-200 bg-white/70 px-2.5 py-1 font-mono text-[11px] font-black text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">{previewOrder.order_code}</span>
                      <StatusBadge value={previewOrder.status} />
                      <StatusBadge value={previewOrder.priority} />
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400"><CalendarDays size={13} /> {formatOrderDateTime(previewOrder.created_at)}</span>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => setPreviewOrder(null)} aria-label="Cerrar vista previa" className="grid size-10 shrink-0 place-items-center rounded-xl border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-white/70 hover:text-navy dark:hover:border-white/10 dark:hover:bg-white/[0.07] dark:hover:text-white">
                  <X size={20} />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
              <div className="grid gap-4">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.035]">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3 dark:border-white/[0.06] sm:px-5">
                    <span className="grid size-8 place-items-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-400/10 dark:text-cyan-300"><MessageSquareText size={16} /></span>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-300">Solicitud</h3>
                  </div>
                  <p className="whitespace-pre-wrap px-4 py-4 text-sm leading-7 text-slate-700 dark:text-slate-200 sm:px-5">{previewOrder.description || "Sin descripción registrada."}</p>
                </section>

                {/* Resultado o respuesta contextual */}
                {(() => {
                  const wasRejected = previewOrder.history?.some((h) => h.to_status === "Rechazado");
                  const wasAttended = previewOrder.history?.some((h) => h.to_status === "Atendido");
                  const isRechazado = previewOrder.status === "Rechazado";
                  const isAtendido = previewOrder.status === "Atendido";
                  const isCerrado = previewOrder.status === "Cerrado";

                  let title = "Resultado o respuesta";
                  let toneBorder = "border-emerald-200 dark:border-emerald-400/20";
                  let toneBg = "from-emerald-50 to-white dark:from-emerald-400/[0.08] dark:to-white/[0.025]";
                  let iconBg = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
                  let ToneIcon = CheckCircle2;

                  if (isRechazado || (isCerrado && wasRejected && !wasAttended)) {
                    title = isCerrado ? "Motivo de rechazo (solicitud cerrada)" : "Motivo de rechazo";
                    toneBorder = "border-rose-200 dark:border-rose-400/20";
                    toneBg = "from-rose-50 to-white dark:from-rose-400/[0.08] dark:to-white/[0.025]";
                    iconBg = "bg-rose-500/10 text-rose-600 dark:text-rose-300";
                    ToneIcon = XCircle;
                  } else if (isAtendido || (isCerrado && wasAttended)) {
                    title = isCerrado ? "Solución registrada (solicitud cerrada)" : "Solución o respuesta de atención";
                    toneBorder = "border-emerald-200 dark:border-emerald-400/20";
                    toneBg = "from-emerald-50 to-white dark:from-emerald-400/[0.08] dark:to-white/[0.025]";
                    iconBg = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
                    ToneIcon = CheckCircle2;
                  } else if (!previewOrder.response_note) {
                    title = "Estado de la atención";
                    toneBorder = "border-amber-200 dark:border-amber-400/20";
                    toneBg = "from-amber-50 to-white dark:from-amber-400/[0.07] dark:to-white/[0.025]";
                    iconBg = "bg-amber-500/10 text-amber-600 dark:text-amber-300";
                    ToneIcon = Clock3;
                  }

                  const resolutionEntry = previewOrder.history?.find((h) => h.to_status === "Atendido" || h.to_status === "Rechazado");
                  const responderName = resolutionEntry?.changed_by?.full_name;

                  return (
                    <section className={`overflow-hidden rounded-2xl border shadow-sm ${toneBorder} bg-gradient-to-br ${toneBg}`}>
                      <div className="flex items-center justify-between gap-3 border-b border-current/10 px-4 py-3 sm:px-5">
                        <div className="flex items-center gap-2.5">
                          <span className={`grid size-8 place-items-center rounded-xl ${iconBg}`}>
                            <ToneIcon size={17} />
                          </span>
                          <div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-300">
                              {title}
                            </h3>
                            {responderName && (
                              <p className="text-[10px] font-semibold text-slate-400">
                                Indicado por: <strong className="text-slate-700 dark:text-slate-200">{responderName}</strong>
                              </p>
                            )}
                          </div>
                        </div>
                        <StatusBadge value={previewOrder.status} />
                      </div>
                      <p className="whitespace-pre-wrap px-4 py-4 text-sm font-bold leading-7 text-slate-800 dark:text-slate-100 sm:px-5">
                        {previewOrder.response_note ? (
                          `"${previewOrder.response_note}"`
                        ) : isCerrado ? (
                          "El ticket fue cerrado sin observaciones adicionales."
                        ) : (
                          "La solicitud todavía no tiene una respuesta final registrada. El área responsable la registrará al atenderla."
                        )}
                      </p>
                      {previewOrder.escalation_reason && (
                        <p className="mx-4 mb-4 border-t border-current/10 pt-3 text-xs leading-5 text-slate-600 dark:text-slate-300 sm:mx-5">
                          <strong>Motivo de escalamiento:</strong> {previewOrder.escalation_reason}
                        </p>
                      )}
                    </section>
                  );
                })()}

                <div className="grid gap-4 lg:grid-cols-[0.86fr_1.14fr]">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-5">
                    <div className="mb-4 flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300"><Info size={16} /></span><h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-300">Datos de la orden</h3></div>
                    <dl className="grid gap-2.5">
                      {[
                        { label: "Solicitante", value: previewOrder.requested_by_name ?? previewOrder.requested_by?.full_name ?? "—", icon: UserRound },
                        { label: "Origen", value: previewOrder.from_area?.name ?? "—", icon: Building2 },
                        { label: "Destino", value: previewOrder.to_area?.name ?? "—", icon: Route },
                        { label: "Categoría", value: previewOrder.kind, icon: FileText },
                      ].map(({ label, value, icon: DetailIcon }) => (
                        <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-white/[0.05] dark:bg-white/[0.025]">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-slate-400 shadow-sm dark:bg-white/[0.06] dark:text-slate-400"><DetailIcon size={15} /></span>
                          <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-0.5 truncate text-xs font-black text-slate-800 dark:text-slate-100">{value}</dd></div>
                        </div>
                      ))}
                    </dl>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-xl bg-teal/10 text-teal"><HistoryIcon size={16} /></span><h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-300">Historial</h3></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500 dark:bg-white/[0.06]">{previewOrder.history?.length ?? 0} movimientos</span></div>
                    <div className="space-y-0">
                      {(previewOrder.history ?? []).map((entry, index, history) => {
                        const tone = historyStatusStyles[entry.to_status] ?? fallbackHistoryStatusStyle;
                        return (
                        <div key={entry.history_id} className="relative flex gap-3 pb-4 last:pb-0">
                          {index < history.length - 1 && <span className="absolute bottom-0 left-[15px] top-8 w-px bg-gradient-to-b from-slate-300/70 to-slate-200/20 dark:from-slate-500/45 dark:to-slate-600/10" />}
                          <span className={`relative z-10 mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border-4 border-white shadow-sm dark:border-[#101e2e] ${tone.dot}`}>{index === 0 ? <CheckCircle2 size={13} /> : <Clock3 size={12} />}</span>
                          <div className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 transition-colors ${tone.card}`}>
                            <div className="flex flex-wrap items-center justify-between gap-1"><p className={`text-xs font-black ${tone.title}`}>{entry.to_status}</p><span className="text-[9px] font-semibold text-slate-400">{formatOrderDateTime(entry.changed_at)}</span></div>
                            {entry.note && <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{entry.note}</p>}
                            <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-400"><UserRound size={10} /> {entry.changed_by?.full_name ?? "Sistema"}</p>
                          </div>
                        </div>
                        );
                      })}
                      {(previewOrder.history?.length ?? 0) === 0 && <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400 dark:bg-white/[0.025]">Sin movimientos registrados.</p>}
                    </div>
                  </section>
                </div>
              </div>

              {(previewOrder.attachments?.length ?? 0) > 0 && (
                <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300">
                        <Paperclip size={16} />
                      </span>
                      <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-300">
                        Evidencias y adjuntos
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {previewOrder.attachments?.length} archivos
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {previewOrder.attachments?.map((attachment) => {
                      const isImg = attachment.original_name?.match(/\.(png|jpe?g|webp|gif|svg)$/i) || attachment.mime_type?.startsWith("image/");
                      const isPdf = attachment.original_name?.toLowerCase().endsWith(".pdf") || attachment.mime_type === "application/pdf";

                      return (
                        <div
                          key={attachment.attachment_id}
                          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 p-3 transition hover:border-teal/50 hover:bg-slate-50 hover:shadow-md dark:border-white/[0.08] dark:bg-white/[0.025] dark:hover:border-teal/40"
                        >
                          <div className="flex items-start gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-teal shadow-sm dark:bg-white/[0.06] dark:text-teal">
                              {isImg ? (
                                <ImageIcon size={19} />
                              ) : isPdf ? (
                                <FileText size={19} className="text-rose-500" />
                              ) : attachment.source === "google_drive" ? (
                                <Cloud size={19} className="text-blue-500" />
                              ) : (
                                <Paperclip size={19} />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-black text-slate-800 dark:text-slate-100" title={attachment.original_name}>
                                {attachment.original_name}
                              </p>
                              <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                                {attachment.size_bytes ? `${(attachment.size_bytes / 1024).toFixed(0)} KB · ` : ""}
                                {attachment.uploader?.full_name ? `Subido por ${attachment.uploader.full_name}` : "Adjunto del ticket"}
                              </p>
                            </div>
                          </div>

                          {/* Botones de acción: Vista previa & Descargar */}
                          <div className="mt-3 flex items-center gap-2 border-t border-slate-200/60 pt-2.5 dark:border-white/[0.06]">
                            <button
                              type="button"
                              onClick={() => openAttachmentPreview(attachment)}
                              className="flex-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-teal/15 px-3 text-xs font-black text-teal transition hover:bg-teal hover:text-navy dark:bg-teal/20 dark:text-teal dark:hover:bg-teal dark:hover:text-navy"
                            >
                              <Eye size={13} />
                              <span>Vista previa</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadAttachment(attachment)}
                              title="Descargar archivo"
                              aria-label="Descargar archivo"
                              className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-200 hover:text-navy dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                            >
                              <UploadCloud size={14} className="rotate-180" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-white/[0.08] dark:bg-[#0d1c2d]/95 sm:px-6 sm:py-4">
              <p className="hidden items-center gap-2 text-[11px] font-semibold text-slate-400 sm:flex"><Clock3 size={14} /> Información actualizada según el historial del ticket</p>
              <button type="button" onClick={() => setPreviewOrder(null)} className="h-11 w-full rounded-xl bg-navy px-7 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-teal dark:text-navy sm:w-auto">Cerrar</button>
            </footer>
          </motion.section>
        </div>,
        document.body,
      )}
      {transition && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-dialog-title"
          className="fixed inset-0 z-[100] flex min-h-[100dvh] items-end justify-center overflow-hidden bg-slate-950/75 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeTransition();
          }}
        >
          <form
            onSubmit={submitTransition}
            className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-[#0d1c2d] sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:border sm:border-white/10"
          >
            <div className="flex shrink-0 items-start justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-cyan-50/60 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-white/10 dark:from-[#11263b] dark:to-cyan-950/30 sm:px-6 sm:py-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-teal/15 text-teal ring-1 ring-teal/25">
                  <MessageSquareText size={22} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal">Gestión del ticket</p>
                  <h2 id="ticket-dialog-title" className="mt-0.5 text-lg font-black text-navy dark:text-white sm:mt-1 sm:text-xl">
                    {actionStyles[transition.status]?.label ?? transition.status}
                  </h2>
                  <p className="mt-0.5 max-w-[70vw] truncate text-xs text-slate-500 dark:text-slate-400 sm:mt-1 sm:max-w-none sm:text-sm">
                    {transition.order.order_code} · {transition.order.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => closeTransition()}
                disabled={move.isPending}
                aria-label="Cerrar modal"
                className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-200/70 hover:text-navy disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 overflow-y-auto overscroll-contain lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)]">
              <div className="min-w-0 space-y-4 p-4 sm:space-y-5 sm:p-6">
                <label className="block">
                  <span className="flex items-center justify-between text-sm font-extrabold text-navy dark:text-slate-100">
                    Comentario
                    <span className="text-xs font-semibold text-slate-400">
                      {["Escalado", "Atendido", "Rechazado"].includes(transition.status) ? "Obligatorio" : "Opcional"}
                    </span>
                  </span>
                  <textarea
                    autoFocus
                    value={transitionNote}
                    onChange={(event) => setTransitionNote(event.target.value)}
                    maxLength={1000}
                    placeholder={transition.status === "Escalado" ? "Explica el motivo y el apoyo requerido del administrador de empresa..." : "Describe el trabajo realizado, acuerdos o indicaciones para el solicitante..."}
                    className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-navy outline-none transition placeholder:text-slate-400 focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-teal dark:focus:bg-white/[0.07] sm:min-h-28 sm:text-sm"
                  />
                  <span className="mt-1 block text-right text-xs text-slate-400">{transitionNote.length}/1000</span>
                </label>

                <RequestAttachments files={transitionFiles} onChange={setTransitionFiles} disabled={move.isPending} maxFiles={3} />

                <section className="rounded-2xl border border-blue-200/70 bg-blue-50/60 p-4 dark:border-blue-400/15 dark:bg-blue-400/[0.06]">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-xl bg-blue-600 text-white"><Cloud size={17} /></span>
                    <div>
                      <h3 className="text-sm font-extrabold text-blue-900 dark:text-blue-100">Google Drive</h3>
                      <p className="text-xs text-blue-700/70 dark:text-blue-200/60">Adjunta enlaces compartidos de Drive o Google Docs</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {driveLinks.map((link, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="url"
                          value={link}
                          onChange={(event) => setDriveLinks((links) => links.map((item, i) => i === index ? event.target.value : item))}
                          placeholder="https://drive.google.com/..."
                          className="h-10 min-w-0 flex-1 rounded-xl border border-blue-200 bg-white px-3 text-sm text-navy outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                        />
                        {driveLinks.length > 1 && (
                          <button type="button" onClick={() => setDriveLinks((links) => links.filter((_, i) => i !== index))} className="grid size-10 place-items-center rounded-xl text-blue-500 hover:bg-blue-100 hover:text-rose-500 dark:hover:bg-white/10" aria-label="Quitar enlace">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {driveLinks.length < 5 && (
                    <button type="button" onClick={() => setDriveLinks((links) => [...links, ""])} className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-700 hover:text-blue-900 dark:text-blue-300">
                      <Plus size={14} /> Agregar otro enlace
                    </button>
                  )}
                </section>
              </div>

              <aside className="min-w-0 border-t border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-black/10 sm:p-6 lg:border-l lg:border-t-0">
                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Actividad reciente</h3>
                <div className="mt-4 space-y-4">
                  {(transition.order.history ?? []).slice(0, 4).map((entry) => (
                    <div key={entry.history_id} className="relative border-l-2 border-teal/30 pl-4">
                      <span className="absolute -left-[5px] top-1 size-2 rounded-full bg-teal ring-4 ring-slate-50 dark:ring-[#0c1928]" />
                      <p className="text-xs font-extrabold text-navy dark:text-slate-100">{entry.to_status}</p>
                      {entry.note && <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{entry.note}</p>}
                      <p className="mt-1 text-[10px] text-slate-400">{entry.changed_by?.full_name ?? "Sistema"}</p>
                    </div>
                  ))}
                  {(transition.order.history?.length ?? 0) === 0 && <p className="text-xs text-slate-400">Sin actividad registrada.</p>}
                </div>

                {(transition.order.attachments?.length ?? 0) > 0 && (
                  <div className="mt-7">
                    <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Adjuntos existentes</h3>
                    <div className="mt-3 space-y-2">
                      {transition.order.attachments?.slice(0, 5).map((attachment) => (
                        <button
                          key={attachment.attachment_id}
                          type="button"
                          onClick={() => downloadAttachment(attachment)}
                          className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-left transition hover:border-teal/40 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-teal/40"
                        >
                          {attachment.source === "google_drive" ? <Cloud size={16} className="shrink-0 text-blue-500" /> : <Paperclip size={16} className="shrink-0 text-teal" />}
                          <span className="min-w-0 flex-1 truncate text-xs font-bold text-navy dark:text-slate-100">{attachment.original_name}</span>
                          <ExternalLink size={13} className="shrink-0 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-white/10 dark:bg-[#0d1c2d] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4">
              <div className="min-h-5">
                {transitionError && <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{transitionError}</p>}
              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                <button type="button" onClick={() => closeTransition()} disabled={move.isPending} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-extrabold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10 sm:px-5">
                  Cancelar
                </button>
                <button disabled={move.isPending} className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal to-cyan-400 px-3 text-xs font-black text-navy shadow-lg shadow-teal/15 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:min-w-44 sm:px-5 sm:text-sm">
                  {move.isPending ? "Guardando..." : actionStyles[transition.status]?.label ?? "Guardar cambio"}
                </button>
              </div>
            </div>
          </form>
        </div>,
        document.body,
      )}
      {/* Modal de Vista Previa de Archivo (Lightbox) */}
      {previewAttachment && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="attachment-preview-title"
          className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-md sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAttachmentPreview();
          }}
        >
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[#0e1726] shadow-[0_30px_100px_rgba(2,8,23,0.95)]">
            <header className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal/15 text-teal ring-1 ring-teal/20">
                  {previewAttachment.original_name?.match(/\.(png|jpe?g|webp|gif|svg)$/i) || previewAttachment.mime_type?.startsWith("image/") ? (
                    <ImageIcon size={20} />
                  ) : previewAttachment.original_name?.toLowerCase().endsWith(".pdf") || previewAttachment.mime_type === "application/pdf" ? (
                    <FileText size={20} className="text-rose-400" />
                  ) : (
                    <Paperclip size={20} />
                  )}
                </span>
                <div className="min-w-0">
                  <h3 id="attachment-preview-title" className="truncate text-sm font-black text-white">
                    {previewAttachment.original_name}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                    {previewAttachment.size_bytes ? `${(previewAttachment.size_bytes / 1024).toFixed(0)} KB · ` : ""}
                    {previewAttachment.uploader?.full_name ? `Subido por ${previewAttachment.uploader.full_name}` : "Archivo adjunto"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadAttachment(previewAttachment)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-xs font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
                >
                  <UploadCloud size={14} className="rotate-180" />
                  <span className="hidden sm:inline">Descargar</span>
                </button>
                <button
                  type="button"
                  onClick={closeAttachmentPreview}
                  aria-label="Cerrar vista previa"
                  className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <X size={19} />
                </button>
              </div>
            </header>

            <div className="flex flex-1 items-center justify-center overflow-auto p-4 sm:p-6 min-h-[300px]">
              {previewAttachmentLoading ? (
                <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
                  <span className="size-8 animate-spin rounded-full border-2 border-teal/30 border-t-teal" />
                  <span className="text-xs font-bold">Cargando vista previa...</span>
                </div>
              ) : previewAttachmentUrl ? (
                previewAttachment.original_name?.match(/\.(png|jpe?g|webp|gif|svg)$/i) || previewAttachment.mime_type?.startsWith("image/") ? (
                  <img
                    src={previewAttachmentUrl}
                    alt={previewAttachment.original_name}
                    className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
                  />
                ) : previewAttachment.original_name?.toLowerCase().endsWith(".pdf") || previewAttachment.mime_type === "application/pdf" ? (
                  <iframe
                    src={previewAttachmentUrl}
                    title={previewAttachment.original_name}
                    className="h-[75vh] w-full rounded-2xl border border-white/10 bg-white"
                  />
                ) : (
                  <div className="py-12 text-center text-slate-300">
                    <Paperclip size={48} className="mx-auto text-slate-500 mb-3" />
                    <p className="text-sm font-bold">Este tipo de archivo no cuenta con visor directo integrado.</p>
                    <button
                      type="button"
                      onClick={() => downloadAttachment(previewAttachment)}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2 text-xs font-black text-navy shadow-md"
                    >
                      Descargar archivo para ver
                    </button>
                  </div>
                )
              ) : null}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
