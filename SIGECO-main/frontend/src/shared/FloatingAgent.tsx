import { useState, useEffect, useRef, useCallback, FormEvent } from "react";
import { createPortal } from "react-dom";
import { FilePreviewModal } from "./FilePreviewModal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  X,
  ImagePlus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Send,
  Building2,
  AlertCircle,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

type Area = { area_id: number; code: string; name: string };
type Lookups = { areas: Area[]; request_types: string[]; order_kinds: string[]; priorities: string[] };

type TicketSuggestion = {
  title: string;
  description: string;
  request_type: string;
  kind: string;
  priority: string;
  to_area_code: string | null;
  confidence: string;
  reason: string;
  alternatives: string[];
  areas: { code: string; name: string; purpose: string }[];
};

type CreatedOrder = {
  order_id: number;
  order_code: string;
  title: string;
  kind: string;
  priority: string;
  status: string;
  to_area?: { name: string; code?: string };
  from_area?: { name: string; code?: string };
};

type AgentEvidence = {
  file: File;
  previewUrl: string;
};

const QUICK_TAGS = [
  { label: "Cronogramas en web", text: "necesito que actualicen cronogramas en la pagina web" },
  { label: "Diseño de portadas", text: "necesito diseñar una portada y mejorar los marcos de imagen" },
  { label: "Soporte de correos", text: "solicito ayuda y soporte con el correo corporativo y acceso a la intranet" },
  { label: "Acceso / Contraseña", text: "tengo problemas de acceso al sistema con mi usuario y contraseña" },
  { label: "Error en pantalla", text: "aparece un error en pantalla al intentar realizar la operación" },
  { label: "Compras / Insumos", text: "solicitud de compra de útiles de oficina y reposición de insumos" },
  { label: "Facturación / Pagos", text: "solicito emisión de factura y regularización de comprobantes de pago" },
  { label: "Personal / RRHH", text: "solicitud de trámite de vacaciones y consulta de asistencia laboral" },
];

