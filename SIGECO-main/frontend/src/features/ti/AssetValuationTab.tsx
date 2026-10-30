import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  X,
  Building,
  Laptop,
  Clock,
  HelpCircle,
  Eye,
} from "lucide-react";
import { api } from "../../lib/api";
import type { Asset, AssetValuationSummary } from "./types";

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

export function AssetValuationTab() {
  const qc = useQueryClient();

  // Filters state
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [search, setSearch] = useState("");
  const [adquisicionDesde, setAdquisicionDesde] = useState("");
  const [adquisicionHasta, setAdquisicionHasta] = useState("");
  const [valoracionStatus, setValoracionStatus] = useState("");

  // Last update timestamp
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());
  const [selectedAssetForFicha, setSelectedAssetForFicha] = useState<Asset | null>(null);
  const [showPendingModal, setShowPendingModal] = useState(false);

  // Build query string
  const queryParams = new URLSearchParams();
  if (selectedType) queryParams.set("tipo", selectedType);
  if (selectedStatus) queryParams.set("estado", selectedStatus);
  if (search) queryParams.set("search", search);
  if (adquisicionDesde) queryParams.set("adquisicion_desde", adquisicionDesde);
  if (adquisicionHasta) queryParams.set("adquisicion_hasta", adquisicionHasta);
  if (valoracionStatus) queryParams.set("valoracion_status", valoracionStatus);

  const queryUrl = `/techdesk/assets/valuation${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  const {
    data: valuationData,
    isLoading,
    isFetching,
    error,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["techdesk-assets-valuation", queryParams.toString()],
    queryFn: () => api<{ data: AssetValuationSummary }>(queryUrl),
    refetchInterval: 30000, // Actualización automática como máximo cada 30 segundos (Sección 6.4)
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (dataUpdatedAt) {
      setLastUpdated(new Date(dataUpdatedAt).toLocaleTimeString());
    }
  }, [dataUpdatedAt]);

  const summary = valuationData?.data;

  // Format currency helper
  function formatMoney(amount: number | string | null | undefined): string {
    const val = Number(amount || 0);
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
    }).format(val);
  }

  function handleResetFilters() {
    setSelectedType("");
    setSelectedStatus("");
    setSearch("");
    setAdquisicionDesde("");
    setAdquisicionHasta("");
    setValoracionStatus("");
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <DollarSign className="h-3.5 w-3.5" />
            Valor Actual Estimado • Moneda Soles (PEN)
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Dashboard de Valoración y Depreciación Consolidada
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Cálculo algorítmico lineal sobre el patrimonio operativo registrado (excluye equipos dados de baja).
            Actualización continua en tiempo real basada en aniversarios mensuales de calendario.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 justify-end">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <span>Actualizado a las {lastUpdated}</span>
            </div>
            {isFetching && (
              <span className="text-[11px] text-cyan-400 font-medium animate-pulse block">
                Sincronizando datos...
              </span>
            )}
            {error && (
              <span className="text-[11px] text-rose-400 font-medium block">
                Error de conexión. Mostrando última lectura.
              </span>
            )}
          </div>

          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["techdesk-assets-valuation"] })}
            disabled={isFetching}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title="Forzar actualización inmediata"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Sección 6.2) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Valor Adquisición Registrado */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Valor Adquisición
          </span>
          <p className="mt-2 text-xl font-extrabold text-white font-mono tracking-tight">
            {formatMoney(summary?.acquisition_value)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Costo histórico inicial</span>
        </div>

        {/* 2. Depreciación Acumulada */}
        <div className="rounded-2xl border border-amber-500/20 bg-slate-900/60 p-4 shadow-lg">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block flex items-center gap-1">
            <TrendingDown className="h-3.5 w-3.5" /> Depreciación Acum.
          </span>
          <p className="mt-2 text-xl font-extrabold text-amber-300 font-mono tracking-tight">
            {formatMoney(summary?.accumulated_depreciation)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Pérdida por uso en el tiempo</span>
        </div>

        {/* 3. Valor Actual Estimado */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 p-4 shadow-lg ring-1 ring-emerald-500/20">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Valor Actual Estimado
          </span>
          <p className="mt-2 text-2xl font-extrabold text-emerald-400 font-mono tracking-tight">
            {formatMoney(summary?.current_value)}
          </p>
          <span className="text-[11px] text-emerald-300/70 mt-1 block">Patrimonio neto vigente</span>
        </div>

        {/* 4. Activos Incluidos */}
        <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-4 shadow-lg">
          <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider block flex items-center gap-1">
            <Laptop className="h-3.5 w-3.5" /> Activos Valorados
          </span>
          <p className="mt-2 text-xl font-extrabold text-cyan-300 font-mono tracking-tight">
            {summary?.valued_assets ?? 0}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            De {summary?.total_assets ?? 0} filtrados
          </span>
        </div>

        {/* 5. Totalmente Depreciados */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Depreciados al 100%
          </span>
          <p className="mt-2 text-xl font-extrabold text-slate-200 font-mono tracking-tight">
            {summary?.fully_depreciated_assets ?? 0}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Valor residual en S/ 0.00</span>
        </div>

        {/* 6. Pendientes de Valoración */}
        <div
          onClick={() => (summary?.pending_valuation_assets ? setShowPendingModal(true) : null)}
          className={`rounded-2xl border p-4 shadow-lg transition-all ${
            summary?.pending_valuation_assets
              ? "border-rose-500/30 bg-rose-500/5 cursor-pointer hover:bg-rose-500/10"
              : "border-slate-800 bg-slate-900/60"
          }`}
        >
          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block flex items-center justify-between">
            <span>Pendientes</span>
            {summary?.pending_valuation_assets ? <HelpCircle className="h-3.5 w-3.5" /> : null}
          </span>
          <p className="mt-2 text-xl font-extrabold text-rose-300 font-mono tracking-tight">
            {summary?.pending_valuation_assets ?? 0}
          </p>
          <span className="text-[11px] text-rose-400/80 mt-1 block truncate">
            {summary?.pending_valuation_assets ? "Ver motivos (clic aquí)" : "Datos completos"}
          </span>
        </div>
      </div>

      {/* Distribution Breakdown Panels (Sección 6.2) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Desglose por Tipo */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <Laptop className="h-4 w-4 text-cyan-400" /> Distribución por Tipo
          </h3>
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {!summary?.by_type?.length ? (
              <p className="text-xs text-slate-500 italic py-2">Sin datos de tipos</p>
            ) : (
              summary.by_type.map((t) => (
                <div key={t.tipo} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">
                    {t.tipo} <span className="text-slate-500">({t.count})</span>
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {formatMoney(t.current_value)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Desglose por Estado */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Distribución por Estado
          </h3>
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {!summary?.by_status?.length ? (
              <p className="text-xs text-slate-500 italic py-2">Sin datos de estados</p>
            ) : (
              summary.by_status.map((s) => (
                <div key={s.estado} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">
                    {s.estado} <span className="text-slate-500">({s.count})</span>
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {formatMoney(s.current_value)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Desglose por Área de Custodia */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <Building className="h-4 w-4 text-blue-400" /> Distribución por Custodia / Área
          </h3>
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {!summary?.by_area?.length ? (
              <p className="text-xs text-slate-500 italic py-2">Sin datos de custodia</p>
            ) : (
              summary.by_area.map((ar) => (
                <div key={ar.area} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium truncate max-w-[170px]" title={ar.area}>
                    {ar.area} <span className="text-slate-500">({ar.count})</span>
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {formatMoney(ar.current_value)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Búsqueda */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, serie o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Tipo */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">Todos los tipos</option>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Estado */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">Operativos (Disp / Asig / Mant)</option>
            <option value="Disponible">Disponible</option>
            <option value="Asignado">Asignado</option>
            <option value="Mantenimiento">Mantenimiento</option>
            <option value="Baja">De Baja (Histórico)</option>
          </select>

          {/* Rango Adquisición */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Adq. Desde:</span>
            <input
              type="date"
              value={adquisicionDesde}
              onChange={(e) => setAdquisicionDesde(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Hasta:</span>
            <input
              type="date"
              value={adquisicionHasta}
              onChange={(e) => setAdquisicionHasta(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Estado de Valoración */}
          <select
            value={valoracionStatus}
            onChange={(e) => setValoracionStatus(e.target.value)}
            className="px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">Todos (Valorados y Pendientes)</option>
            <option value="completed">Solo Valorados</option>
            <option value="pending">Solo Pendientes de Datos</option>
          </select>

          {(selectedType || selectedStatus || search || adquisicionDesde || adquisicionHasta || valoracionStatus) && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Assets Valuation Table (Sección 6.2) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden backdrop-blur-md shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-3.5">Foto</th>
                <th className="px-4 py-3.5">Código / Serie</th>
                <th className="px-4 py-3.5">Equipo / Marca</th>
                <th className="px-4 py-3.5">Adquisición</th>
                <th className="px-4 py-3.5 text-right">Costo Orig.</th>
                <th className="px-4 py-3.5 text-center">Vida Útil</th>
                <th className="px-4 py-3.5 text-center">Meses Uso</th>
                <th className="px-4 py-3.5 text-right">Depreciación</th>
                <th className="px-4 py-3.5 text-right">Valor Actual</th>
                <th className="px-4 py-3.5 text-center">Estado</th>
                <th className="px-4 py-3.5 text-right">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400">
                    <Clock className="h-6 w-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    Calculando valor actual de activos...
                  </td>
                </tr>
              ) : !summary?.assets?.length ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    No se encontraron activos para los criterios de valoración especificados.
                  </td>
                </tr>
              ) : (
                summary.assets.map((asset) => {
                  const dep = asset.depreciation_info;
                  return (
                    <tr key={asset.id_activo} className="hover:bg-slate-800/40 transition-colors">
                      {/* Miniatura de Foto */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {asset.image_url ? (
                          <img
                            src={asset.image_url}
                            alt={asset.nombre}
                            className="h-10 w-14 object-cover rounded-lg border border-slate-700 bg-slate-950"
                          />
                        ) : (
                          <div className="h-10 w-14 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
                            <Laptop className="h-5 w-5" />
                          </div>
                        )}
                      </td>

                      {/* Código Patrimonial y Serie/Identificador */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-cyan-400 text-xs">
                          {asset.codigo_patrimonial}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {asset.numero_serie
                            ? `S/N: ${asset.numero_serie}`
                            : asset.identificador_alternativo
                            ? `${asset.tipo_identificador_externo}: ${asset.identificador_alternativo}`
                            : "Identificador pendiente"}
                        </div>
                      </td>

                      {/* Nombre y Modelo */}
                      <td className="px-4 py-3 max-w-[200px] truncate">
                        <div className="font-medium text-white text-xs truncate">{asset.nombre}</div>
                        <div className="text-[11px] text-slate-400">
                          {asset.marca} {asset.modelo}
                        </div>
                      </td>

                      {/* Fecha Adquisición */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-300 font-mono">
                        {asset.fecha_adquisicion ? asset.fecha_adquisicion.substring(0, 10) : (
                          <span className="text-rose-400 italic">No registrada</span>
                        )}
                      </td>

                      {/* Costo Adquisición */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-xs text-white">
                        {asset.costo_adquisicion !== null ? formatMoney(asset.costo_adquisicion) : (
                          <span className="text-rose-400 italic">Pendiente</span>
                        )}
                      </td>

                      {/* Vida Útil */}
                      <td className="px-4 py-3 whitespace-nowrap text-center text-xs text-slate-300">
                        {asset.vida_util_meses} m
                      </td>

                      {/* Meses de Uso */}
                      <td className="px-4 py-3 whitespace-nowrap text-center text-xs text-cyan-300 font-mono">
                        {dep?.valorable ? `${dep.meses_uso} m` : "—"}
                      </td>

                      {/* Depreciación Acumulada */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-xs text-amber-300">
                        {dep?.valorable ? formatMoney(dep.depreciacion_acumulada) : "—"}
                      </td>

                      {/* Valor Actual Estimado */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold text-xs text-emerald-400">
                        {dep?.valorable ? formatMoney(dep.valor_actual) : "—"}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            asset.estado === "Disponible"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : asset.estado === "Asignado"
                              ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                              : asset.estado === "Mantenimiento"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {asset.estado}
                        </span>
                      </td>

                      {/* Ficha */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedAssetForFicha(asset)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Ficha</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Datos Pendientes de Valoración */}
      <AnimatePresence>
        {showPendingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  Activos Pendientes de Valoración ({summary?.pending_details?.length ?? 0})
                </h3>
                <button
                  onClick={() => setShowPendingModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400 mt-3">
                Estos activos fueron excluidos del total patrimonial debido a que carecen de costo o fecha válida.
                Para incorporarlos al cálculo, edita el equipo completando sus datos patrimoniales.
              </p>

              <div className="mt-4 max-h-64 overflow-y-auto space-y-2 pr-1">
                {summary?.pending_details?.map((p) => (
                  <div
                    key={p.id_activo}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono font-bold text-cyan-400">{p.codigo_patrimonial}</div>
                      <div className="text-slate-200 font-medium">{p.nombre}</div>
                    </div>
                    <span className="text-rose-400 text-[11px] font-medium bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      {p.motivo}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 text-right">
                <button
                  onClick={() => setShowPendingModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Ficha Técnica Rápida desde Valoración */}
      <AnimatePresence>
        {selectedAssetForFicha && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl my-8"
            >
              <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="font-mono text-cyan-400 text-xs font-bold px-2 py-0.5 bg-cyan-500/10 rounded border border-cyan-500/30">
                    {selectedAssetForFicha.codigo_patrimonial}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-white">{selectedAssetForFicha.nombre}</h3>
                  <p className="text-xs text-slate-400">
                    {selectedAssetForFicha.tipo} • {selectedAssetForFicha.marca} {selectedAssetForFicha.modelo}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAssetForFicha(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Foto si existe */}
              {selectedAssetForFicha.image_url && (
                <div className="mt-4 rounded-xl overflow-hidden border border-slate-800 max-h-48 bg-slate-950 flex items-center justify-center">
                  <img
                    src={selectedAssetForFicha.image_url}
                    alt={selectedAssetForFicha.nombre}
                    className="max-h-48 w-full object-contain"
                  />
                </div>
              )}

              {/* Datos de Valoración */}
              <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Costo de Adquisición:</span>
                  <span className="font-mono text-white font-bold">
                    {formatMoney(selectedAssetForFicha.costo_adquisicion)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fecha Adquisición:</span>
                  <span className="font-mono text-slate-200">
                    {selectedAssetForFicha.fecha_adquisicion?.substring(0, 10) || "No registrada"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vida Útil:</span>
                  <span className="text-slate-200">{selectedAssetForFicha.vida_util_meses} meses</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Depreciación Acumulada:</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {formatMoney(selectedAssetForFicha.depreciation_info?.depreciacion_acumulada)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 text-sm">
                  <span className="text-slate-300 font-semibold">Valor Actual Estimado:</span>
                  <span className="font-mono text-emerald-400 font-extrabold">
                    {formatMoney(selectedAssetForFicha.depreciation_info?.valor_actual)}
                  </span>
                </div>
              </div>

              <div className="mt-5 text-right">
                <button
                  onClick={() => setSelectedAssetForFicha(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

