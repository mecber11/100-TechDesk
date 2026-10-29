import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench,
  Plus,
  Search,
  Clock,
  AlertTriangle,
  X,
  FileText,
  Check,
  Trash2,
  Edit2,
} from "lucide-react";
import { api, type Paged } from "../../lib/api";
import type { Asset, AssetMaintenance } from "./types";

export function AssetMaintenanceTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  // Modal states
  const [openModal, setOpenModal] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<AssetMaintenance | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<AssetMaintenance | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const initialForm = {
    id_activo: "",
    tipo_mantenimiento: "Preventivo" as "Preventivo" | "Correctivo",
    titulo: "",
    descripcion_falla: "",
    diagnostico_solucion: "",
    piezas_reemplazadas: "",
    costo: "0.00",
    tecnico_responsable: "",
    estado: "Programado" as "Programado" | "EnProceso" | "Completado" | "Cancelado",
    fecha_programada: new Date().toISOString().split("T")[0],
    fecha_ejecucion: "",
    proximo_mantenimiento_sugerido: "",
    observaciones: "",
  };
  const [form, setForm] = useState(initialForm);

  // Query Maintenances
  const queryUrl = `/techdesk/maintenances?page=${page}&per_page=12${
    statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ""
  }${typeFilter ? `&tipo=${encodeURIComponent(typeFilter)}` : ""}${
    search ? `&search=${encodeURIComponent(search)}` : ""
  }`;

  const { data: maintenanceData, isLoading } = useQuery({
    queryKey: ["techdesk-maintenances", page, statusFilter, typeFilter, search],
    queryFn: () => api<Paged<AssetMaintenance>>(queryUrl),
  });

  // Query assets for dropdown
  const { data: assetsData } = useQuery({
    queryKey: ["techdesk-all-assets-compact"],
    queryFn: () => api<Paged<Asset>>("/techdesk/assets?per_page=100"),
    enabled: openModal,
  });

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: (payload: any) => {
      if (editingMaintenance) {
        return api(`/techdesk/maintenances/${editingMaintenance.id_mantenimiento}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
      return api("/techdesk/maintenances", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["techdesk-maintenances"] });
      qc.invalidateQueries({ queryKey: ["techdesk-assets"] });
      qc.invalidateQueries({ queryKey: ["techdesk-assets-kpis"] });
      setOpenModal(false);
      setEditingMaintenance(null);
      setForm(initialForm);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Error al registrar el mantenimiento.");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      api(`/techdesk/maintenances/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["techdesk-maintenances"] });
      setSelectedDetail(null);
    },
    onError: (err: any) => {
      alert(err.message || "No se pudo eliminar el mantenimiento.");
    },
  });

  // Quick Complete Mutation
  const completeMutation = useMutation({
    mutationFn: (m: AssetMaintenance) =>
      api(`/techdesk/maintenances/${m.id_mantenimiento}`, {
        method: "PUT",
        body: JSON.stringify({
          ...m,
          estado: "Completado",
          fecha_ejecucion: new Date().toISOString().split("T")[0],
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["techdesk-maintenances"] });
      qc.invalidateQueries({ queryKey: ["techdesk-assets"] });
    },
  });

  function handleOpenCreate() {
    setEditingMaintenance(null);
    setForm(initialForm);
    setErrorMsg(null);
    setOpenModal(true);
  }

  function handleOpenEdit(m: AssetMaintenance) {
    setEditingMaintenance(m);
    setForm({
      id_activo: String(m.id_activo),
      tipo_mantenimiento: m.tipo_mantenimiento,
      titulo: m.titulo,
      descripcion_falla: m.descripcion_falla || "",
      diagnostico_solucion: m.diagnostico_solucion || "",
      piezas_reemplazadas: m.piezas_reemplazadas || "",
      costo: String(m.costo || "0.00"),
      tecnico_responsable: m.tecnico_responsable,
      estado: m.estado,
      fecha_programada: m.fecha_programada ? m.fecha_programada.substring(0, 10) : "",
      fecha_ejecucion: m.fecha_ejecucion ? m.fecha_ejecucion.substring(0, 10) : "",
      proximo_mantenimiento_sugerido: m.proximo_mantenimiento_sugerido
        ? m.proximo_mantenimiento_sugerido.substring(0, 10)
        : "",
      observaciones: m.observaciones || "",
    });
    setErrorMsg(null);
    setOpenModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const payload = {
      id_activo: parseInt(form.id_activo, 10),
      tipo_mantenimiento: form.tipo_mantenimiento,
      titulo: form.titulo,
      descripcion_falla: form.descripcion_falla || null,
      diagnostico_solucion: form.diagnostico_solucion || null,
      piezas_reemplazadas: form.piezas_reemplazadas || null,
      costo: parseFloat(form.costo) || 0,
      tecnico_responsable: form.tecnico_responsable,
      estado: form.estado,
      fecha_programada: form.fecha_programada,
      fecha_ejecucion: form.fecha_ejecucion || null,
      proximo_mantenimiento_sugerido: form.proximo_mantenimiento_sugerido || null,
      observaciones: form.observaciones || null,
    };

    saveMutation.mutate(payload);
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
              placeholder="Buscar por título, técnico o equipo..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="">Todos los tipos</option>
            <option value="Preventivo">Mantenimiento Preventivo</option>
            <option value="Correctivo">Mantenimiento Correctivo</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="">Todos los estados</option>
            <option value="Programado">Programado</option>
            <option value="EnProceso">En Proceso</option>
            <option value="Completado">Completado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-medium text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Registrar Mantenimiento</span>
        </button>
      </div>

      {/* Maintenance Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden backdrop-blur-md shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase text-slate-400 font-semibold">
              <tr>
                <th className="px-5 py-3.5">Activo Tecnológico</th>
                <th className="px-5 py-3.5">Tipo</th>
                <th className="px-5 py-3.5">Título / Motivo</th>
                <th className="px-5 py-3.5">Técnico Responsable</th>
                <th className="px-5 py-3.5">Fecha Programada</th>
                <th className="px-5 py-3.5">Costo (S/.)</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Clock className="h-6 w-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    Cargando historial técnico...
                  </td>
                </tr>
              ) : !maintenanceData?.data?.length ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Wrench className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    No se encontraron registros de mantenimiento.
                  </td>
                </tr>
              ) : (
                maintenanceData.data.map((m) => (
                  <tr
                    key={m.id_mantenimiento}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-mono text-cyan-400 text-xs font-bold">
                        {m.asset?.codigo_patrimonial || m.asset_code}
                      </div>
                      <div className="text-xs text-slate-300 max-w-xs truncate">
                        {m.asset?.nombre || m.asset_name}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs">
                      <span
                        className={`px-2.5 py-1 rounded-md font-medium border ${
                          m.tipo_mantenimiento === "Preventivo"
                            ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                            : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {m.tipo_mantenimiento}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium text-white max-w-xs truncate">
                      {m.titulo}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-300">
                      {m.tecnico_responsable}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-300">
                      {m.fecha_programada ? m.fecha_programada.substring(0, 10) : "-"}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-mono text-xs text-slate-200">
                      S/. {Number(m.costo || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          m.estado === "Completado"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : m.estado === "EnProceso"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : m.estado === "Programado"
                            ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                            : "bg-slate-500/15 text-slate-400 border border-slate-600"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {m.estado}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right space-x-1.5">
                      {m.estado !== "Completado" && (
                        <button
                          title="Marcar como Completado"
                          onClick={() => completeMutation.mutate(m)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        title="Ver Ficha de Mantenimiento"
                        onClick={() => setSelectedDetail(m)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {maintenanceData && maintenanceData.last_page > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400">
            <span>
              Página {maintenanceData.current_page} de {maintenanceData.last_page} (
              {maintenanceData.total} mantenimientos en total)
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
                disabled={page >= maintenanceData.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {selectedDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden my-8 space-y-4"
            >
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-mono text-xs font-bold border border-amber-500/30">
                    Mantenimiento {selectedDetail.tipo_mantenimiento}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-white">
                    {selectedDetail.titulo}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Activo: [{selectedDetail.asset?.codigo_patrimonial}] {selectedDetail.asset?.nombre}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block mb-1">Descripción de la Falla / Motivo:</span>
                  <p className="text-slate-200">
                    {selectedDetail.descripcion_falla || "Sin descripción de falla."}
                  </p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block mb-1">Diagnóstico y Solución Técnica:</span>
                  <p className="text-slate-200">
                    {selectedDetail.diagnostico_solucion || "Diagnóstico pendiente o en proceso."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 block mb-1">Piezas Reemplazadas:</span>
                    <p className="text-slate-200">
                      {selectedDetail.piezas_reemplazadas || "Ninguna pieza reemplazada."}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 block mb-1">Costo Incurrido:</span>
                    <p className="text-emerald-400 font-mono font-bold text-sm">
                      S/. {Number(selectedDetail.costo || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-slate-400 text-[11px]">
                  <div>
                    Técnico: <span className="text-slate-200 font-medium">{selectedDetail.tecnico_responsable}</span>
                  </div>
                  <div>
                    Próximo Mantenimiento:{" "}
                    <span className="text-cyan-400 font-medium">
                      {selectedDetail.proximo_mantenimiento_sugerido || "No programado"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("¿Estás seguro de eliminar este registro de mantenimiento?")) {
                      deleteMutation.mutate(selectedDetail.id_mantenimiento);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Eliminar</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const m = selectedDetail;
                      setSelectedDetail(null);
                      handleOpenEdit(m);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDetail(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT MODAL */}
      <AnimatePresence>
        {openModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden my-8"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-amber-400" />
                  {editingMaintenance
                    ? "Editar Ficha de Mantenimiento"
                    : "Programar / Registrar Mantenimiento"}
                </h3>
                <button
                  onClick={() => setOpenModal(false)}
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

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Activo a Intervenir *
                    </label>
                    <select
                      required
                      value={form.id_activo}
                      onChange={(e) => setForm({ ...form, id_activo: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">-- Seleccionar activo --</option>
                      {assetsData?.data?.map((asset) => (
                        <option key={asset.id_activo} value={asset.id_activo}>
                          [{asset.codigo_patrimonial}] {asset.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Tipo de Mantenimiento *
                    </label>
                    <select
                      value={form.tipo_mantenimiento}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          tipo_mantenimiento: e.target.value as "Preventivo" | "Correctivo",
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="Preventivo">Preventivo (Limpieza, pasta térmica, updates)</option>
                      <option value="Correctivo">Correctivo (Reparación, fallo de pieza)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Título o Motivo de la Intervención *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Cambio de pantalla y mantenimiento térmico"
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Descripción de Falla / Síntomas
                  </label>
                  <textarea
                    rows={2}
                    placeholder="El equipo se recalienta, pantalla parpadea..."
                    value={form.descripcion_falla}
                    onChange={(e) => setForm({ ...form, descripcion_falla: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Diagnóstico y Solución Técnica Aplicada
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Se desarmó el chasis, reemplazo de pasta disipadora..."
                    value={form.diagnostico_solucion}
                    onChange={(e) => setForm({ ...form, diagnostico_solucion: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Piezas o Repuestos Reemplazados
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Ventilador 5V, SSD Kingston 500GB"
                      value={form.piezas_reemplazadas}
                      onChange={(e) => setForm({ ...form, piezas_reemplazadas: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Costo de Reparación / Piezas (S/.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.costo}
                      onChange={(e) => setForm({ ...form, costo: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Técnico Responsable *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Ing. Mecola B."
                      value={form.tecnico_responsable}
                      onChange={(e) => setForm({ ...form, tecnico_responsable: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Estado *
                    </label>
                    <select
                      value={form.estado}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          estado: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="Programado">Programado</option>
                      <option value="EnProceso">En Proceso</option>
                      <option value="Completado">Completado</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Fecha Programada *
                    </label>
                    <input
                      type="date"
                      required
                      value={form.fecha_programada}
                      onChange={(e) => setForm({ ...form, fecha_programada: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="px-5 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {saveMutation.isPending ? "Guardando..." : "Guardar Mantenimiento"}
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