export function FloatingAgent() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);

  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [problem, setProblem] = useState("");
  const [originAreaId, setOriginAreaId] = useState("");
  const [selectedDestinationCode, setSelectedDestinationCode] = useState("");
  const [evidenceList, setEvidenceList] = useState<AgentEvidence[]>([]);
  const [previewEvidence, setPreviewEvidence] = useState<File | null>(null);
  const [previewEvidenceUrl, setPreviewEvidenceUrl] = useState("");
  useEffect(() => {
    if (!previewEvidence) { setPreviewEvidenceUrl(""); return; }
    const url = URL.createObjectURL(previewEvidence);
    setPreviewEvidenceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewEvidence]);
  useEffect(() => { if (!isOpen) setPreviewEvidence(null); }, [isOpen]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    order: CreatedOrder;
    suggestion: TicketSuggestion;
  } | null>(null);

  const isSuper = user?.roles?.some((r) => r === "Administrador_Empresa" || r === "SuperAdmin" || r === "Super_Admin");
  const isTI = user?.roles?.some((r) => r === "TI_Encargado" || r === "TI_Equipo");

  const lookups = useQuery({
    queryKey: ["lookups"],
    queryFn: () => api<Lookups>("/lookups"),
    staleTime: 5 * 60 * 1000,
  });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-enfocar el textarea al abrir
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escuchar evento personalizado sigeco:open-agent desde cualquier botón de la app
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
    };
    window.addEventListener("sigeco:open-agent", handleOpen);
    return () => window.removeEventListener("sigeco:open-agent", handleOpen);
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !autoCreateMutation.isPending) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Agregar archivos
  const addFiles = useCallback((files: File[]) => {
    if (files.some((file) => file.size > 10 * 1024 * 1024 || !/\.(pdf|docx?|xlsx?|pptx?|txt|csv|jpe?g|png|webp)$/i.test(file.name))) {
      setErrorMessage("Adjunta imágenes, PDF, Office, TXT o CSV de hasta 10 MB por archivo.");
      return;
    }
    setEvidenceList((prev) => {
      const remainingSlots = Math.max(0, 5 - prev.length);
      const validFiles = files
        .filter((f) => /\.(pdf|docx?|xlsx?|pptx?|txt|csv|jpe?g|png|webp)$/i.test(f.name) && f.size <= 10 * 1024 * 1024)
        .slice(0, remainingSlots);

      const newEvidences = validFiles.map((file) => ({
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      }));

      return [...prev, ...newEvidences];
    });
  }, []);

  // Pegar capturas de pantalla directamente con Ctrl + V
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            const namedFile = new File([file], `captura_${Date.now()}.png`, { type: file.type });
            pastedFiles.push(namedFile);
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        addFiles(pastedFiles);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, addFiles]);

  const removeEvidence = (index: number) => {
    setEvidenceList((prev) => {
      const item = prev[index];
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleClose = () => {
    evidenceList.forEach((ev) => ev.previewUrl && URL.revokeObjectURL(ev.previewUrl));
    setIsOpen(false);
    setIsHovered(false);
    setProblem("");
    setOriginAreaId("");
    setSelectedDestinationCode("");
    setEvidenceList([]);
    setErrorMessage(null);
    setCreatedResult(null);
  };

  // 1-Click Auto-Submit: Clasifica internamente y crea el ticket en un solo paso
  const autoCreateMutation = useMutation({
    mutationFn: async () => {
      if (problem.trim().length < 10) {
        throw new Error("Por favor describe el requerimiento o problema con al menos 10 caracteres.");
      }
      if (isSuper && !originAreaId) {
        throw new Error("Como administrador de empresa debes seleccionar el área de origen.");
      }

      // Paso 1: Clasificación con IA interna
      const evidenceNames = evidenceList.map((e) => e.file.name);
      const suggestion = await api<TicketSuggestion>("/internal-orders/assist", {
        method: "POST",
        body: JSON.stringify({
          description: problem.trim(),
          from_area_id: originAreaId ? Number(originAreaId) : null,
          preferred_area_code: selectedDestinationCode || null,
          evidence_names: evidenceNames,
        }),
      });

      const targetAreaCode = selectedDestinationCode || suggestion.to_area_code || "TI";

      // Paso 2: Creación directa del ticket con los datos clasificados
      const formData = new FormData();
      formData.append("title", suggestion.title || problem.trim().slice(0, 100));
      formData.append("description", problem.trim());
      formData.append("request_type", suggestion.request_type || "Ticket");
      formData.append("kind", suggestion.kind || "Servicio");
      formData.append("priority", suggestion.priority || "Media");
      formData.append("to_area_code", targetAreaCode);

      if (originAreaId) {
        formData.append("from_area_id", originAreaId);
      }

      evidenceList.forEach(({ file }) => {
        formData.append("attachments[]", file);
      });

      const createdOrder = await api<CreatedOrder>("/internal-orders", {
        method: "POST",
        body: formData,
      });

      return { order: createdOrder, suggestion };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["internal-orders"] });
      qc.invalidateQueries({ queryKey: ["ops"] });
      setCreatedResult(data);
      setErrorMessage(null);
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "No se pudo clasificar y crear el ticket. Intenta de nuevo.");
    },
  });

  const getAreaName = (code: string) => {
    const area = lookups.data?.areas?.find((a) => a.code === code);
    return area ? area.name : code;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    autoCreateMutation.mutate();
  };

  return (
    <>
      {/* Botón Flotante Permanente */}
      {typeof document !== "undefined" &&
        createPortal(
          <aside
            aria-label="Asistente virtual"
            style={{
              position: "fixed",
              bottom: "24px",
              right: "24px",
              zIndex: 9999,
            }}
            onMouseLeave={() => setIsHovered(false)}
            className="pointer-events-none flex items-center gap-3 select-none"
          >
            {/* Mensaje que solo se muestra cuando el mouse toca el rango del agente */}
            {!isOpen && isHovered && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsHovered(false);
                  setIsOpen(true);
                }}
                className="pointer-events-auto flex cursor-pointer items-center gap-2.5 rounded-full border border-violet-400/35 bg-[#0e1726]/95 px-4 py-2.5 text-xs font-bold text-violet-200 shadow-[0_8px_30px_rgba(124,58,237,0.3)] backdrop-blur-md transition-all duration-300 ease-out hover:border-violet-400/70 hover:bg-[#142036] hover:scale-105 hover:shadow-[0_12px_40px_rgba(124,58,237,0.45)]"
              >
                <Sparkles size={15} className="text-violet-400" />
                <span className="font-extrabold tracking-wide text-white">¿Necesitas ayuda?</span>
                <span className="text-violet-300/80">Crear ticket con IA</span>
              </button>
            )}

            {/* Botón Principal del Agente */}
            <button
              type="button"
              onMouseEnter={() => setIsHovered(true)}
              onClick={(e) => {
                e.stopPropagation();
                setIsHovered(false);
                if (isOpen) {
                  handleClose();
                } else {
                  setIsOpen(true);
                }
              }}
              aria-label={isOpen ? "Cerrar asistente virtual" : "Abrir asistente virtual de SIGECO"}
              title={isOpen ? "Cerrar asistente" : "Asistente Virtual SIGECO"}
              className={`pointer-events-auto relative flex cursor-pointer items-center justify-center text-white transition-all duration-300 hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal/40 ${isOpen ? "size-14 rounded-2xl bg-slate-800 shadow-lg" : "h-24 w-20 rounded-2xl"}`}
            >
              {isOpen ? (
                <X size={26} className="transition-transform duration-200" />
              ) : (
                <>
                  <img src="/branding/asistente-oso.png?v=2" alt="" draggable={false} className="h-full w-full object-contain drop-shadow-[0_5px_8px_rgba(0,0,0,0.35)]" />
                  <span className="absolute -top-1 -right-1 flex size-3.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-3.5 rounded-full border-2 border-[#0b1726] bg-emerald-500" />
                  </span>
                </>
              )}
            </button>
          </aside>,
          document.body,
        )}

      {/* Ventana Flotante Pequeña Anclada en la Esquina */}
      {typeof document !== "undefined" &&
        isOpen &&
        createPortal(
          <>
            {/* Fondo transparente para cerrar al hacer clic afuera (no bloquea la visibilidad de la pantalla) */}
            <div
              className="fixed inset-0 z-[9998] bg-black/15 sm:bg-transparent"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && !autoCreateMutation.isPending) {
                  handleClose();
                }
              }}
            />

            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="agent-modal-title"
              style={{
                position: "fixed",
                bottom: "88px",
                right: "24px",
                zIndex: 10000,
              }}
              className="flex w-[410px] max-w-[calc(100vw-24px)] max-h-[min(590px,calc(100vh-104px))] flex-col overflow-hidden rounded-[24px] border border-white/15 bg-[#0e1726]/95 shadow-[0_20px_60px_rgba(2,8,23,0.95),0_0_35px_rgba(139,92,246,0.2)] ring-1 ring-white/10 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200"
            >
              {/* Cabecera Compacta */}
              <header className="relative flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3 bg-white/[0.02]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-12 w-10 shrink-0 place-items-center">
                    <img src="/branding/asistente-oso.png?v=2" alt="" className="h-full w-full object-contain" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-violet-400">
                        Asistente Virtual
                      </span>
                      <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-black uppercase text-emerald-400">
                        IA
                      </span>
                    </div>
                    <h2 id="agent-modal-title" className="text-sm font-black text-white truncate">
                      Crear ticket con IA en un clic
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={autoCreateMutation.isPending}
                  aria-label="Cerrar asistente"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                >
                  <X size={17} />
                </button>
              </header>

              {/* Contenido con scroll */}
              <div className="overflow-y-auto p-4 space-y-3.5">
                {createdResult ? (
                  /* Pantalla de Éxito Compacta */
                  <div className="py-2 text-center">
                    <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                      <CheckCircle2 size={28} />
                    </div>

                    <h3 className="mt-3 text-base font-black text-white">
                      ¡Ticket creado y enviado!
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      La IA lo clasificó y asignó automáticamente.
                    </p>

                    <div className="mt-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
                        <span className="text-slate-400 text-[11px]">Código:</span>
                        <span className="rounded-md bg-teal/15 px-2.5 py-0.5 font-mono text-xs font-black text-teal">
                          {createdResult.order.order_code || `ORD-${createdResult.order.order_id}`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[11px]">Área responsable:</span>
                        <span className="rounded-md bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-black text-violet-200">
                          {createdResult.order.to_area?.name ||
                            getAreaName(createdResult.suggestion.to_area_code || "TI")}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[11px]">Asunto:</span>
                        <span className="text-[11px] font-bold text-slate-200 truncate max-w-[200px]">
                          {createdResult.order.title || createdResult.suggestion.title}
                        </span>
                      </div>

                      {createdResult.suggestion.reason && (
                        <div className="mt-1.5 rounded-lg bg-violet-400/[0.08] p-2 text-[10.5px] leading-relaxed text-violet-200/90">
                          <strong className="block text-violet-300 font-bold mb-0.5">Motivo:</strong>
                          {createdResult.suggestion.reason}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCreatedResult(null);
                          setProblem("");
                          setEvidenceList([]);
                          setErrorMessage(null);
                        }}
                        className="flex-1 h-9 rounded-xl border border-white/10 text-xs font-bold text-slate-300 transition hover:bg-white/[0.06]"
                      >
                        Crear otro
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleClose();
                          navigate("/pedidos");
                        }}
                        className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-teal to-cyan-400 text-xs font-black text-navy shadow-md transition hover:brightness-110"
                      >
                        Ver pedidos <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Formulario de Clasificación y Creación */
                  <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Área de Origen para SuperAdmin */}
                    {isSuper && (
                      <div>
                        <label className="mb-1 block text-[10.5px] font-bold text-slate-300 uppercase tracking-wide">
                          ÁREA QUE REPORTA *
                        </label>
                        <select
                          required
                          value={originAreaId}
                          onChange={(e) => setOriginAreaId(e.target.value)}
                          className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.05] px-2.5 text-xs font-bold text-white outline-none focus:border-violet-400"
                        >
                          <option value="" className="bg-[#0e1726]">
                            Seleccionar área
                          </option>
                          {lookups.data?.areas
                            ?.filter((a) => a.code !== "SUPER")
                            ?.map((area) => (
                              <option key={area.area_id} value={area.area_id} className="bg-[#0e1726]">
                                {area.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {/* Descripción del Problema */}
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11px] font-extrabold text-slate-300">
                        <span className="flex items-center gap-1">
                          <Sparkles size={12} className="text-violet-400" />
                          ¿QUÉ NECESITAS O SUCEDIÓ?
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {problem.length}/5000
                        </span>
                      </div>
                      <textarea
                        ref={textareaRef}
                        required
                        rows={3}
                        maxLength={5000}
                        value={problem}
                        onChange={(e) => setProblem(e.target.value)}
                        placeholder="Ejemplo: necesito actualizar cronogramas en la web, ayuda con correo o intranet, diseñar una portada..."
                        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.045] p-2.5 text-xs leading-5 text-white placeholder-slate-500 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20"
                      />

                      {/* Etiquetas rápidas compactas */}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {QUICK_TAGS.map((tag) => (
                          <button
                            key={tag.label}
                            type="button"
                            onClick={() => {
                              setProblem((curr) => (curr ? `${curr}. ${tag.text}` : tag.text));
                              textareaRef.current?.focus();
                            }}
                            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold text-slate-300 transition hover:border-violet-400/50 hover:bg-violet-500/10 hover:text-violet-200"
                          >
                            + {tag.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Área de Destino Opcional */}
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11px] font-extrabold text-slate-300">
                        <span className="flex items-center gap-1">
                          <Building2 size={12} className="text-violet-400" />
                          DESTINO (OPCIONAL)
                        </span>
                        <span className="text-[9.5px] text-violet-400 font-medium">
                          Auto-detectado por IA
                        </span>
                      </div>
                      <select
                        value={selectedDestinationCode}
                        onChange={(e) => setSelectedDestinationCode(e.target.value)}
                        className="h-8.5 w-full rounded-xl border border-white/10 bg-white/[0.05] px-2.5 text-xs font-bold text-white outline-none focus:border-violet-400"
                      >
                        <option value="" className="bg-[#0e1726]">
                          ✨ Detectar con IA automáticamente (Recomendado)
                        </option>
                        {lookups.data?.areas
                          ?.filter((a) => a.code !== "SUPER")
                          ?.map((a) => (
                            <option key={a.area_id} value={a.code} className="bg-[#0e1726]">
                              {a.name} ({a.code})
                            </option>
                          ))}
                        {isTI && (
                          <option value="SUPER" className="bg-[#0e1726]">
                            Administrador de empresa (Escalamiento)
                          </option>
                        )}
                      </select>
                    </div>

                    {/* Capturas y Evidencias */}
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11px] font-extrabold text-slate-300">
                        <span>CAPTURAS / EVIDENCIAS (OPCIONAL)</span>
                        <span className="text-[9.5px] text-slate-400 font-medium">
                          Pega con Ctrl+V · {evidenceList.length}/5
                        </span>
                      </div>

                      <label className="group flex min-h-[52px] cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-2 transition hover:border-violet-400/60 hover:bg-violet-400/[0.04]">
                        <span className="grid size-7 place-items-center rounded-lg bg-violet-400/10 text-violet-400 transition group-hover:scale-105">
                          <ImagePlus size={15} />
                        </span>
                        <div className="text-left">
                          <span className="block text-[11px] font-bold text-white leading-tight">
                            Subir capturas o documentos
                          </span>
                          <span className="text-[9.5px] text-slate-400">
                            Hasta 5 archivos de 10 MB: imágenes, PDF, Office, TXT o CSV
                          </span>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                          className="sr-only"
                          disabled={evidenceList.length >= 5}
                          onChange={(e) => {
                            addFiles(Array.from(e.target.files ?? []));
                            e.target.value = "";
                          }}
                        />
                      </label>

                      {/* Miniaturas de evidencias compactas */}
                      {evidenceList.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                          {evidenceList.map((ev, index) => (
                            <div
                              key={`${ev.file.name}-${index}`}
                              className="group relative flex items-center gap-2 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] p-1.5"
                            >
                              {ev.previewUrl ? (
                                <img
                                  src={ev.previewUrl}
                                  alt="Evidencia"
                                  className="size-8 rounded object-cover"
                                />
                              ) : (
                                <div className="grid size-8 place-items-center rounded bg-rose-500/10 text-rose-400 text-[10px] font-black">
                                  {ev.file.name.split('.').pop()?.toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[10px] font-bold text-slate-200">
                                  {ev.file.name}
                                </p>
                                <p className="text-[8.5px] text-slate-400">
                                  {(ev.file.size / 1024).toFixed(0)} KB
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => { setPreviewEvidence(null); removeEvidence(index); }}
                                aria-label="Eliminar evidencia"
                                className="grid size-5 place-items-center rounded text-slate-400 hover:bg-rose-500/20 hover:text-rose-400"
                              >
                                <Trash2 size={11} />
                              </button>
                              <button type="button" onClick={() => setPreviewEvidence(ev.file)} className="text-[10px] font-bold text-teal">Ver</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Mensaje de Error */}
                    {previewEvidence && previewEvidenceUrl && <FilePreviewModal file={previewEvidence} url={previewEvidenceUrl} onClose={() => setPreviewEvidence(null)} />}
                    {errorMessage && (
                      <div
                        role="alert"
                        className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-300"
                      >
                        <AlertCircle size={15} className="shrink-0 text-rose-400" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {/* Botón Principal de 1 Solo Clic */}
                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={autoCreateMutation.isPending || problem.trim().length < 10}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-teal text-xs font-black text-white shadow-lg shadow-violet-600/30 transition-all duration-200 hover:brightness-110 hover:shadow-violet-600/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
                      >
                        {autoCreateMutation.isPending ? (
                          <>
                            <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            <span>🤖 Clasificando y creando ticket...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={15} />
                            <span>Clasificar y Crear Ticket con IA</span>
                            <Send size={13} className="ml-0.5 opacity-80" />
                          </>
                        )}
                      </button>
                      <p className="mt-1 text-center text-[10px] text-slate-400">
                        La IA detecta automáticamente el área y crea el ticket en un solo paso.
                      </p>
                    </div>
                  </form>
                )}
              </div>
            </section>
          </>,
          document.body,
        )}
    </>
  );
}
