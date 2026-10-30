import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Hourglass,
  Flame,
  X,
  Edit2,
  RefreshCw,
} from "lucide-react";
import { api } from "../../lib/api";
import type { SlaDashboardMetrics, SlaPolicy } from "./types";

export function SlaMonitoringTab() {
  const qc = useQueryClient();
  const [openPolicyModal, setOpenPolicyModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<SlaPolicy | null>(null);
  const [policyForm, setPolicyForm] = useState({
    nombre: "",
    prioridad: "Media" as "Urgente" | "Alta" | "Media" | "Baja",
    tiempo_primera_respuesta_horas: 4,
    tiempo_resolucion_horas: 24,
    descripcion: "",
  });

  // Query SLA Dashboard
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ["techdesk-sla-dashboard"],
    queryFn: () => api<{ data: SlaDashboardMetrics }>("/techdesk/sla/dashboard"),
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  const { data: policiesData } = useQuery({
    queryKey: ["techdesk-sla-policies"],
    queryFn: () => api<{ data: SlaPolicy[] }>("/techdesk/sla/policies"),
  });

  const metrics = dashboardData?.data;
  const policies = policiesData?.data || [];

  // Policy Save Mutation
  const savePolicyMutation = useMutation({
    mutationFn: (payload: any) => {
      if (selectedPolicy) {
        return api(`/techdesk/sla/policies/${selectedPolicy.id_politica}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
      return api("/techdesk/sla/policies", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["techdesk-sla-policies"] });
      qc.invalidateQueries({ queryKey: ["techdesk-sla-dashboard"] });
      setOpenPolicyModal(false);
      setSelectedPolicy(null);
    },
  });

  function handleOpenEditPolicy(p: SlaPolicy) {
    setSelectedPolicy(p);
    setPolicyForm({
      nombre: p.nombre,
      prioridad: p.prioridad,
      tiempo_primera_respuesta_horas: p.tiempo_primera_respuesta_horas,
      tiempo_resolucion_horas: p.tiempo_resolucion_horas,
      descripcion: p.descripcion || "",
    });
    setOpenPolicyModal(true);
  }

  function handlePolicySubmit(e: React.FormEvent) {
    e.preventDefault();
    savePolicyMutation.mutate(policyForm);
  }

  // Calculate real-time remaining countdown
  function getRemainingText(deadlineIso?: string) {
    if (!deadlineIso) return { text: "Sin límite", isExpired: false, percent: 100 };
    const deadline = new Date(deadlineIso).getTime();
    const now = Date.now();
    const diffMs = deadline - now;

    if (diffMs <= 0) {
      const minutesAgo = Math.floor(Math.abs(diffMs) / (1000 * 60));
      const hoursAgo = Math.floor(minutesAgo / 60);
      return {
        text: `Vencido hace ${hoursAgo > 0 ? `${hoursAgo}h ` : ""}${minutesAgo % 60}m`,
        isExpired: true,
        percent: 0,
      };
    }

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
      text: `${hours > 0 ? `${hours}h ` : ""}${minutes}m restantes`,
      isExpired: false,
      percent: Math.min(100, Math.max(5, Math.round((totalMinutes / (24 * 60)) * 100))),
    };
  }

  return (
    <div className="space-y-6">
      {/* SLA KPIs Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Tasa Cumplimiento */}
        <div className="col-span-2 md:col-span-1 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-950 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              Cumplimiento SLA
            </span>
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-white tracking-tight">
            {metrics?.tasa_cumplimiento_porcentaje ?? 100}%
          </p>
          <p className="mt-1 text-xs text-slate-400">Objetivo institucional: ≥ 95%</p>
        </div>

        {/* En Tiempo */}
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              En Tiempo
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-400 tracking-tight">
            {metrics?.en_tiempo ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-400">Dentro de la ventana óptima</p>
        </div>

        {/* En Riesgo */}
        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              En Riesgo
            </span>
            <AlertTriangle className="h-5 w-5 text-amber-400 animate-pulse" />
          </div>
          <p className="mt-3 text-3xl font-bold text-amber-300 tracking-tight">
            {metrics?.en_riesgo ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-400">Menos de 2h o 25% restante</p>
        </div>

        {/* Vencidos */}
        <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-slate-900 to-slate-950 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
              Vencidos
            </span>
            <Flame className="h-5 w-5 text-rose-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-rose-400 tracking-tight">
            {metrics?.vencidos ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-400">Excedieron el SLA acordado</p>
        </div>

        {/* Tiempo Promedio Resolución */}
        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-slate-900 to-slate-950 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Promedio Solución
            </span>
            <Clock className="h-5 w-5 text-blue-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-blue-300 tracking-tight">
            {metrics?.tiempo_promedio_resolucion_horas
              ? `${metrics.tiempo_promedio_resolucion_horas} h`
              : "N/A"}
          </p>
          <p className="mt-1 text-xs text-slate-400">Tiempo medio de cierre</p>
        </div>
      </div>

      {/* Real-time SLA Tracking Radar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden backdrop-blur-md shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Hourglass className="h-5 w-5 text-cyan-400" />
              Radar de Acuerdos de Nivel de Servicio (SLA Activos)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitoreo algorítmico y temporizadores de atención para solicitudes de TI en curso
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-cyan-400 border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Actualizar Radar</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-3">Código / Ticket</th>
                <th className="px-4 py-3">Prioridad</th>
                <th className="px-4 py-3">Solicitante</th>
                <th className="px-4 py-3">Área Origen</th>
                <th className="px-4 py-3">Estado Ticket</th>
                <th className="px-4 py-3">Temporizador / SLA</th>
                <th className="px-4 py-3 text-right">Estado SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    <Clock className="h-5 w-5 animate-spin mx-auto mb-2 text-cyan-400" />
                    Calculando temporizadores de SLA...
                  </td>
                </tr>
              ) : !metrics?.active_orders_tracking?.length ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                    No hay solicitudes pendientes o en atención en este momento.
                  </td>
                </tr>
              ) : (
                metrics.active_orders_tracking.map((order) => {
                  const timer = getRemainingText(order.deadline_sla);
                  return (
                    <tr
                      key={order.order_id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-mono text-cyan-400 font-bold text-xs">
                          {order.order_code}
                        </div>
                        <div className="text-xs text-slate-300 max-w-xs truncate">
                          {order.title}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                            order.priority === "Urgente"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : order.priority === "Alta"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : order.priority === "Media"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-300">
                        {order.requested_by || "Colaborador"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-400">
                        {order.from_area || "General"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs min-w-[180px]">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span
                            className={
                              timer.isExpired
                                ? "text-rose-400 font-bold"
                                : order.sla_status === "EnRiesgo"
                                ? "text-amber-400 font-medium"
                                : "text-emerald-400 font-medium"
                            }
                          >
                            {timer.text}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              timer.isExpired
                                ? "bg-rose-500 w-full"
                                : order.sla_status === "EnRiesgo"
                                ? "bg-amber-500"
                                : "bg-gradient-to-r from-emerald-500 to-cyan-500"
                            }`}
                            style={{
                              width: timer.isExpired ? "100%" : `${timer.percent}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            order.sla_status === "Cumplido"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : order.sla_status === "EnTiempo"
                              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                              : order.sla_status === "EnRiesgo"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {order.sla_status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SLA Policies Catalog */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="h-5 w-5 text-cyan-400" />
              Políticas de Niveles de Servicio Configuradas
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Parámetros de respuesta inicial y resolución técnica de acuerdo a la prioridad corporativa
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {policies.map((policy) => (
            <div
              key={policy.id_politica}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    policy.prioridad === "Urgente"
                      ? "bg-rose-500/20 text-rose-300"
                      : policy.prioridad === "Alta"
                      ? "bg-amber-500/20 text-amber-300"
                      : policy.prioridad === "Media"
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {policy.prioridad}
                </span>
                <button
                  onClick={() => handleOpenEditPolicy(policy)}
                  className="p-1 text-slate-500 hover:text-cyan-400 transition-colors"
                  title="Editar parámetros"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white">{policy.nombre}</h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {policy.descripcion || "Sin descripción"}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">1ra Respuesta</span>
                  <span className="font-semibold text-cyan-400">
                    ≤ {policy.tiempo_primera_respuesta_horas} horas
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Resolución</span>
                  <span className="font-semibold text-white">
                    ≤ {policy.tiempo_resolucion_horas} horas
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* POLICY EDIT MODAL */}
      <AnimatePresence>
        {openPolicyModal && selectedPolicy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-cyan-400" />
                  Editar Política de SLA
                </h3>
                <button
                  onClick={() => setOpenPolicyModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handlePolicySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nombre de la Política *
                  </label>
                  <input
                    type="text"
                    required
                    value={policyForm.nombre}
                    onChange={(e) => setPolicyForm({ ...policyForm, nombre: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      1ra Respuesta (Horas) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={policyForm.tiempo_primera_respuesta_horas}
                      onChange={(e) =>
                        setPolicyForm({
                          ...policyForm,
                          tiempo_primera_respuesta_horas: parseFloat(e.target.value) || 0.1,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Resolución (Horas) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={policyForm.tiempo_resolucion_horas}
                      onChange={(e) =>
                        setPolicyForm({
                          ...policyForm,
                          tiempo_resolucion_horas: parseFloat(e.target.value) || 0.1,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    value={policyForm.descripcion}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, descripcion: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenPolicyModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savePolicyMutation.isPending}
                    className="px-5 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 disabled:opacity-50"
                  >
                    {savePolicyMutation.isPending ? "Guardando..." : "Guardar Cambios"}
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
