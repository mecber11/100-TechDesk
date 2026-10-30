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
  Image as ImageIcon,
  Upload,
  Link2Off,
  History,
  Shield,
} from "lucide-react";
import { api, type Paged } from "../../lib/api";
import type {
  Asset,
  AssetType,
  AssetStatus,
  AssetCondition,
  AssetImage,
  ExternalIdentifierType,
} from "./types";

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

const IDENTIFIER_TYPES: ExternalIdentifierType[] = [
  "Ninguno",
  "MAC",
  "IMEI",
  "Serie",
  "ServiceTag",
];

const initialForm = {
  codigo_patrimonial: "",
  numero_serie: "",
  nombre: "",
  tipo: "Laptop" as AssetType,
  marca: "",
  modelo: "",
  tipo_identificador_externo: "Ninguno" as ExternalIdentifierType,
  identificador_alternativo: "",
  emisor_identificador_externo: "",
  id_imagen: null as number | null,
  foto_preview: null as string | null,
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
  const [openReusableModal, setOpenReusableModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState(initialForm);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

  // Query Assets Paginated
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

  // Query reusable images
  const { data: reusableImagesData } = useQuery({
    queryKey: ["techdesk-reusable-images"],
    queryFn: () => api<{ data: AssetImage[] }>("/techdesk/assets/images/reusable"),
    enabled: openReusableModal || openModal,
  });

  // Query detailed asset for Ficha Técnica
  const { data: assetDetailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["techdesk-asset-detail", selectedAssetId],
    queryFn: () => api<{ data: Asset }>(`/techdesk/assets/${selectedAssetId}`),
    enabled: selectedAssetId !== null,
  });

  const selectedAssetDetail = assetDetailData?.data;

  // Mutation Image Upload
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("imagen", file);
      return api<{ data: AssetImage }>("/techdesk/assets/images", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (res) => {
      setForm((prev) => ({
        ...prev,
        id_imagen: res.data.id_imagen,
        foto_preview: res.data.url,
      }));
      qc.invalidateQueries({ queryKey: ["techdesk-reusable-images"] });
    },
    onError: (err: any) => {
      alert(err.message || "Error al subir la imagen. Verifique que sea JPEG/PNG/WebP y menor a 5MB.");
    },
  });

  // Mutation Create / Update Asset
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
      qc.invalidateQueries({ queryKey: ["techdesk-assets-valuation"] });
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
      qc.invalidateQueries({ queryKey: ["techdesk-assets-valuation"] });
      setSelectedAssetId(null);
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
      tipo_identificador_externo: asset.tipo_identificador_externo || "Ninguno",
      identificador_alternativo: asset.identificador_alternativo || "",
      emisor_identificador_externo: asset.emisor_identificador_externo || "",
      id_imagen: asset.id_imagen ?? null,
      foto_preview: asset.imagen?.url || asset.foto_url || null,
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

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen excede el límite permitido de 5 MB.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Solo se admiten formatos JPEG, PNG y WebP.");
      return;
    }

    uploadImageMutation.mutate(file);
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
      tipo_identificador_externo:
        form.tipo_identificador_externo === "Ninguno" ? null : form.tipo_identificador_externo,
      identificador_alternativo:
        form.tipo_identificador_externo !== "Ninguno" && form.identificador_alternativo
          ? form.identificador_alternativo
          : null,
      emisor_identificador_externo:
        form.tipo_identificador_externo !== "Ninguno" && form.emisor_identificador_externo
          ? form.emisor_identificador_externo
          : null,
      id_imagen: form.id_imagen,
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
              placeholder="Buscar por código, serie, identificador físico, marca o modelo..."
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
                <th className="px-5 py-3.5 w-14">Foto</th>
                <th className="px-5 py-3.5">Código / Identificador</th>
                <th className="px-5 py-3.5">Equipo / Nombre</th>
                <th className="px-5 py-3.5">Tipo</th>
                <th className="px-5 py-3.5">Marca / Modelo</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Condición</th>
                <th className="px-5 py-3.5">Ubicación / Asignado</th>
                <th className="px-5 py-3.5 text-right">Ficha Técnica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <Clock className="h-6 w-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    Cargando inventario de activos...
                  </td>
                </tr>
              ) : !assetsData?.data?.length ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <Laptop className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    No se encontraron activos tecnológicos registrados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                assetsData.data.map((asset) => {
                  const photoSrc = asset.imagen?.url || asset.foto_url;
                  return (
                    <tr
                      key={asset.id_activo}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Photo Thumbnail */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                          {photoSrc ? (
                            <img
                              src={photoSrc}
                              alt={asset.nombre}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <Laptop className="h-5 w-5 text-slate-500" />
                          )}
                        </div>
                      </td>

                      {/* Code and Identifiers */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-cyan-400 text-xs">
                          {asset.codigo_patrimonial}
                        </div>
                        {asset.identificador_normalizado ? (
                          <div className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/50 text-[10px] font-mono text-cyan-300">
                            <span className="font-semibold">{asset.tipo_identificador_externo}:</span>
                            <span>{asset.identificador_normalizado}</span>
                          </div>
                        ) : asset.numero_serie ? (
                          <div className="text-[11px] text-slate-500 font-mono">
                            S/N: {asset.numero_serie}
                          </div>
                        ) : null}
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
                          onClick={() => setSelectedAssetId(asset.id_activo)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Ficha Técnica</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
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

      {/* MODAL: Digital Technical Sheet (Ficha Técnica Digital & Depreciación & Historiales) */}
      <AnimatePresence>
        {selectedAssetId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col"
            >
              {isLoadingDetail || !selectedAssetDetail ? (
                <div className="py-16 text-center text-slate-400">
                  <Clock className="h-8 w-8 animate-spin mx-auto mb-3 text-cyan-400" />
                  Cargando ficha técnica completa del activo...
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-start justify-between pb-4 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                        {selectedAssetDetail.imagen?.url || selectedAssetDetail.foto_url ? (
                          <img
                            src={selectedAssetDetail.imagen?.url || selectedAssetDetail.foto_url || ""}
                            alt={selectedAssetDetail.nombre}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Laptop className="h-8 w-8 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-cyan-400 font-bold text-sm">
                            {selectedAssetDetail.codigo_patrimonial}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-semibold text-slate-300">
                            {selectedAssetDetail.tipo}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              selectedAssetDetail.estado === "Disponible"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : selectedAssetDetail.estado === "Asignado"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {selectedAssetDetail.estado}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white mt-1">
                          {selectedAssetDetail.nombre}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {selectedAssetDetail.marca} • {selectedAssetDetail.modelo}
                          {selectedAssetDetail.numero_serie && ` • S/N: ${selectedAssetDetail.numero_serie}`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedAssetId(null)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Scrollable Body */}
                  <div className="overflow-y-auto space-y-5 py-4 pr-1">
                    {/* Identifier Card */}
                    {selectedAssetDetail.identificador_normalizado && (
                      <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-cyan-300 font-medium">
                          <Shield className="h-4 w-4" />
                          <span>Identificador Físico ({selectedAssetDetail.tipo_identificador_externo}):</span>
                          <span className="font-mono font-bold text-cyan-200">
                            {selectedAssetDetail.identificador_normalizado}
                          </span>
                        </div>
                        {selectedAssetDetail.emisor_identificador_externo && (
                          <span className="text-[11px] text-slate-400">
                            Emisor: {selectedAssetDetail.emisor_identificador_externo}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Hardware Specifications */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-cyan-400 tracking-wider flex items-center gap-1.5 mb-2.5">
                        <Cpu className="h-4 w-4" /> Especificaciones de Hardware
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                          <span className="text-[11px] text-slate-500 block">Sistema Operativo</span>
                          <span className="text-xs font-medium text-slate-200">
                            {selectedAssetDetail.especificaciones?.so || "No especificado"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Financial and Depreciation Analysis */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-cyan-400 tracking-wider flex items-center gap-1.5 mb-2.5">
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
                            Valor Residual Actual:{" "}
                            <b className="text-emerald-400">
                              S/. {Number(selectedAssetDetail.depreciation_info?.valor_actual ?? (selectedAssetDetail.costo_adquisicion || 0)).toFixed(2)}
                            </b>
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>Desgaste Acumulado</span>
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

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 text-slate-400">
                          <div>
                            Meses de uso:{" "}
                            <span className="font-medium text-white">
                              {selectedAssetDetail.depreciation_info?.meses_uso ?? 0} meses
                            </span>
                          </div>
                          <div>
                            Vida útil restante:{" "}
                            <span className="font-medium text-cyan-300">
                              {selectedAssetDetail.depreciation_info?.vida_util_restante_meses ?? 36} meses
                            </span>
                          </div>
                          <div>
                            Depreciación mensual:{" "}
                            <span className="font-medium text-slate-300">
                              S/. {Number(selectedAssetDetail.depreciation_info?.depreciacion_mensual || 0).toFixed(2)}
                            </span>
                          </div>
                          <div>
                            Total depreciado:{" "}
                            <span className="font-medium text-rose-300">
                              S/. {Number(selectedAssetDetail.depreciation_info?.depreciacion_acumulada || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Complete Assignments History Table */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-cyan-400 tracking-wider flex items-center gap-1.5 mb-2.5">
                        <History className="h-4 w-4" /> Historial Completo de Préstamos y Asignaciones
                      </h4>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden">
                        {selectedAssetDetail.assignments && selectedAssetDetail.assignments.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-300">
                              <thead className="bg-slate-900 border-b border-slate-800 uppercase text-[10px] text-slate-400 font-semibold">
                                <tr>
                                  <th className="px-3.5 py-2.5">Fecha Inicio</th>
                                  <th className="px-3.5 py-2.5">Colaborador / Área</th>
                                  <th className="px-3.5 py-2.5">F. Devolución</th>
                                  <th className="px-3.5 py-2.5">Condición</th>
                                  <th className="px-3.5 py-2.5">Estado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50">
                                {selectedAssetDetail.assignments.map((asg) => (
                                  <tr key={asg.id_asignacion} className="hover:bg-slate-900/40">
                                    <td className="px-3.5 py-2 whitespace-nowrap font-mono text-[11px]">
                                      {asg.fecha_asignacion ? asg.fecha_asignacion.substring(0, 10) : "-"}
                                    </td>
                                    <td className="px-3.5 py-2">
                                      <div className="font-medium text-white">
                                        {asg.assigned_user?.nombre_completo || `Usuario #${asg.id_usuario_asignado}`}
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        {asg.requesting_area?.nombre || asg.destination_area?.nombre || asg.requesting_area_name || asg.destination_area_name || "Sin área"}
                                      </div>
                                    </td>
                                    <td className="px-3.5 py-2 whitespace-nowrap text-[11px]">
                                      {asg.fecha_devolucion_real
                                        ? asg.fecha_devolucion_real.substring(0, 10)
                                        : asg.fecha_devolucion_estimada
                                        ? `Est: ${asg.fecha_devolucion_estimada.substring(0, 10)}`
                                        : "Vigente"}
                                    </td>
                                    <td className="px-3.5 py-2 text-[11px]">
                                      {asg.condicion_devolucion || asg.condicion_entrega || "Operativo"}
                                    </td>
                                    <td className="px-3.5 py-2 whitespace-nowrap">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                          asg.estado === "Activo"
                                            ? "bg-blue-500/20 text-blue-300"
                                            : "bg-emerald-500/20 text-emerald-300"
                                        }`}
                                      >
                                        {asg.estado}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="py-5 text-center text-xs text-slate-500">
                            No registra historial de asignaciones previas.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Complete Maintenances History Table */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-cyan-400 tracking-wider flex items-center gap-1.5 mb-2.5">
                        <Wrench className="h-4 w-4" /> Historial de Mantenimientos y Reparaciones
                      </h4>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden">
                        {selectedAssetDetail.maintenances && selectedAssetDetail.maintenances.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-300">
                              <thead className="bg-slate-900 border-b border-slate-800 uppercase text-[10px] text-slate-400 font-semibold">
                                <tr>
                                  <th className="px-3.5 py-2.5">Fecha</th>
                                  <th className="px-3.5 py-2.5">Tipo / Título</th>
                                  <th className="px-3.5 py-2.5">Técnico</th>
                                  <th className="px-3.5 py-2.5">Costo</th>
                                  <th className="px-3.5 py-2.5">Estado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50">
                                {selectedAssetDetail.maintenances.map((m) => (
                                  <tr key={m.id_mantenimiento} className="hover:bg-slate-900/40">
                                    <td className="px-3.5 py-2 whitespace-nowrap font-mono text-[11px]">
                                      {m.fecha_ejecucion
                                        ? m.fecha_ejecucion.substring(0, 10)
                                        : m.fecha_programada.substring(0, 10)}
                                    </td>
                                    <td className="px-3.5 py-2">
                                      <div className="font-medium text-white">{m.titulo}</div>
                                      <div className="text-[10px] text-slate-500">
                                        {m.tipo_mantenimiento} • {m.diagnostico_solucion || m.descripcion_falla || "Sin notas"}
                                      </div>
                                    </td>
                                    <td className="px-3.5 py-2 text-[11px] text-slate-300">
                                      {m.tecnico_responsable || "No asignado"}
                                    </td>
                                    <td className="px-3.5 py-2 font-mono text-[11px] text-slate-300">
                                      S/. {Number(m.costo || 0).toFixed(2)}
                                    </td>
                                    <td className="px-3.5 py-2 whitespace-nowrap">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                          m.estado === "Completado"
                                            ? "bg-emerald-500/20 text-emerald-300"
                                            : m.estado === "EnProceso"
                                            ? "bg-blue-500/20 text-blue-300"
                                            : m.estado === "Cancelado"
                                            ? "bg-rose-500/20 text-rose-300"
                                            : "bg-amber-500/20 text-amber-300"
                                        }`}
                                      >
                                        {m.estado}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="py-5 text-center text-xs text-slate-500">
                            No registra mantenimientos previos.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between shrink-0">
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
                          setSelectedAssetId(null);
                          handleOpenEdit(asset);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors cursor-pointer"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span>Editar Activo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedAssetId(null)}
                        className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </>
              )}
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
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
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
                <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 shrink-0">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="overflow-y-auto mt-4 space-y-4 pr-1">
                {/* PHOTO SECTION */}
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4" /> Fotografía del Equipo
                    </span>
                    {form.id_imagen && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, id_imagen: null, foto_preview: null })}
                        className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                      >
                        <Link2Off className="h-3 w-3" /> Desvincular Foto
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                      {form.foto_preview ? (
                        <img
                          src={form.foto_preview}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Laptop className="h-8 w-8 text-slate-600" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium border border-slate-700 cursor-pointer transition-colors">
                          <Upload className="h-3.5 w-3.5" />
                          <span>{uploadImageMutation.isPending ? "Subiendo..." : "Subir Foto"}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={uploadImageMutation.isPending}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => setOpenReusableModal(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          <span>Reutilizar Foto Existente</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Admite formatos JPEG, PNG y WebP hasta 5 MB. Permite asociar o reutilizar fotos por modelo/lote.
                      </p>
                    </div>
                  </div>
                </div>

                {/* PHYSICAL IDENTIFIER SECTION */}
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                  <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                    <Shield className="h-4 w-4" /> Identificador Físico / Externo
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Tipo Identificador</label>
                      <select
                        value={form.tipo_identificador_externo}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            tipo_identificador_externo: e.target.value as ExternalIdentifierType,
                          })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                      >
                        {IDENTIFIER_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Valor Identificador
                      </label>
                      <input
                        type="text"
                        disabled={form.tipo_identificador_externo === "Ninguno"}
                        placeholder={
                          form.tipo_identificador_externo === "MAC"
                            ? "AA:BB:CC:11:22:33"
                            : form.tipo_identificador_externo === "IMEI"
                            ? "15 dígitos numéricos"
                            : "Identificador alternativo"
                        }
                        value={form.identificador_alternativo}
                        onChange={(e) =>
                          setForm({ ...form, identificador_alternativo: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none disabled:opacity-40"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Emisor / Fabricante
                      </label>
                      <input
                        type="text"
                        disabled={form.tipo_identificador_externo === "Ninguno"}
                        placeholder="Ej: Dell, Cisco, Claro"
                        value={form.emisor_identificador_externo}
                        onChange={(e) =>
                          setForm({ ...form, emisor_identificador_externo: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none disabled:opacity-40"
                      />
                    </div>
                  </div>
                </div>

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

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-2 shrink-0">
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

      {/* MODAL: Select Reusable Image */}
      <AnimatePresence>
        {openReusableModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-cyan-400" />
                  Galería de Fotos Reutilizables
                </h4>
                <button
                  onClick={() => setOpenReusableModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 max-h-80 overflow-y-auto grid grid-cols-3 gap-3">
                {reusableImagesData?.data?.length ? (
                  reusableImagesData.data.map((img) => (
                    <button
                      key={img.id_imagen}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          id_imagen: img.id_imagen,
                          foto_preview: img.url,
                        }));
                        setOpenReusableModal(false);
                      }}
                      className="group relative rounded-xl border border-slate-700 bg-slate-950 overflow-hidden aspect-square hover:border-cyan-500 transition-all text-left"
                    >
                      <img
                        src={img.url}
                        alt={img.nombre_archivo || img.nombre_original || "Foto"}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-1.5 bg-slate-950/80 backdrop-blur-xs text-[10px] text-slate-300 truncate">
                        {img.nombre_archivo || img.nombre_original || `Foto #${img.id_imagen}`}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="col-span-3 py-10 text-center text-xs text-slate-500">
                    No hay imágenes cargadas en el catálogo aún.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
