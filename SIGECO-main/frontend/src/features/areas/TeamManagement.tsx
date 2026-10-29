import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../store/auth";

type TeamUser = {
  id: number;
  name: string;
  email: string;
  slack_user_id?: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  requested_area: string;
  area?: string;
  is_lead: boolean;
  suspended_at?: string | null;
  days_left_to_reactivate?: number | null;
  can_reactivate?: boolean;
};

type ConfirmAction = {
  type: "suspend" | "reactivate" | "remove";
  member: TeamUser;
} | null;

const KNOWN_AREAS = [
  "Diseño",
  "TI",
  "Marketing",
  "Ventas",
  "Administración",
  "Recursos Humanos",
  "Contabilidad",
  "Psicología",
];

export function TeamManagement({ areaCode }: { areaCode?: string } = {}) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmAction>(null);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [slackMember, setSlackMember] = useState<TeamUser | null>(null);
  const [slackDraft, setSlackDraft] = useState("");
  const [slackError, setSlackError] = useState<string | null>(null);
  const saveSlack = useMutation({
    mutationFn: ({ id, slackId }: { id: number; slackId: string }) => api(`/team/${id}/slack`, {
      method: "PUT", body: JSON.stringify({ slack_user_id: slackId }),
    }),
    onSuccess: () => { setSlackMember(null); queryClient.invalidateQueries({ queryKey: ["team"] }); },
    onError: (error: Error) => setSlackError(error.message),
  });
  function editSlack(member: TeamUser) {
    setSlackMember(member); setSlackDraft(member.slack_user_id ?? ""); setSlackError(null);
  }

  // Solo el encargado o superadmin puede ver y ejecutar las acciones de gestión
  const isManager = Boolean(
    currentUser?.is_manager ||
    currentUser?.is_lead ||
    currentUser?.roles?.some(
      (role) => role === "Administrador_Empresa" || role === "SuperAdmin" || role === "Super_Admin" || role.endsWith("_Encargado")
    )
  );

  const team = useQuery({
    queryKey: ["team", areaCode],
    queryFn: () => api<TeamUser[]>(`/team${areaCode ? `?area=${encodeURIComponent(areaCode)}` : ""}`),
  });

  const rawMembers = team.data ?? [];

  // Diccionario canónico de áreas y sinónimos/códigos para evitar falsos positivos (ej. "marketing" contiene "ti")
  const AREA_SYNONYMS: Record<string, string[]> = {
    ti: ["ti", "tecnologia ti", "tecnologia_ti"],
    marketing: ["marketing", "mkt"],
    diseno: ["diseno", "dis", "diseño"],
    ventas: ["ventas"],
    administracion: ["administracion", "administración", "adm"],
    "recursos humanos": ["recursos humanos", "recursos_humanos", "rrhh"],
    contabilidad: ["contabilidad", "cont"],
    psicologia: ["psicologia", "psicología", "psico"],
  };

  // Normalizar texto para búsquedas y comparaciones insensibles a tildes/mayúsculas
  const normalize = (str?: string | null) =>
    (str ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const canonicalizeArea = (str?: string | null): string => {
    const norm = normalize(str);
    if (!norm) return "";
    for (const [canonical, synonyms] of Object.entries(AREA_SYNONYMS)) {
      if (norm === canonical || synonyms.includes(norm)) {
        return canonical;
      }
    }
    return norm;
  };

  const getMemberArea = (m: TeamUser) => (m.area || m.requested_area || "").trim();

  // Calcular las áreas disponibles y sus conteos
  const presentAreas = useMemo(() => {
    const map = new Map<string, { label: string; count: number; pendingCount: number }>();

    // Inicializar con KNOWN_AREAS para orden predecible y estético
    KNOWN_AREAS.forEach((name) => {
      const canon = canonicalizeArea(name);
      map.set(canon, { label: name, count: 0, pendingCount: 0 });
    });

    // Contar integrantes y solicitudes pendientes por área
    rawMembers.forEach((m) => {
      const raw = getMemberArea(m);
      if (!raw) return;
      const canon = canonicalizeArea(raw);
      const existing = map.get(canon);
      if (existing) {
        existing.count += 1;
        if (m.status === "pending") existing.pendingCount += 1;
      } else {
        map.set(canon, {
          label: raw,
          count: 1,
          pendingCount: m.status === "pending" ? 1 : 0,
        });
      }
    });

    // Filtrar solo las áreas que tienen integrantes
    return Array.from(map.values()).filter((item) => item.count > 0);
  }, [rawMembers]);

  // Mostrar el filtro por áreas cuando no hay un área fija o hay múltiples áreas en los datos
  const showAreaFilter = !areaCode || presentAreas.length > 1;

  // Filtrar integrantes por área seleccionada y por texto de búsqueda
  const filteredMembers = useMemo(() => {
    return rawMembers.filter((member) => {
      const area = getMemberArea(member);

      if (selectedAreaFilter !== "all") {
        const memberCanon = canonicalizeArea(area);
        const targetCanon = canonicalizeArea(selectedAreaFilter);
        if (memberCanon !== targetCanon) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = member.name.toLowerCase().includes(q);
        const matchEmail = member.email.toLowerCase().includes(q);
        const matchRole = (member.is_lead ? "encargado" : "equipo").includes(q);
        const matchStatus = member.status.toLowerCase().includes(q);
        const matchArea = area.toLowerCase().includes(q);
        return matchName || matchEmail || matchRole || matchStatus || matchArea;
      }

      return true;
    });
  }, [rawMembers, selectedAreaFilter, searchQuery]);

  const action = useMutation({
    mutationFn: ({ id, value }: { id: number; value: "approve" | "reject" | "suspend" | "reactivate" | "remove" }) =>
      api<{ message?: string }>(`/team/${id}/${value}`, { method: "POST" }),
    onSuccess: (data) => {
      setErrorMessage(null);
      setSuccessMessage(data?.message || "Acción realizada con éxito.");
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["ops"] });
      setTimeout(() => setSuccessMessage(null), 4500);
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "No se pudo realizar la acción.");
      setTimeout(() => setErrorMessage(null), 6000);
    },
  });

  const pendingCount = (team.data ?? []).filter((m) => m.status === "pending").length;

  const isSuperAdmin = Boolean(
    currentUser?.roles?.some(
      (role) => role === "Administrador_Empresa" || role === "SuperAdmin" || role === "Super_Admin"
    )
  );

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    slack_user_id: "",
    password: "",
    area: "DIS",
    is_lead: false,
  });
  const [createError, setCreateError] = useState<string | null>(null);

  const createUserMutation = useMutation({
    mutationFn: async (payload: typeof createForm) => {
      return api<{ message: string; user_id: number }>("/team", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data) => {
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        email: "",
        slack_user_id: "",
        password: "",
        area: "DIS",
        is_lead: false,
      });
      setCreateError(null);
      setSuccessMessage(data?.message || "Usuario creado con éxito.");
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: Error) => {
      setCreateError(err.message || "No se pudo crear el usuario.");
    },
  });

  return (
    <section className="interactive-surface overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card dark:border-white/[0.06] dark:bg-navy">
      {/* Encabezado */}
      <div className="flex flex-col gap-2 border-b border-black/5 px-4 py-4 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal/15 text-teal dark:bg-teal/20">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-navy dark:text-white">Equipo del área</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isManager
                ? "Gestiona integrantes, permisos de acceso, suspensiones temporales (60 días) y reactivaciones."
                : "Integrantes y colaboradores registrados en el área operativa."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isManager && pendingCount > 0 && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              {pendingCount} solicitud{pendingCount === 1 ? "" : "es"} pendiente{pendingCount === 1 ? "" : "s"}
            </span>
          )}

          {/* Botón de crear usuario: Únicamente visible para SuperAdmin */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-teal px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-teal/20 transition-all hover:bg-teal/90 active:scale-95 cursor-pointer"
            >
              <UserPlus size={16} />
              <span>Crear Usuario</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Éxito */}
      {successMessage && (
        <div className="m-4 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="rounded p-1 transition hover:bg-emerald-500/20"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Alerta de Error */}
      {errorMessage && (
        <div className="m-4 flex items-center justify-between gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="rounded p-1 transition hover:bg-rose-500/20"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {team.isError && <p className="p-4 text-sm text-red-600">No se pudo cargar el equipo.</p>}

      {/* Filtro por Áreas Operativas (Títulos interactivos sin scroll forzado) */}
      {showAreaFilter && (
        <div className="border-b border-black/5 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-white/[0.02]">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isSuperAdmin ? "Filtrar por Área Operativa:" : "Área Operativa:"}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Mostrando <strong className="text-navy dark:text-white">{filteredMembers.length}</strong> de{" "}
                {rawMembers.length} integrantes
              </span>
            </div>

            {/* Pestañas de Áreas tipo títulos */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Vista global disponible únicamente para SuperAdmin */}
              {isSuperAdmin && <button
                type="button"
                onClick={() => setSelectedAreaFilter("all")}
                className={`group inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
                  selectedAreaFilter === "all"
                    ? "bg-teal text-white shadow-md shadow-teal/25 ring-2 ring-teal/30"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-teal/40 hover:bg-slate-50 hover:text-navy dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-teal/40 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
              >
                <span>Todas las áreas</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                    selectedAreaFilter === "all"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                  }`}
                >
                  {rawMembers.length}
                </span>
              </button>}

              {/* Botones por cada área disponible */}
              {presentAreas.map((item) => {
                const isSelected = selectedAreaFilter === item.label ||
                  (!isSuperAdmin && presentAreas.length === 1);
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setSelectedAreaFilter(item.label)}
                    className={`group inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-teal text-white shadow-md shadow-teal/25 ring-2 ring-teal/30"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-teal/40 hover:bg-slate-50 hover:text-navy dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-teal/40 dark:hover:bg-white/10 dark:hover:text-white"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                      }`}
                    >
                      {item.count}
                    </span>
                    {item.pendingCount > 0 && (
                      <span
                        title={`${item.pendingCount} solicitud(es) pendiente(s)`}
                        className="size-2 rounded-full bg-amber-400 ring-2 ring-amber-400/40 animate-pulse"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Buscador de integrantes */}
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar integrante por nombre, correo o rol..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-xs text-navy placeholder:text-slate-400 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vista Móvil */}
      <div className="divide-y divide-black/5 dark:divide-white/5 md:hidden">
        {filteredMembers.map((member) => {
          const isSelf = currentUser?.id === member.id;

          return (
            <article key={member.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-extrabold text-navy dark:text-white">{member.name}</h3>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{member.email}</p>
                  <button type="button" onClick={() => editSlack(member)} className="mt-1 text-xs font-bold text-teal">Slack: {member.slack_user_id ?? "Configurar ID"}</button>
                </div>
                <TeamStatus value={member.status} daysLeft={member.days_left_to_reactivate} />
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs dark:bg-white/[0.03]">
                <div>
                  <span className="block text-[9px] font-black uppercase text-slate-400">Área</span>
                  <span className="mt-1 block font-bold text-slate-700 dark:text-slate-200">
                    {member.area ?? member.requested_area}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-black uppercase text-slate-400">Rol</span>
                  <span className="mt-1 block font-bold text-slate-700 dark:text-slate-200">
                    {member.is_lead ? (
                      <span className="font-extrabold text-teal">Encargado</span>
                    ) : (
                      "Equipo"
                    )}
                  </span>
                </div>
              </div>

              {/* Acciones para móvil (Solo visibles para el Encargado) */}
              {isManager && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 dark:border-white/5 dark:bg-white/[0.02]">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Acciones:
                  </span>
                  <div className="flex items-center gap-2">
                    {member.status === "pending" && (
                      <>
                        <button
                          type="button"
                          disabled={action.isPending}
                          onClick={() => action.mutate({ id: member.id, value: "approve" })}
                          aria-label="Aprobar acceso"
                          title="Aprobar acceso"
                          className="grid size-9 cursor-pointer place-items-center rounded-xl border border-emerald-300/80 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-400/25 dark:bg-emerald-400/20 dark:text-emerald-100"
                        >
                          <Check size={17} strokeWidth={3} />
                        </button>
                        <button
                          type="button"
                          disabled={action.isPending}
                          onClick={() => action.mutate({ id: member.id, value: "reject" })}
                          aria-label="Rechazar acceso"
                          title="Rechazar acceso"
                          className="grid size-9 cursor-pointer place-items-center rounded-xl border border-rose-300/80 bg-rose-50 text-rose-700 transition hover:bg-rose-100 dark:border-rose-400/25 dark:bg-rose-400/20 dark:text-rose-100"
                        >
                          <X size={17} strokeWidth={3} />
                        </button>
                      </>
                    )}

                    {member.status === "approved" && !isSelf && (
                      <>
                        {/* Botón Suspender */}
                        <button
                          type="button"
                          disabled={action.isPending}
                          onClick={() => setConfirmDialog({ type: "suspend", member })}
                          aria-label="Suspender integrante"
                          title="Suspender integrante (máx 60 días)"
                          className="grid size-9 cursor-pointer place-items-center rounded-xl border border-amber-300/80 bg-amber-50 text-amber-700 shadow-sm transition hover:bg-amber-100 dark:border-amber-400/25 dark:bg-amber-400/20 dark:text-amber-100"
                        >
                          <UserX size={17} strokeWidth={2.4} />
                        </button>
                        {/* Botón Eliminar */}
                        <button
                          type="button"
                          disabled={action.isPending}
                          onClick={() => setConfirmDialog({ type: "remove", member })}
                          aria-label="Eliminar del equipo"
                          title="Eliminar del equipo"
                          className="grid size-9 cursor-pointer place-items-center rounded-xl border border-rose-300/80 bg-rose-50 text-rose-700 shadow-sm transition hover:bg-rose-100 dark:border-rose-400/25 dark:bg-rose-400/20 dark:text-rose-100"
                        >
                          <Trash2 size={17} strokeWidth={2.4} />
                        </button>
                      </>
                    )}

                    {member.status === "suspended" && !isSelf && (
                      <>
                        {/* Botón Reactivar (UserCheck) */}
                        <button
                          type="button"
                          disabled={action.isPending || member.days_left_to_reactivate === 0}
                          onClick={() => setConfirmDialog({ type: "reactivate", member })}
                          aria-label="Reactivar integrante"
                          title={
                            member.days_left_to_reactivate !== null && member.days_left_to_reactivate !== undefined
                              ? `Reactivar integrante (quedan ${member.days_left_to_reactivate} días)`
                              : "Reactivar integrante (plazo 60 días)"
                          }
                          className="grid size-9 cursor-pointer place-items-center rounded-xl border border-emerald-300/80 bg-emerald-50 text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-400/25 dark:bg-emerald-400/20 dark:text-emerald-100"
                        >
                          <UserCheck size={17} strokeWidth={2.4} />
                        </button>
                        {/* Botón Eliminar */}
                        <button
                          type="button"
                          disabled={action.isPending}
                          onClick={() => setConfirmDialog({ type: "remove", member })}
                          aria-label="Eliminar del equipo"
                          title="Eliminar del equipo"
                          className="grid size-9 cursor-pointer place-items-center rounded-xl border border-rose-300/80 bg-rose-50 text-rose-700 shadow-sm transition hover:bg-rose-100 dark:border-rose-400/25 dark:bg-rose-400/20 dark:text-rose-100"
                        >
                          <Trash2 size={17} strokeWidth={2.4} />
                        </button>
                      </>
                    )}

                    {isSelf && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                        <ShieldCheck size={14} className="text-teal" /> Tu cuenta
                      </span>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
        {!team.isLoading && filteredMembers.length === 0 && (
          <div className="p-6 text-center text-sm text-slate-500 space-y-2">
            <p>No se encontraron integrantes con el filtro seleccionado.</p>
            {(selectedAreaFilter !== "all" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedAreaFilter("all");
                  setSearchQuery("");
                }}
                className="text-xs font-bold text-teal hover:underline cursor-pointer"
              >
                Restablecer filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Vista Tabla Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50/70 text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:bg-white/[0.025]">
            <tr>
              <th className="p-3.5">Integrante</th>
              <th className="p-3.5">Área</th>
              <th className="p-3.5">Rol</th>
              <th className="p-3.5">Estado</th>
              {isManager && <th className="p-3.5 text-center">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {filteredMembers.map((member) => {
              const isSelf = currentUser?.id === member.id;

              return (
                <tr key={member.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                  <td className="p-3.5">
                    <div className="font-extrabold text-navy dark:text-slate-100">{member.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{member.email}</div>
                    <button type="button" onClick={() => editSlack(member)} className="mt-1 text-xs font-bold text-teal">Slack: {member.slack_user_id ?? "Configurar ID"}</button>
                  </td>
                  <td className="p-3.5">
                    <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 dark:border-white/10 dark:text-slate-300">
                      {member.area ?? member.requested_area}
                    </span>
                  </td>
                  <td className="p-3.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {member.is_lead ? (
                      <span className="font-extrabold text-teal">Encargado</span>
                    ) : (
                      "Equipo"
                    )}
                  </td>
                  <td className="p-3.5">
                    <TeamStatus value={member.status} daysLeft={member.days_left_to_reactivate} />
                  </td>

                  {/* Columna Acciones: Solo visible para el Encargado */}
                  {isManager && (
                    <td className="p-3.5">
                      {/* Caso: Solicitud pendiente */}
                      {member.status === "pending" && (
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Botón Aprobar (Aspa verde) */}
                          <div className="relative group/tooltip">
                            <button
                              type="button"
                              disabled={action.isPending}
                              onClick={() => action.mutate({ id: member.id, value: "approve" })}
                              aria-label="Aceptar y aprobar acceso"
                              title="Aceptar y aprobar acceso"
                              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-emerald-300/80 bg-gradient-to-br from-emerald-50 to-lime-100/60 text-emerald-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400 hover:from-emerald-100 hover:to-lime-100 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-400/25 dark:from-emerald-400/20 dark:to-lime-500/10 dark:text-emerald-100"
                            >
                              <Check size={17} strokeWidth={3} />
                            </button>
                            <div
                              role="tooltip"
                              className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150 translate-y-1 group-hover/tooltip:translate-y-0 z-[70]"
                            >
                              <div className="whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-bold text-white shadow-xl ring-1 ring-white/15 backdrop-blur-sm">
                                Aprobar acceso
                              </div>
                              <div className="-mt-1 size-2 rotate-45 bg-slate-900/95 ring-1 ring-white/15" />
                            </div>
                          </div>

                          {/* Botón Rechazar (X roja) */}
                          <div className="relative group/tooltip">
                            <button
                              type="button"
                              disabled={action.isPending}
                              onClick={() => action.mutate({ id: member.id, value: "reject" })}
                              aria-label="Rechazar solicitud de acceso"
                              title="Rechazar solicitud de acceso"
                              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-rose-300/80 bg-gradient-to-br from-rose-50 to-orange-100/60 text-rose-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-400 hover:from-rose-100 hover:to-orange-100 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-400/25 dark:from-rose-400/20 dark:to-orange-500/10 dark:text-rose-100"
                            >
                              <X size={17} strokeWidth={3} />
                            </button>
                            <div
                              role="tooltip"
                              className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150 translate-y-1 group-hover/tooltip:translate-y-0 z-[70]"
                            >
                              <div className="whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-bold text-white shadow-xl ring-1 ring-white/15 backdrop-blur-sm">
                                Rechazar acceso
                              </div>
                              <div className="-mt-1 size-2 rotate-45 bg-slate-900/95 ring-1 ring-white/15" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Caso: Integrante aprobado / activo */}
                      {member.status === "approved" && !isSelf && (
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Botón Suspender (UserX) */}
                          <div className="relative group/tooltip">
                            <button
                              type="button"
                              disabled={action.isPending}
                              onClick={() => setConfirmDialog({ type: "suspend", member })}
                              aria-label="Suspender integrante"
                              title="Suspender integrante (máx 60 días)"
                              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-amber-300/80 bg-gradient-to-br from-amber-50 to-orange-100/60 text-amber-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400 hover:from-amber-100 hover:to-orange-100 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-400/25 dark:from-amber-400/20 dark:to-orange-500/10 dark:text-amber-100 dark:shadow-[0_0_18px_rgba(245,158,11,0.08)] dark:hover:border-amber-300/55 dark:hover:from-amber-400/30"
                            >
                              <UserX size={17} strokeWidth={2.4} />
                            </button>
                            <div
                              role="tooltip"
                              className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150 translate-y-1 group-hover/tooltip:translate-y-0 z-[70]"
                            >
                              <div className="whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-bold text-white shadow-xl ring-1 ring-white/15 backdrop-blur-sm">
                                Suspender integrante
                              </div>
                              <div className="-mt-1 size-2 rotate-45 bg-slate-900/95 ring-1 ring-white/15" />
                            </div>
                          </div>

                          {/* Botón Eliminar (Trash2) */}
                          <div className="relative group/tooltip">
                            <button
                              type="button"
                              disabled={action.isPending}
                              onClick={() => setConfirmDialog({ type: "remove", member })}
                              aria-label="Eliminar del equipo"
                              title="Eliminar del equipo"
                              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-rose-300/80 bg-gradient-to-br from-rose-50 to-red-100/60 text-rose-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-400 hover:from-rose-100 hover:to-red-100 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-400/25 dark:from-rose-400/20 dark:to-red-500/10 dark:text-rose-100 dark:shadow-[0_0_18px_rgba(244,63,94,0.08)] dark:hover:border-rose-300/55 dark:hover:from-rose-400/30"
                            >
                              <Trash2 size={17} strokeWidth={2.4} />
                            </button>
                            <div
                              role="tooltip"
                              className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150 translate-y-1 group-hover/tooltip:translate-y-0 z-[70]"
                            >
                              <div className="whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-bold text-white shadow-xl ring-1 ring-white/15 backdrop-blur-sm">
                                Eliminar del equipo
                              </div>
                              <div className="-mt-1 size-2 rotate-45 bg-slate-900/95 ring-1 ring-white/15" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Caso: Integrante suspendido */}
                      {member.status === "suspended" && !isSelf && (
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Botón Reactivar (UserCheck) */}
                          <div className="relative group/tooltip">
                            <button
                              type="button"
                              disabled={action.isPending || member.days_left_to_reactivate === 0}
                              onClick={() => setConfirmDialog({ type: "reactivate", member })}
                              aria-label="Reactivar integrante"
                              title={
                                member.days_left_to_reactivate !== null && member.days_left_to_reactivate !== undefined
                                  ? `Reactivar integrante (quedan ${member.days_left_to_reactivate} días)`
                                  : "Reactivar integrante (plazo 60 días)"
                              }
                              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-emerald-300/80 bg-gradient-to-br from-emerald-50 to-lime-100/60 text-emerald-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400 hover:from-emerald-100 hover:to-lime-100 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-400/25 dark:from-emerald-400/20 dark:to-lime-500/10 dark:text-emerald-100 dark:shadow-[0_0_18px_rgba(52,211,153,0.08)] dark:hover:border-emerald-300/55 dark:hover:from-emerald-400/30"
                            >
                              <UserCheck size={17} strokeWidth={2.4} />
                            </button>
                            <div
                              role="tooltip"
                              className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150 translate-y-1 group-hover/tooltip:translate-y-0 z-[70]"
                            >
                              <div className="whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-bold text-white shadow-xl ring-1 ring-white/15 backdrop-blur-sm">
                                Reactivar integrante{" "}
                                {member.days_left_to_reactivate !== null && member.days_left_to_reactivate !== undefined
                                  ? `(${member.days_left_to_reactivate}d)`
                                  : ""}
                              </div>
                              <div className="-mt-1 size-2 rotate-45 bg-slate-900/95 ring-1 ring-white/15" />
                            </div>
                          </div>

                          {/* Botón Eliminar (Trash2) */}
                          <div className="relative group/tooltip">
                            <button
                              type="button"
                              disabled={action.isPending}
                              onClick={() => setConfirmDialog({ type: "remove", member })}
                              aria-label="Eliminar del equipo"
                              title="Eliminar del equipo"
                              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-rose-300/80 bg-gradient-to-br from-rose-50 to-red-100/60 text-rose-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-400 hover:from-rose-100 hover:to-red-100 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-400/25 dark:from-rose-400/20 dark:to-red-500/10 dark:text-rose-100 dark:shadow-[0_0_18px_rgba(244,63,94,0.08)] dark:hover:border-rose-300/55 dark:hover:from-rose-400/30"
                            >
                              <Trash2 size={17} strokeWidth={2.4} />
                            </button>
                            <div
                              role="tooltip"
                              className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150 translate-y-1 group-hover/tooltip:translate-y-0 z-[70]"
                            >
                              <div className="whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-bold text-white shadow-xl ring-1 ring-white/15 backdrop-blur-sm">
                                Eliminar del equipo
                              </div>
                              <div className="-mt-1 size-2 rotate-45 bg-slate-900/95 ring-1 ring-white/15" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Caso: Cuenta propia (Encargado) */}
                      {isSelf && (
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                          <ShieldCheck size={16} className="text-teal" />
                          <span>Tu cuenta</span>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {!team.isLoading && filteredMembers.length === 0 && (
              <tr>
                <td className="p-8 text-center text-slate-500" colSpan={isManager ? 5 : 4}>
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-sm">No se encontraron integrantes con los filtros seleccionados.</p>
                    {(selectedAreaFilter !== "all" || searchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAreaFilter("all");
                          setSearchQuery("");
                        }}
                        className="rounded-lg bg-teal/10 px-3 py-1.5 text-xs font-bold text-teal transition hover:bg-teal/20 cursor-pointer"
                      >
                        Restablecer filtros de área y búsqueda
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Confiable de Confirmación (Portal Directo) */}
      {confirmDialog && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfirmDialog(null);
            }
          }}
        >
          {/* Tarjeta del Diálogo Modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0c1827] dark:shadow-[0_25px_60px_rgba(2,8,23,0.85)]"
          >
            <button
              type="button"
              onClick={() => setConfirmDialog(null)}
              className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center">
              {confirmDialog.type === "suspend" && (
                <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 ring-8 ring-amber-500/10 dark:bg-amber-400/20 dark:text-amber-300 dark:ring-amber-400/10">
                  <UserX size={28} strokeWidth={2.4} />
                </div>
              )}
              {confirmDialog.type === "reactivate" && (
                <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500 ring-8 ring-emerald-500/10 dark:bg-emerald-400/20 dark:text-emerald-300 dark:ring-emerald-400/10">
                  <UserCheck size={28} strokeWidth={2.4} />
                </div>
              )}
              {confirmDialog.type === "remove" && (
                <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-500 ring-8 ring-rose-500/10 dark:bg-rose-400/20 dark:text-rose-300 dark:ring-rose-400/10">
                  <Trash2 size={28} strokeWidth={2.4} />
                </div>
              )}

              <h3 className="mt-4 text-lg font-black text-navy dark:text-white">
                {confirmDialog.type === "suspend" && `¿Suspender a "${confirmDialog.member.name}"?`}
                {confirmDialog.type === "reactivate" && `¿Reactivar a "${confirmDialog.member.name}"?`}
                {confirmDialog.type === "remove" && `¿Eliminar a "${confirmDialog.member.name}" del equipo?`}
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {confirmDialog.type === "suspend" &&
                  "El integrante no podrá iniciar sesión en la plataforma ni gestionar requerimientos del área mientras esté suspendido."}
                {confirmDialog.type === "reactivate" &&
                  "El integrante recuperará el acceso inmediato a la plataforma y podrá participar nuevamente en los pedidos de su área."}
                {confirmDialog.type === "remove" &&
                  "Esta acción desvinculará al integrante del área de forma permanente y retirará sus permisos operativos."}
              </p>

              {/* Mensaje de regla de negocio de los 60 días */}
              {confirmDialog.type === "suspend" && (
                <div className="mt-3 flex w-full items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs font-semibold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
                  <Clock size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    <strong>Plazo de reactivación: 60 días (2 meses).</strong> Si no es reactivado dentro de este período, el sistema lo eliminará automáticamente del equipo.
                  </span>
                </div>
              )}

              {confirmDialog.type === "reactivate" && confirmDialog.member.days_left_to_reactivate !== null && (
                <div className="mt-3 flex w-full items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-left text-xs font-semibold text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Quedan <strong>{confirmDialog.member.days_left_to_reactivate} días</strong> dentro del plazo permitido para esta reactivación.
                  </span>
                </div>
              )}

              {/* Tarjeta de información del usuario */}
              <div className="my-5 w-full rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5 text-left dark:border-white/5 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-navy dark:text-white">{confirmDialog.member.name}</p>
                    <p className="truncate text-[11px] text-slate-400">{confirmDialog.member.email}</p>
                  </div>
                  <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {confirmDialog.member.area ?? confirmDialog.member.requested_area}
                  </span>
                </div>
              </div>

              {/* Botones de confirmación / cancelación */}
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-xs sm:text-sm font-extrabold text-slate-600 transition hover:bg-slate-100 hover:text-navy dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  Cancelar
                </button>

                {confirmDialog.type === "suspend" && (
                  <button
                    type="button"
                    disabled={action.isPending}
                    onClick={() => {
                      action.mutate({ id: confirmDialog.member.id, value: "suspend" });
                      setConfirmDialog(null);
                    }}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-xs sm:text-sm font-black text-navy shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 active:scale-95 disabled:opacity-50"
                  >
                    <UserX size={16} strokeWidth={2.4} />
                    Suspender
                  </button>
                )}

                {confirmDialog.type === "reactivate" && (
                  <button
                    type="button"
                    disabled={action.isPending}
                    onClick={() => {
                      action.mutate({ id: confirmDialog.member.id, value: "reactivate" });
                      setConfirmDialog(null);
                    }}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs sm:text-sm font-black text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
                  >
                    <UserCheck size={16} strokeWidth={2.4} />
                    Reactivar
                  </button>
                )}

                {confirmDialog.type === "remove" && (
                  <button
                    type="button"
                    disabled={action.isPending}
                    onClick={() => {
                      action.mutate({ id: confirmDialog.member.id, value: "remove" });
                      setConfirmDialog(null);
                    }}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-xs sm:text-sm font-black text-white shadow-lg shadow-rose-600/25 transition hover:bg-rose-500 active:scale-95 disabled:opacity-50"
                  >
                    <Trash2 size={16} strokeWidth={2.4} />
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {slackMember && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form role="dialog" aria-modal="true" aria-label="Configurar Slack" onSubmit={(event) => { event.preventDefault(); if (slackMember) saveSlack.mutate({ id: slackMember.id, slackId: slackDraft }); }} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-navy">
            <h3 className="font-bold text-navy dark:text-white">Slack de {slackMember.name}</h3>
            <label className="mt-4 block text-xs font-bold text-slate-500">ID de miembro de Slack<input autoFocus required pattern="[UW][A-Z0-9]{8,29}" maxLength={30} value={slackDraft} onChange={(event) => setSlackDraft(event.target.value.trim().toUpperCase())} placeholder="U012ABCDEF0" className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 text-navy dark:text-white" /></label>
            <p className="mt-2 text-xs text-slate-500">En Slack: perfil → Más → Copiar ID de miembro.</p>
            {slackError && <p role="alert" className="mt-3 text-xs text-rose-500">{slackError}</p>}
            <div className="mt-5 flex justify-end gap-3"><button type="button" disabled={saveSlack.isPending} onClick={() => setSlackMember(null)} className="px-3 py-2 text-sm text-slate-500">Cancelar</button><button disabled={saveSlack.isPending} className="rounded-xl bg-teal px-4 py-2 text-sm font-bold text-navy">{saveSlack.isPending ? "Guardando…" : "Guardar Slack"}</button></div>
          </form>
        </div>, document.body
      )}

      {/* Modal para Crear Usuario / Encargado por SuperAdmin */}
      {showCreateModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
              onClick={() => {
                if (!createUserMutation.isPending) {
                  setShowCreateModal(false);
                  setCreateError(null);
                }
              }}
            />

            <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0f172a]">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-white/5 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 place-items-center rounded-xl bg-teal/15 text-teal">
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-navy dark:text-white">
                      Crear Nuevo Usuario o Encargado
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Asigna credenciales y área operativa directamente.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={createUserMutation.isPending}
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError(null);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Body */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCreateError(null);
                  createUserMutation.mutate(createForm);
                }}
                className="p-5 space-y-4"
              >
                {createError && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">ID de miembro de Slack *<input required pattern="[UW][A-Z0-9]{8,29}" maxLength={30} value={createForm.slack_user_id} onChange={(event) => setCreateForm({ ...createForm, slack_user_id: event.target.value.trim().toUpperCase() })} placeholder="U012ABCDEF0" className="mt-2 w-full rounded-xl border border-slate-200 bg-transparent p-3 dark:border-white/10" /><span className="mt-2 block font-normal text-slate-500">Slack → Perfil → Más → Copiar ID de miembro.</span></label>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Ej: David Pérez Gómez"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-navy placeholder:text-slate-400 focus:border-teal focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="ejemplo@nexus.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-navy placeholder:text-slate-400 focus:border-teal focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Contraseña Inicial *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-navy placeholder:text-slate-400 focus:border-teal focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-teal"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      Área Operativa *
                    </label>
                    <select
                      value={createForm.area}
                      onChange={(e) => setCreateForm({ ...createForm, area: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs text-navy focus:border-teal focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal/20 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:focus:border-teal cursor-pointer"
                    >
                      <option value="DIS">Diseño</option>
                      <option value="TI">TI</option>
                      <option value="MKT">Marketing</option>
                      <option value="VENTAS">Ventas</option>
                      <option value="ADM">Administración</option>
                      <option value="RRHH">Recursos Humanos</option>
                      <option value="CONT">Contabilidad</option>
                      <option value="PSICO">Psicología</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      Jerarquía / Rol *
                    </label>
                    <select
                      value={createForm.is_lead ? "lead" : "member"}
                      onChange={(e) => setCreateForm({ ...createForm, is_lead: e.target.value === "lead" })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs text-navy focus:border-teal focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal/20 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:focus:border-teal cursor-pointer"
                    >
                      <option value="member">Integrante de Equipo</option>
                      <option value="lead">Encargado de Área</option>
                    </select>
                  </div>
                </div>

                {createForm.is_lead && (
                  <div className="flex items-start gap-2 rounded-xl border border-teal/20 bg-teal/5 p-3 text-[11px] text-teal-900 dark:text-teal-200">
                    <ShieldCheck size={16} className="shrink-0 text-teal mt-0.5" />
                    <span>
                      Este usuario será nombrado <strong>Encargado Oficial</strong> del área seleccionada y tendrá permisos para gestionar el equipo y atender solicitudes de su departamento.
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    disabled={createUserMutation.isPending}
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateError(null);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createUserMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-teal px-5 py-2 text-xs font-bold text-white shadow-md shadow-teal/25 transition hover:bg-teal/90 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {createUserMutation.isPending ? (
                      <>
                        <span className="size-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Crear Usuario</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}

function TeamStatus({ value, daysLeft }: { value: TeamUser["status"]; daysLeft?: number | null }) {
  if (value === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Aprobado
      </span>
    );
  }
  if (value === "suspended") {
    return (
      <span
        title={daysLeft !== undefined && daysLeft !== null ? `Plazo de reactivación: quedan ${daysLeft} días` : "Integrante suspendido"}
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"
      >
        <Clock size={12} className="text-amber-600 dark:text-amber-400" />
        Suspendido {daysLeft !== undefined && daysLeft !== null ? `(${daysLeft}d)` : ""}
      </span>
    );
  }
  if (value === "rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">
        <span className="size-1.5 rounded-full bg-rose-500" />
        Rechazado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
      <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
      Pendiente
    </span>
  );
}
