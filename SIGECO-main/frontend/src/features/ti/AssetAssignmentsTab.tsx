import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Plus,
  Search,
  RotateCcw,
  UserCheck,
  AlertTriangle,
  Clock,
  X,
  Download,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { api, apiDownload, type Paged } from "../../lib/api";
import type { Asset, AssetAssignment, AssignmentSummary } from "./types";

const ASSET_TYPES = [
  "Laptop",
  "Desktop",
  "Monitor",
  "Periférico",
  "Accesorio de Red",
  "Servidor",
  "Impresora",
  "Otro",
];


function formatLoanDateTime(isoString?: string | null): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString.substring(0, 10);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch {
    return isoString.substring(0, 16);
  }
}

function getLoanTimeBadge(isoString?: string | null, estado?: string) {
  if (!isoString || estado !== "Activo") return null;
  const due = new Date(isoString).getTime();
  const now = Date.now();
  const diffMs = due - now;

  if (diffMs < 0) {
    const overdueMinutes = Math.abs(Math.floor(diffMs / (1000 * 60)));
    if (overdueMinutes < 60) return `Vencido hace ${overdueMinutes}m`;
    const overdueHours = Math.floor(overdueMinutes / 60);
    return `Vencido hace ${overdueHours}h`;
  }

  const minutesLeft = Math.floor(diffMs / (1000 * 60));
  if (minutesLeft <= 120) {
    if (minutesLeft < 60) return `⚠️ Quedan ${minutesLeft} min`;
    const h = Math.floor(minutesLeft / 60);
    const m = minutesLeft % 60;
    return `⚠️ Queda ${h}h ${m}m`;
  }

  const hoursLeft = Math.floor(minutesLeft / 60);
  if (hoursLeft < 24) return `Quedan ${hoursLeft} horas`;
  const days = Math.floor(hoursLeft / 24);
  return `Quedan ${days} día${days > 1 ? "s" : ""}`;
}

