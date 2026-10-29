import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Laptop,
  Plus,
  Search,
  FileText,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Cpu,
  Trash2,
  Edit2,
  X,
  Layers,
} from "lucide-react";
import { api, type Paged } from "../../lib/api";
import type { Asset, AssetType, AssetStatus, AssetCondition } from "./types";

const ASSET_TYPES: AssetType[] = [
  "Laptop",
  "Desktop",
  "Monitor",
  "Periférico",
  "Accesorio de Red",
  "Servidor",
  "Impresora",
  "Otro",
];

const initialForm = {
  codigo_patrimonial: "",
  numero_serie: "",
  nombre: "",
  tipo: "Laptop" as AssetType,
  marca: "",
  modelo: "",
  procesador: "",
  ram: "",
  almacenamiento: "",
  so: "",
  estado: "Disponible" as AssetStatus,
  condicion_fisica: "Bueno" as AssetCondition,
  ubicacion: "Almacén TI",
  fecha_adquisicion: new Date().toISOString().split("T")[0],
  costo_adquisicion: "",
  vida_util_meses: "36",
  notas: "",
};

export function AssetInventoryTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [page, setPage] = useState(1);

  // Modals state
  const [openModal, setOpenModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState(initialForm);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<Asset | null>(null);

  // Query Assets
  const queryUrl = `/techdesk/assets?page=${page}&per_page=12${
    search ? `&search=${encodeURIComponent(search)}` : ""
  }${selectedType ? `&tipo=${encodeURIComponent(selectedType)}` : ""}${
    selectedStatus ? `&estado=${encodeURIComponent(selectedStatus)}` : ""
  }`;

  const { data: assetsData, isLoading } = useQuery({
    queryKey: ["techdesk-assets", page, search, selectedType, selectedStatus],
    queryFn: () => api<Paged<Asset>>(queryUrl),
  });

  const { data: kpisData } = useQuery({
    queryKey: ["techdesk-assets-kpis"],
    queryFn: () => api<{ data: any }>("/techdesk/assets/kpis"),
  });

  const kpis = kpisData?.data;

  // Mutation Create / Update
  const saveMutation = useMutation({
    mutationFn: (payload: any) => {
      if (editingAsset) {
        return api(`/techdesk/assets/${editingAsset.id_activo}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
      return api("/techdesk/assets", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["techdesk-assets"] });
      qc.invalidateQueries({ queryKey: ["techdesk-assets-kpis"] });
      setOpenModal(false);
      setEditingAsset(null);
      setForm(initialForm);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Error al guardar el activo.");
    },
  });

  // Mutation Delete
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      api(`/techdesk/assets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["techdesk-assets"] });
      qc.invalidateQueries({ queryKey: ["techdesk-assets-kpis"] });
      setSelectedAssetDetail(null);
    },
    onError: (err: any) => {
      alert(err.message || "No se pudo eliminar el activo.");
    },
  });

  function handleOpenCreate() {
    setEditingAsset(null);
    setForm(initialForm);
    setErrorMsg(null);
    setOpenModal(true);
  }

  function handleOpenEdit(asset: Asset) {
    setEditingAsset(asset);
    const specs = asset.especificaciones || {};
    setForm({
      codigo_patrimonial: asset.codigo_patrimonial,
      numero_serie: asset.numero_serie || "",
      nombre: asset.nombre,
      tipo: asset.tipo,
      marca: asset.marca,
      modelo: asset.modelo,
      procesador: specs.procesador || "",
      ram: specs.ram || "",
      almacenamiento: specs.almacenamiento || "",
      so: specs.so || "",
      estado: asset.estado,
      condicion_fisica: asset.condicion_fisica,
      ubicacion: asset.ubicacion || "",
      fecha_adquisicion: asset.fecha_adquisicion ? asset.fecha_adquisicion.substring(0, 10) : "",
      costo_adquisicion: asset.costo_adquisicion ? String(asset.costo_adquisicion) : "",
      vida_util_meses: String(asset.vida_util_meses || 36),
      notas: asset.notas || "",
    });
    setErrorMsg(null);
    setOpenModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const payload = {
      codigo_patrimonial: form.codigo_patrimonial,
      numero_serie: form.numero_serie || null,
      nombre: form.nombre,
      tipo: form.tipo,
      marca: form.marca,
      modelo: form.modelo,
      especificaciones: {
        procesador: form.procesador || undefined,
        ram: form.ram || undefined,
        almacenamiento: form.almacenamiento || undefined,
        so: form.so || undefined,
      },
      estado: form.estado,
      condicion_fisica: form.condicion_fisica,
      ubicacion: form.ubicacion,
      fecha_adquisicion: form.fecha_adquisicion || null,
      costo_adquisicion: form.costo_adquisicion ? parseFloat(form.costo_adquisicion) : null,
      vida_util_meses: parseInt(form.vida_util_meses, 10) || 36,
      notas: form.notas || null,
    };

    saveMutation.mutate(payload);
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-950 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              Total Activos
            </span>
            <Laptop className="h-5 w-5 text-cyan-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-white tracking-tight">
            {kpis?.total_activos ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-400">Equipos e insumos registrados</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Stock Disponible
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-400 tracking-tight">
            {kpis?.disponibles ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-400">Listos para asignación física</p>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-slate-900 to-slate-950 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              En Uso / Asignados
            </span>
            <Layers className="h-5 w-5 text-blue-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-blue-300 tracking-tight">
            {kpis?.asignados ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-400">En posesión de colaboradores</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              En Mantenimiento
            </span>
            <Wrench className="h-5 w-5 text-amber-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-amber-300 tracking-tight">
            {kpis?.en_mantenimiento ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-400">Revisión preventiva o correctiva</p>
        </div>
      </div>

      {/* Control Bar: Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, serie, marca o modelo..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="">Todos los tipos</option>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="">Todos los estados</option>
            <option value="Disponible">Disponible</option>
            <option value="Asignado">Asignado</option>
            <option value="Mantenimiento">Mantenimiento</option>
            <option value="Baja">De Baja</option>
          </select>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Activo TI</span>
        </button>
      </div>

      {/* Assets Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden backdrop-blur-md shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase text-slate-400 font-semibold">
              <tr>
                <th className="px-5 py-3.5">Código / Serie</th>
                <th className="px-5 py-3.5">Equipo / Nombre</th>
                <th className="px-5 py-3.5">Tipo</th>
                <th className="px-5 py-3.5">Marca / Modelo</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Condición</th>
                <th className="px-5 py-3.5">Ubicación Actual</th>
                <th className="px-5 py-3.5 text-right">Ficha Técnica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Clock className="h-6 w-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    Cargando inventario de activos...
                  </td>
                </tr>
              ) : !assetsData?.data?.length ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Laptop className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    No se encontraron activos tecnológicos registrados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                assetsData.data.map((asset) => (
                  <tr
                    key={asset.id_activo}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-cyan-400 text-xs">
                        {asset.codigo_patrimonial}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {asset.numero_serie ? `S/N: ${asset.numero_serie}` : "Sin serie"}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium text-white max-w-xs truncate">
                      {asset.nombre}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-300">
                      <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 font-medium">
                        {asset.tipo}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-300">
                      {asset.marca} {asset.modelo}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          asset.estado === "Disponible"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : asset.estado === "Asignado"
                            ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                            : asset.estado === "Mantenimiento"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {asset.estado}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs">
                      <span
                        className={`${
                          asset.condicion_fisica === "Bueno" || asset.condicion_fisica === "Nuevo"
                            ? "text-slate-300"
                            : "text-amber-400 font-medium"
                        }`}
                      >
                        {asset.condicion_fisica}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-400">
                      {asset.current_assignment?.assigned_user ? (
                        <span className="text-cyan-300 font-medium">
                          {asset.current_assignment.assigned_user.nombre_completo}
                        </span>
                      ) : (
                        asset.ubicacion || "Almacén TI"
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedAssetDetail(asset)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Ficha Técnica</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {assetsData && assetsData.last_page > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400">
            <span>
              Página {assetsData.current_page} de {assetsData.last_page} ({assetsData.total} activos en total)
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
                disabled={page >= assetsData.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Digital Technical Sheet (Ficha Técnica Digital & Depreciación) */}
      <AnimatePresence>
        {selectedAssetDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden my-8"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 font-mono text-xs font-bold border border-cyan-500/30">
                      {selectedAssetDetail.codigo_patrimonial}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        selectedAssetDetail.estado === "Disponible"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : selectedAssetDetail.estado === "Asignado"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {selectedAssetDetail.estado}
                    </span>
                  </div>
                  <h3 className="mt-2 text-xl font-bold text-white">
                    {selectedAssetDetail.nombre}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedAssetDetail.tipo} • {selectedAssetDetail.marca} {selectedAssetDetail.modelo}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAssetDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Technical Specifications */}
              <div className="mt-5 space-y-4">
                <h4 className="text-xs font-semibold uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                  <Cpu className="h-4 w-4" /> Especificaciones de Hardware
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[11px] text-slate-500 block">Número de Serie</span>
                    <span className="text-xs font-mono font-medium text-slate-200">
                      {selectedAssetDetail.numero_serie || "N/A"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[11px] text-slate-500 block">Procesador</span>
                    <span className="text-xs font-medium text-slate-200">
                      {selectedAssetDetail.especificaciones?.procesador || "No especificado"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[11px] text-slate-500 block">Memoria RAM</span>
                    <span className="text-xs font-medium text-slate-200">
                      {selectedAssetDetail.especificaciones?.ram || "No especificado"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[11px] text-slate-500 block">Disco / Storage</span>
                    <span className="text-xs font-medium text-slate-200">
                      {selectedAssetDetail.especificaciones?.almacenamiento || "No especificado"}
                    </span>
                  </div>
                </div>

                {/* Financial and Depreciation Analysis */}
                <h4 className="pt-2 text-xs font-semibold uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" /> Ciclo de Vida y Depreciación Técnica
                </h4>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Costo Adquisición:{" "}
                      <b className="text-white">
                        S/. {Number(selectedAssetDetail.costo_adquisicion || 0).toFixed(2)}
                      </b>
                    </span>
                    <span className="text-slate-400">
                      Valor Residual Estimado:{" "}
                      <b className="text-emerald-400">
                        S/. {Number(selectedAssetDetail.depreciation_info?.valor_actual || 0).toFixed(2)}
                      </b>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Desgaste por Depreciación</span>
                      <span className="font-semibold text-cyan-400">
                        {selectedAssetDetail.depreciation_info?.porcentaje_depreciacion ?? 0}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${selectedAssetDetail.depreciation_info?.porcentaje_depreciacion ?? 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-slate-400">
                    <div>
                      Meses de uso transcurridos:{" "}
                      <span className="font-medium text-white">
                        {selectedAssetDetail.depreciation_info?.meses_uso ?? 0} meses
                      </span>
                    </div>
                    <div>
                      Vida útil restante estimada:{" "}
                      <span className="font-medium text-cyan-300">
                        {selectedAssetDetail.depreciation_info?.vida_util_restante_meses ?? 36} meses
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assignment & Location */}
                <h4 className="pt-2 text-xs font-semibold uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4" /> Asignación y Ubicación
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 space-y-1">
                  <div>
                    <span className="text-slate-500">Ubicación Física: </span>
                    <span className="text-slate-200 font-medium">
                      {selectedAssetDetail.ubicacion || "Almacén TI"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Colaborador Asignado: </span>
                    {selectedAssetDetail.current_assignment?.assigned_user ? (
                      <span className="text-cyan-400 font-medium">
                        {selectedAssetDetail.current_assignment.assigned_user.nombre_completo} (
                        {selectedAssetDetail.current_assignment.assigned_user.correo})
                      </span>
                    ) : (
                      <span className="text-slate-500">Ninguno (En Stock)</span>
                    )}
                  </div>
                  {selectedAssetDetail.notas && (
                    <div className="pt-1 text-slate-400 italic">
                      Notas: {selectedAssetDetail.notas}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        `¿Estás seguro de eliminar el activo ${selectedAssetDetail.codigo_patrimonial}? Esta acción no se puede deshacer.`
                      )
                    ) {
                      deleteMutation.mutate(selectedAssetDetail.id_activo);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Eliminar Activo</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const asset = selectedAssetDetail;
                      setSelectedAssetDetail(null);
                      handleOpenEdit(asset);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Editar Activo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAssetDetail(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Register or Edit Asset */}
      <AnimatePresence>
        {openModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden my-8"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Laptop className="h-5 w-5 text-cyan-400" />
                  {editingAsset ? "Editar Activo de TI" : "Registrar Nuevo Activo de TI"}
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
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Código Patrimonial *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: ACT-LAP-001"
                      value={form.codigo_patrimonial}
                      onChange={(e) =>
                        setForm({ ...form, codigo_patrimonial: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 uppercase font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Número de Serie
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 5CD12345XYZ"
                      value={form.numero_serie}
                      onChange={(e) => setForm({ ...form, numero_serie: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nombre Descriptivo del Equipo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Laptop Dell Latitude 5420 Core i7 16GB"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Tipo de Activo *
                    </label>
                    <select
                      value={form.tipo}
                      onChange={(e) => setForm({ ...form, tipo: e.target.value as AssetType })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      {ASSET_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Marca *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Dell, HP, Lenovo"
                      value={form.marca}
                      onChange={(e) => setForm({ ...form, marca: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Modelo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Latitude 5420"
                      value={form.modelo}
                      onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Technical Specs */}
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                  <span className="text-xs font-semibold text-cyan-400 block">
                    Ficha Técnica (Opcional)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Procesador</label>
                      <input
                        type="text"
                        placeholder="Core i7 11va"
                        value={form.procesador}
                        onChange={(e) => setForm({ ...form, procesador: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">RAM</label>
                      <input
                        type="text"
                        placeholder="16GB DDR4"
                        value={form.ram}
                        onChange={(e) => setForm({ ...form, ram: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Disco</label>
                      <input
                        type="text"
                        placeholder="512GB NVMe"
                        value={form.almacenamiento}
                        onChange={(e) => setForm({ ...form, almacenamiento: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Sist. Operativo</label>
                      <input
                        type="text"
                        placeholder="Win 11 Pro"
                        value={form.so}
                        onChange={(e) => setForm({ ...form, so: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Estado Operativo
                    </label>
                    <select
                      value={form.estado}
                      onChange={(e) =>
                        setForm({ ...form, estado: e.target.value as AssetStatus })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="Disponible">Disponible</option>
                      <option value="Asignado">Asignado</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                      <option value="Baja">De Baja</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Condición Física
                    </label>
                    <select
                      value={form.condicion_fisica}
                      onChange={(e) =>
                        setForm({ ...form, condicion_fisica: e.target.value as AssetCondition })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="Nuevo">Nuevo</option>
                      <option value="Bueno">Bueno</option>
                      <option value="Regular">Regular</option>
                      <option value="Malo">Malo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Ubicación de Almacén
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Almacén TI"
                      value={form.ubicacion}
                      onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Fecha Adquisición
                    </label>
                    <input
                      type="date"
                      value={form.fecha_adquisicion}
                      onChange={(e) => setForm({ ...form, fecha_adquisicion: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Costo Adquisición (S/.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej: 3500.00"
                      value={form.costo_adquisicion}
                      onChange={(e) => setForm({ ...form, costo_adquisicion: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Vida Útil Estimada (Meses)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      placeholder="36"
                      value={form.vida_util_meses}
                      onChange={(e) => setForm({ ...form, vida_util_meses: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Notas y Observaciones
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalles adicionales, proveedor, garantía..."
                    value={form.notas}
                    onChange={(e) => setForm({ ...form, notas: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
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
                    className="px-5 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {saveMutation.isPending ? "Guardando..." : "Guardar Activo"}
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
