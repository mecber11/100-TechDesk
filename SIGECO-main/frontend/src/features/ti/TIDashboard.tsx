import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Laptop,
  Layers,
  Wrench,
  Hourglass,
  Activity,
  Sparkles,
  Server,
  DollarSign,
  Bell,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { AreaOperationsDashboard } from "../dashboard/AreaOperationsDashboard";
import { AssetInventoryTab } from "./AssetInventoryTab";
import { AssetValuationTab } from "./AssetValuationTab";
import { AssetAssignmentsTab } from "./AssetAssignmentsTab";
import { AssetMaintenanceTab } from "./AssetMaintenanceTab";
import { SlaMonitoringTab } from "./SlaMonitoringTab";
import { api } from "../../lib/api";
import type { TechDeskNotification } from "./types";

type TabKey = "inventory" | "valuation" | "assignments" | "maintenance" | "sla" | "operations";

export function TIDashboard() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("inventory");
  const [showNotifications, setShowNotifications] = useState(false);

  // SLA Notifications
  const { data: notifData } = useQuery({
    queryKey: ["techdesk-sla-notifications"],
    queryFn: () => api<{ data: TechDeskNotification[]; unread_count: number }>("/techdesk/sla/notifications"),
    refetchInterval: 15000,
  });

  const notifications = notifData?.data || [];
  const unreadCount = notifData?.unread_count ?? notifications.filter((n) => !n.leido && !n.leida).length;

  const markAllMutation = useMutation({
    mutationFn: () => api("/techdesk/sla/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["techdesk-sla-notifications"] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: number) => api(`/techdesk/sla/notifications/${id}/read`, { method: "PUT" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["techdesk-sla-notifications"] });
    },
  });

  const resetDemoMutation = useMutation({
    mutationFn: () => api("/techdesk/demo/reset", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries();
      alert("Datos del modo Demo restablecidos exitosamente a los fixtures de prueba.");
    },
  });

  const tabs = [
    {
      id: "inventory" as TabKey,
      label: "Inventario de Activos",
      description: "Stock, catálogo de hardware y fichas técnicas",
      icon: Laptop,
    },
    {
      id: "valuation" as TabKey,
      label: "Valoración y Depreciación",
      description: "Dashboard financiero, amortización lineal y costos",
      icon: DollarSign,
    },
    {
      id: "assignments" as TabKey,
      label: "Préstamos y Asignaciones",
      description: "Trazabilidad dinámica y control de devoluciones",
      icon: Layers,
    },
    {
      id: "maintenance" as TabKey,
      label: "Mantenimiento TI",
      description: "Intervenciones preventivas, correctivas y repuestos",
      icon: Wrench,
    },
    {
      id: "sla" as TabKey,
      label: "Control de SLAs",
      description: "Temporizadores de atención y cumplimiento de tiempos",
      icon: Hourglass,
    },
    {
      id: "operations" as TabKey,
      label: "Operación de Tickets TI",
      description: "Panel de control general y solicitudes inter-área",
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 shadow-2xl">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-12 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              100% TechDesk • Área de TI
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Gestión Integral de Activos, SLAs y Mantenimiento TI
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-3xl leading-relaxed">
              Plataforma tecnológica para el control de inventario de hardware con identificadores físicos,
              valoración contable y depreciación lineal exacta, trazabilidad de préstamos, gestión de mantenimientos
              y cumplimiento algorítmico de SLAs.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            {/* Notifications Popover Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications((prev) => !prev)}
                className="relative p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:border-cyan-500/50 transition-colors"
                title="Bandeja de Alertas SLA"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg shadow-rose-500/50 animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Panel */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-4 z-50 text-slate-200"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        <span className="text-xs font-bold text-white">Alertas de SLA ({unreadCount} nuevas)</span>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllMutation.mutate()}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          Marcar todo leído
                        </button>
                      )}
                    </div>

                    <div className="mt-3 max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800/40">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-500">
                          <CheckCircle className="h-6 w-6 mx-auto mb-1 text-slate-600" />
                          No hay alertas activas de SLA.
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          const isRead = notif.leido ?? notif.leida;
                          return (
                            <div
                              key={notif.id_notificacion}
                              className={`pt-2 text-xs flex items-start justify-between gap-2 p-2 rounded-lg transition-colors ${
                                isRead ? "opacity-60 bg-transparent" : "bg-cyan-500/10 border border-cyan-500/20"
                              }`}
                            >
                              <div>
                                <div className="font-semibold text-white">{notif.titulo}</div>
                                <p className="text-slate-300 text-[11px] mt-0.5">{notif.mensaje}</p>
                                <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                                  {new Date(notif.fecha_creacion || notif.creado_en).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              {!isRead && (
                                <button
                                  onClick={() => markOneMutation.mutate(notif.id_notificacion)}
                                  className="text-[10px] text-cyan-400 hover:text-cyan-200 px-1.5 py-0.5 rounded bg-slate-800 shrink-0"
                                >
                                  Leído
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Reset Demo State Button */}
            <button
              onClick={() => {
                if (confirm("¿Restablecer datos del modo Demo a los valores iniciales de prueba?")) {
                  resetDemoMutation.mutate();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 text-xs font-medium transition-colors"
              title="Restablece la base de datos IndexedDB local a los fixtures del profesor"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${resetDemoMutation.isPending ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Restablecer Demo</span>
            </button>

            <div className="hidden sm:flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
              <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Server className="h-4.5 w-4.5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">100% Ingenieros</div>
                <div className="text-[10px] text-slate-400">Infraestructura TI</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="mt-8 flex flex-wrap gap-2 pt-4 border-t border-slate-800/80">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/30"
                    : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "inventory" && <AssetInventoryTab />}
          {activeTab === "valuation" && <AssetValuationTab />}
          {activeTab === "assignments" && <AssetAssignmentsTab />}
          {activeTab === "maintenance" && <AssetMaintenanceTab />}
          {activeTab === "sla" && <SlaMonitoringTab />}
          {activeTab === "operations" && (
            <AreaOperationsDashboard areaCode="TI" title="Centro de control operativo TI" />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