export function AssetAssignmentsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Activo");
  const [dueStatusFilter, setDueStatusFilter] = useState<string>("");
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("");
  const [requestingAreaFilter, setRequestingAreaFilter] = useState<string>("");
  const [destinationAreaFilter, setDestinationAreaFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);

  // Modal states
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [openReturnModal, setOpenReturnModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssetAssignment | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [assignForm, setAssignForm] = useState({
    id_activo: "",
    id_usuario_asignado: "",
    id_area_solicitante: "",
    id_area_destino: "",
    id_pedido: "",
    horas_prestamo: "4",
    condicion_entrega: "Operativo",
    observaciones_entrega: "",
  });

  const [returnForm, setReturnForm] = useState({
    condicion_devolucion: "Operativo",
    observaciones_devolucion: "",
  });

  // Build query string
  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("per_page", "12");
  if (statusFilter) queryParams.set("status", statusFilter);
  if (search) queryParams.set("search", search);
  if (dueStatusFilter) queryParams.set("due_status", dueStatusFilter);
  if (assetTypeFilter) queryParams.set("asset_type", assetTypeFilter);
  if (requestingAreaFilter) queryParams.set("id_area_solicitante", requestingAreaFilter);
  if (destinationAreaFilter) queryParams.set("id_area_destino", destinationAreaFilter);
  if (dateFrom) queryParams.set("date_from", dateFrom);
  if (dateTo) queryParams.set("date_to", dateTo);

  // Query Assignments
  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: [
      "techdesk-assignments",
      page,
      statusFilter,
      search,
      dueStatusFilter,
      assetTypeFilter,
      requestingAreaFilter,
      destinationAreaFilter,
      dateFrom,
      dateTo,
    ],
    queryFn: () => api<Paged<AssetAssignment>>(`/techdesk/assignments?${queryParams.toString()}`),
  });

  // Query Summary Counters
  const { data: summaryData } = useQuery({
    queryKey: ["techdesk-assignments-summary"],
    queryFn: () => api<{ data: AssignmentSummary }>("/techdesk/assignments/summary"),
  });

  const summary = summaryData?.data;

  // Query lookups
  const { data: lookupsData } = useQuery({
    queryKey: ["techdesk-assignments-lookups"],
    queryFn: () =>
      api<{
        data: {
          team: { id_usuario: number; nombre: string; correo: string }[];
          areas: { id_area: number; nombre: string; codigo: string }[];
          orders: { id_pedido: number; codigo_pedido: string }[];
          stock: Asset[];
        };
      }>("/techdesk/assignments/lookups"),
    enabled: openAssignModal || !!requestingAreaFilter || !!destinationAreaFilter,
  });

  const lookups = lookupsData?.data;

  // Mutation Assign
  const assignMutation = useMutation({
    mutationFn: (payload: any) =>
      api("/techdesk/assignments", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["techdesk-assignments"] });
      qc.invalidateQueries({ queryKey: ["techdesk-assignments-summary"] });
      qc.invalidateQueries({ queryKey: ["techdesk-assets"] });
      qc.invalidateQueries({ queryKey: ["techdesk-assets-kpis"] });
      setOpenAssignModal(false);
      setAssignForm({
        id_activo: "",
        id_usuario_asignado: "",
        id_area_solicitante: "",
        id_area_destino: "",
        id_pedido: "",
        horas_prestamo: "4",
        condicion_entrega: "Operativo",
        observaciones_entrega: "",
      });
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Error al registrar la asignación.");
    },
  });

  // Mutation Return
  const returnMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      api(`/techdesk/assignments/${id}/return`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["techdesk-assignments"] });
      qc.invalidateQueries({ queryKey: ["techdesk-assignments-summary"] });
      qc.invalidateQueries({ queryKey: ["techdesk-assets"] });
      qc.invalidateQueries({ queryKey: ["techdesk-assets-kpis"] });
      setOpenReturnModal(false);
      setSelectedAssignment(null);
      setReturnForm({
        condicion_devolucion: "Operativo",
        observaciones_devolucion: "",
      });
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Error al procesar la devolución.");
    },
  });

  function handleOpenReturn(assignment: AssetAssignment) {
    setSelectedAssignment(assignment);
    setReturnForm({
      condicion_devolucion: "Operativo",
      observaciones_devolucion: "",
    });
    setErrorMsg(null);
    setOpenReturnModal(true);
  }

  function handleAssignSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const payload = {
      id_activo: parseInt(assignForm.id_activo, 10),
      id_usuario_asignado: parseInt(assignForm.id_usuario_asignado, 10),
      id_area_solicitante: assignForm.id_area_solicitante
        ? parseInt(assignForm.id_area_solicitante, 10)
        : null,
      id_area_destino: assignForm.id_area_destino
        ? parseInt(assignForm.id_area_destino, 10)
        : null,
      id_pedido: assignForm.id_pedido ? parseInt(assignForm.id_pedido, 10) : null,
      horas_prestamo: parseFloat(assignForm.horas_prestamo) || 4,
      fecha_devolucion_estimada:
        parseFloat(assignForm.horas_prestamo) > 0
          ? new Date(Date.now() + parseFloat(assignForm.horas_prestamo) * 3600 * 1000).toISOString()
          : null,
      condicion_entrega: assignForm.condicion_entrega,
      observaciones_entrega: assignForm.observaciones_entrega || null,
    };

    assignMutation.mutate(payload);
  }

  function handleReturnSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssignment) return;
    setErrorMsg(null);

    returnMutation.mutate({
      id: selectedAssignment.id_asignacion,
      payload: returnForm,
    });
  }

  async function handleExportCsv() {
    const exportParams = new URLSearchParams(queryParams);
    exportParams.delete("page");
    exportParams.delete("per_page");
    await apiDownload(
      `/techdesk/assignments/export?${exportParams.toString()}`,
      `asignaciones_techdesk_${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-950 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
              Total Registros
            </span>
            <Layers className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white tracking-tight">
            {summary?.total ?? summary?.total_filtrado ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">Historial acumulado</p>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-slate-900 to-slate-950 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
              En Préstamo
            </span>
            <UserCheck className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-300 tracking-tight">
            {summary?.activos ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">Asignaciones vigentes</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              Devueltos
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400 tracking-tight">
            {summary?.devueltos ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">Reingresados a almacén</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
              Por Vencer (&le;2h)
            </span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-300 tracking-tight">
            {summary?.por_vencer ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">Próximos a cumplirse</p>
        </div>

        <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-slate-900 to-slate-950 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
              Vencidos
            </span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-400 tracking-tight">
            {summary?.vencidos ?? summary?.activos_vencidos ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">Plazo estimado superado</p>
        </div>
      </div>

      {/* Combined Filter Bar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por equipo, código patrimonial, colaborador o correo..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
              title="Descargar lista filtrada en formato CSV"
            >
              <Download className="h-4 w-4 text-cyan-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={() => {
                setErrorMsg(null);
                setOpenAssignModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Asignación</span>
            </button>
          </div>
        </div>

        {/* Secondary filters row */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2 border-t border-slate-800/60">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
          >
            <option value="">Estado: Todos</option>
            <option value="Activo">Activos (En préstamo)</option>
            <option value="Devuelto">Devueltos</option>
          </select>

          <select
            value={dueStatusFilter}
            onChange={(e) => {
              setDueStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
          >
            <option value="">Plazo: Todos</option>
            <option value="vigente">Vigentes a tiempo</option>
            <option value="por_vencer">Por vencer (&le;2h)</option>
            <option value="vencido">Vencidos</option>
          </select>

          <select
            value={assetTypeFilter}
            onChange={(e) => {
              setAssetTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
          >
            <option value="">Tipo de Activo: Todos</option>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={requestingAreaFilter}
            onChange={(e) => {
              setRequestingAreaFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
          >
            <option value="">Área Solicitante: Todas</option>
            {lookups?.areas?.map((a) => (
              <option key={a.id_area} value={a.id_area}>
                {a.nombre}
              </option>
            ))}
          </select>

          <select
            value={destinationAreaFilter}
            onChange={(e) => {
              setDestinationAreaFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
          >
            <option value="">Área Destino: Todas</option>
            {lookups?.areas?.map((a) => (
              <option key={a.id_area} value={a.id_area}>
                {a.nombre}
              </option>
            ))}
          </select>

          <div>
            <input
              type="date"
              placeholder="Desde"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
              title="Fecha desde"
            />
          </div>

          <div>
            <input
              type="date"
              placeholder="Hasta"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
              title="Fecha hasta"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden backdrop-blur-md shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase text-slate-400 font-semibold">
              <tr>
                <th className="px-5 py-3.5">Colaborador Asignado</th>
                <th className="px-5 py-3.5">Área Solicitante</th>
                <th className="px-5 py-3.5">Activo / Equipo</th>
                <th className="px-5 py-3.5">Fecha Entrega</th>
                <th className="px-5 py-3.5">Devolución Estimada</th>
                <th className="px-5 py-3.5">Ticket</th>
                <th className="px-5 py-3.5">Estado / Vencimiento</th>
                <th className="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Clock className="h-6 w-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    Cargando trazabilidad de asignaciones...
                  </td>
                </tr>
              ) : !assignmentsData?.data?.length ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Layers className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    No hay registros de asignaciones que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                assignmentsData.data.map((item) => {
                  return (
                    <tr
                      key={item.id_asignacion}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-semibold text-white">
                          {item.assigned_user?.nombre_completo || `Usuario #${item.id_usuario_asignado}`}
                        </div>
                        <div className="text-xs text-slate-400">
                          {item.assigned_user?.correo}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-300">
                        <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 font-medium">
                          {item.requesting_area?.nombre || item.destination_area?.nombre || item.requesting_area_name || item.destination_area_name || "Sin área"}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-mono text-cyan-400 text-xs font-bold">
                          {item.asset?.codigo_patrimonial || item.asset_code}
                        </div>
                        <div className="text-xs text-slate-300 max-w-xs truncate">
                          {item.asset?.nombre || item.asset_name}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-300 font-mono">
                        {item.fecha_asignacion ? formatLoanDateTime(item.fecha_asignacion) : "-"}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs">
                        {item.fecha_devolucion_real ? (
                          <span className="text-emerald-400 font-medium">
                            Devuelto el {formatLoanDateTime(item.fecha_devolucion_real)}
                          </span>
                        ) : item.fecha_devolucion_estimada ? (
                          <>
                            <span
                              className={`font-medium ${
                                item.due_status === "vencido"
                                  ? "text-rose-400"
                                  : item.due_status === "por_vencer"
                                  ? "text-amber-300"
                                  : "text-slate-300"
                              }`}
                            >
                              {formatLoanDateTime(item.fecha_devolucion_estimada)}
                            </span>
                            {item.estado === "Activo" && (
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {getLoanTimeBadge(item.fecha_devolucion_estimada, item.estado)}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-500">Permanente</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs">
                        {item.order ? (
                          <span className="inline-flex items-center gap-1 font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                            {item.order.codigo_pedido}
                          </span>
                        ) : (
                          <span className="text-slate-500">Directo</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              item.estado === "Activo"
                                ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                                : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {item.estado}
                          </span>
                          {item.estado === "Activo" && item.due_status === "vencido" && (
                            <span className="text-[10px] font-semibold text-rose-400">
                              Vencido
                            </span>
                          )}
                          {item.estado === "Activo" && item.due_status === "por_vencer" && (
                            <span className="text-[10px] font-semibold text-amber-400">
                              Por vencer (&le;2h)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        {item.estado === "Activo" ? (
                          <button
                            onClick={() => handleOpenReturn(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Registrar Devolución</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 italic">
                            Condición: {item.condicion_devolucion || "Operativo"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {assignmentsData && assignmentsData.last_page > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400">
            <span>
              Página {assignmentsData.current_page} de {assignmentsData.last_page} (
              {assignmentsData.total} registros en total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                Anterior
              </button>
              <button
                disabled={page >= assignmentsData.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Assign Asset */}
      <AnimatePresence>
        {openAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden my-8"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-cyan-400" />
                  Asignar Activo de Hardware a Colaborador
                </h3>
                <button
                  onClick={() => setOpenAssignModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleAssignSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Activo Tecnológico (En Stock) *
                  </label>
                  <select
                    required
                    value={assignForm.id_activo}
                    onChange={(e) => setAssignForm({ ...assignForm, id_activo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">Seleccione un activo disponible</option>
                    {lookups?.stock?.map((a) => (
                      <option key={a.id_activo} value={a.id_activo}>
                        [{a.codigo_patrimonial}] {a.nombre} ({a.marca} {a.modelo})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Colaborador Asignado *
                    </label>
                    <select
                      required
                      value={assignForm.id_usuario_asignado}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, id_usuario_asignado: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">Seleccione un colaborador</option>
                      {lookups?.team?.map((u) => (
                        <option key={u.id_usuario} value={u.id_usuario}>
                          {u.nombre} ({u.correo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Área Solicitante *
                    </label>
                    <select
                      required
                      value={assignForm.id_area_solicitante}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, id_area_solicitante: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">Seleccione área solicitante</option>
                      {lookups?.areas?.map((a) => (
                        <option key={a.id_area} value={a.id_area}>
                          {a.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Área Destino / Ubicación Física
                    </label>
                    <select
                      value={assignForm.id_area_destino}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, id_area_destino: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">Misma que área solicitante</option>
                      {lookups?.areas?.map((a) => (
                        <option key={a.id_area} value={a.id_area}>
                          {a.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Ticket / Pedido de Origen
                    </label>
                    <select
                      value={assignForm.id_pedido}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, id_pedido: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">Asignación directa (Sin ticket)</option>
                      {lookups?.orders?.map((o) => (
                        <option key={o.id_pedido} value={o.id_pedido}>
                          {o.codigo_pedido}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-300">
                        Duración del Préstamo (Horas) *
                      </label>
                      <span className="text-[11px] text-cyan-400 font-mono">
                        {parseFloat(assignForm.horas_prestamo) > 0 ? (
                          <>
                            Vence:{" "}
                            {new Date(Date.now() + parseFloat(assignForm.horas_prestamo) * 3600 * 1000).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </>
                        ) : (
                          "Indefinido"
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                      {[
                        { label: "2 hrs", value: "2" },
                        { label: "4 hrs", value: "4" },
                        { label: "8 hrs (Turno)", value: "8" },
                        { label: "24 hrs (1d)", value: "24" },
                      ].map((preset) => (
                        <button
                          type="button"
                          key={preset.value}
                          onClick={() => setAssignForm({ ...assignForm, horas_prestamo: preset.value })}
                          className={`py-1 px-1.5 rounded-lg text-xs font-medium transition-all ${
                            assignForm.horas_prestamo === preset.value
                              ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        min="0.5"
                        max="720"
                        step="0.5"
                        placeholder="Horas de préstamo (ej. 4, 8, 24)..."
                        value={assignForm.horas_prestamo}
                        onChange={(e) =>
                          setAssignForm({
                            ...assignForm,
                            horas_prestamo: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-500">horas</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Condición de Entrega
                    </label>
                    <select
                      value={assignForm.condicion_entrega}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, condicion_entrega: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="Operativo">Operativo (100% Funcional)</option>
                      <option value="Bueno">Bueno (Detalles menores de uso)</option>
                      <option value="Regular">Regular (Requiere atención)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Observaciones de Entrega
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Accesorios entregados (cargador, mouse, mochila), estado físico..."
                    value={assignForm.observaciones_entrega}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, observaciones_entrega: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenAssignModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={assignMutation.isPending}
                    className="px-5 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {assignMutation.isPending ? "Asignando..." : "Registrar Asignación"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Return Asset */}
      <AnimatePresence>
        {openReturnModal && selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden my-8"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-emerald-400" />
                  Registrar Devolución de Activo
                </h3>
                <button
                  onClick={() => setOpenReturnModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                <div>
                  <span className="text-slate-500">Activo: </span>
                  <span className="text-cyan-400 font-mono font-bold">
                    {selectedAssignment.asset?.codigo_patrimonial || selectedAssignment.asset_code}
                  </span>{" "}
                  - {selectedAssignment.asset?.nombre || selectedAssignment.asset_name}
                </div>
                <div>
                  <span className="text-slate-500">Colaborador: </span>
                  <span className="text-white font-medium">
                    {selectedAssignment.assigned_user?.nombre_completo}
                  </span>
                </div>
              </div>

              <form onSubmit={handleReturnSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Condición Física de Devolución *
                  </label>
                  <select
                    value={returnForm.condicion_devolucion}
                    onChange={(e) =>
                      setReturnForm({ ...returnForm, condicion_devolucion: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="Operativo">Operativo (En buen estado)</option>
                    <option value="Dañado">Dañado / Con Fallas (Derivar a Mantenimiento)</option>
                    <option value="Incompleto">Incompleto (Falta accesorio/cargador)</option>
                  </select>
                  {returnForm.condicion_devolucion === "Dañado" && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>
                        El activo se marcará en estado "Mantenimiento" y se generará una orden preventiva/correctiva automáticamente.
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Observaciones de la Devolución
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Detalles del estado de recepción, componentes recibidos..."
                    value={returnForm.observaciones_devolucion}
                    onChange={(e) =>
                      setReturnForm({ ...returnForm, observaciones_devolucion: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenReturnModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={returnMutation.isPending}
                    className="px-5 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {returnMutation.isPending ? "Procesando..." : "Confirmar Recepción"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
