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
} from "lucide-react";
import { api, type Paged } from "../../lib/api";
import type { Asset, AssetAssignment } from "./types";

export function AssetAssignmentsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Activo");
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
    id_area_destino: "",
    id_pedido: "",
    fecha_devolucion_estimada: "",
    condicion_entrega: "Operativo",
    observaciones_entrega: "",
  });

  const [returnForm, setReturnForm] = useState({
    condicion_devolucion: "Operativo",
    observaciones_devolucion: "",
  });

  // Query Assignments
  const queryUrl = `/techdesk/assignments?page=${page}&per_page=12${
    statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ""
  }${search ? `&search=${encodeURIComponent(search)}` : ""}`;

  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ["techdesk-assignments", page, statusFilter, search],
    queryFn: () => api<Paged<AssetAssignment>>(queryUrl),
  });

  // Query available stock for assignment dropdown
  const { data: stockData } = useQuery({
    queryKey: ["techdesk-available-stock"],
    queryFn: () => api<{ data: Asset[] }>("/techdesk/assets/stock"),
    enabled: openAssignModal,
  });

  // Query lookups (team & areas)
  const { data: teamData } = useQuery({
    queryKey: ["team-all"],
    queryFn: () => api<any[]>("/team"),
    enabled: openAssignModal,
  });

  const { data: lookupsData } = useQuery({
    queryKey: ["lookups"],
    queryFn: () => api<{ areas: { area_id: number; name: string; code: string }[] }>("/lookups"),
    enabled: openAssignModal,
  });

  // Mutation Assign
  const assignMutation = useMutation({
    mutationFn: (payload: any) =>
      api("/techdesk/assignments", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["techdesk-assignments"] });
      qc.invalidateQueries({ queryKey: ["techdesk-assets"] });
      qc.invalidateQueries({ queryKey: ["techdesk-assets-kpis"] });
      setOpenAssignModal(false);
      setAssignForm({
        id_activo: "",
        id_usuario_asignado: "",
        id_area_destino: "",
        id_pedido: "",
        fecha_devolucion_estimada: "",
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
      id_area_destino: assignForm.id_area_destino ? parseInt(assignForm.id_area_destino, 10) : null,
      id_pedido: assignForm.id_pedido ? parseInt(assignForm.id_pedido, 10) : null,
      fecha_devolucion_estimada: assignForm.fecha_devolucion_estimada || null,
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

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por colaborador, código o equipo..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="flex bg-slate-950/80 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => {
                setStatusFilter("Activo");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === "Activo"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Préstamos Activos
            </button>
            <button
              onClick={() => {
                setStatusFilter("Devuelto");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === "Devuelto"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Historial de Devoluciones
            </button>
            <button
              onClick={() => {
                setStatusFilter("");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === ""
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setOpenAssignModal(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva Asignación / Préstamo</span>
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden backdrop-blur-md shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase text-slate-400 font-semibold">
              <tr>
                <th className="px-5 py-3.5">Colaborador Asignado</th>
                <th className="px-5 py-3.5">Área</th>
                <th className="px-5 py-3.5">Activo / Equipo</th>
                <th className="px-5 py-3.5">Fecha Entrega</th>
                <th className="px-5 py-3.5">Devolución Estimada</th>
                <th className="px-5 py-3.5">Ticket Vinculado</th>
                <th className="px-5 py-3.5">Estado</th>
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
                assignmentsData.data.map((item) => (
                  <tr
                    key={item.id_asignacion}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-semibold text-white">
                        {item.assigned_user?.nombre_completo || "Usuario"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.assigned_user?.correo}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-300">
                      <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60">
                        {item.assigned_area?.nombre || "Sin área"}
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
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-300">
                      {item.fecha_asignacion ? item.fecha_asignacion.substring(0, 10) : "-"}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs">
                      {item.fecha_devolucion_real ? (
                        <span className="text-emerald-400 font-medium">
                          Devuelto el {item.fecha_devolucion_real.substring(0, 10)}
                        </span>
                      ) : item.fecha_devolucion_estimada ? (
                        <span className="text-amber-300 font-medium">
                          {item.fecha_devolucion_estimada.substring(0, 10)}
                        </span>
                      ) : (
                        <span className="text-slate-500">Indefinido / Permanente</span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs">
                      {item.order ? (
                        <span className="inline-flex items-center gap-1 font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                          {item.order.codigo_pedido}
                        </span>
                      ) : (
                        <span className="text-slate-500">Asignación directa</span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.estado === "Activo"
                            ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                            : item.estado === "Devuelto"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {item.estado}
                      </span>
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
                ))
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
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleAssignSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Seleccionar Activo Disponible en Stock *
                  </label>
                  <select
                    required
                    value={assignForm.id_activo}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, id_activo: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">-- Elige un equipo disponible --</option>
                    {stockData?.data?.map((asset) => (
                      <option key={asset.id_activo} value={asset.id_activo}>
                        [{asset.codigo_patrimonial}] {asset.nombre} ({asset.marca} {asset.modelo})
                      </option>
                    ))}
                  </select>
                  {!stockData?.data?.length && (
                    <p className="mt-1 text-[11px] text-amber-400">
                      No hay activos en estado 'Disponible' en el almacén de TI.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Colaborador Destinatario *
                    </label>
                    <select
                      required
                      value={assignForm.id_usuario_asignado}
                      onChange={(e) =>
                        setAssignForm({
                          ...assignForm,
                          id_usuario_asignado: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">-- Seleccionar integrante --</option>
                      {teamData?.map((user: any) => (
                        <option key={user.id_usuario} value={user.id_usuario}>
                          {user.nombre_completo} ({user.correo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Área Destino
                    </label>
                    <select
                      value={assignForm.id_area_destino}
                      onChange={(e) =>
                        setAssignForm({
                          ...assignForm,
                          id_area_destino: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">-- Seleccionar área (opcional) --</option>
                      {lookupsData?.areas?.map((area) => (
                        <option key={area.area_id} value={area.area_id}>
                          {area.name} ({area.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      ID Ticket / Pedido Vinculado (Opcional)
                    </label>
                    <input
                      type="number"
                      placeholder="Ej: 104"
                      value={assignForm.id_pedido}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, id_pedido: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-500">
                      Asocia esta entrega a una solicitud de hardware previa
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Fecha Estimada de Devolución
                    </label>
                    <input
                      type="date"
                      value={assignForm.fecha_devolucion_estimada}
                      onChange={(e) =>
                        setAssignForm({
                          ...assignForm,
                          fecha_devolucion_estimada: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Condición de Entrega
                  </label>
                  <input
                    type="text"
                    value={assignForm.condicion_entrega}
                    onChange={(e) =>
                      setAssignForm({
                        ...assignForm,
                        condicion_entrega: e.target.value,
                      })
                    }
                    placeholder="Operativo con cargador y funda"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Observaciones de Entrega
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Comentarios o especificaciones sobre el préstamo..."
                    value={assignForm.observaciones_entrega}
                    onChange={(e) =>
                      setAssignForm({
                        ...assignForm,
                        observaciones_entrega: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenAssignModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={assignMutation.isPending || !stockData?.data?.length}
                    className="px-5 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {assignMutation.isPending ? "Asignando..." : "Confirmar Asignación"}
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
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="mt-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                <div>
                  <span className="text-slate-500">Equipo: </span>
                  <span className="text-white font-medium">
                    [{selectedAssignment.asset?.codigo_patrimonial}] {selectedAssignment.asset?.nombre}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Devuelto por: </span>
                  <span className="text-cyan-400 font-medium">
                    {selectedAssignment.assigned_user?.nombre_completo}
                  </span>
                </div>
              </div>

              <form onSubmit={handleReturnSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Condición Física al Devolver *
                  </label>
                  <select
                    required
                    value={returnForm.condicion_devolucion}
                    onChange={(e) =>
                      setReturnForm({
                        ...returnForm,
                        condicion_devolucion: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="Operativo">Operativo (Vuelve a stock disponible)</option>
                    <option value="Bueno">Bueno (Vuelve a stock disponible)</option>
                    <option value="Regular">Regular (Requiere inspección)</option>
                    <option value="Dañado">Dañado / Averiado (Pasa a mantenimiento)</option>
                    <option value="Malo">Malo (Pasa a mantenimiento)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Observaciones de la Recepción
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Detalles sobre accesorios devueltos, estado de la batería, pantalla..."
                    value={returnForm.observaciones_devolucion}
                    onChange={(e) =>
                      setReturnForm({
                        ...returnForm,
                        observaciones_devolucion: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenReturnModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={returnMutation.isPending}
                    className="px-5 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
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
