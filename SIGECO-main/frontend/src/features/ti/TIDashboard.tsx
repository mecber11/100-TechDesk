import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Laptop,
  Layers,
  Wrench,
  Hourglass,
  Activity,
  Sparkles,
  Server,
} from "lucide-react";
import { AreaOperationsDashboard } from "../dashboard/AreaOperationsDashboard";
import { AssetInventoryTab } from "./AssetInventoryTab";
import { AssetAssignmentsTab } from "./AssetAssignmentsTab";
import { AssetMaintenanceTab } from "./AssetMaintenanceTab";
import { SlaMonitoringTab } from "./SlaMonitoringTab";

type TabKey = "inventory" | "assignments" | "maintenance" | "sla" | "operations";

export function TIDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>("inventory");

  const tabs = [
    {
      id: "inventory" as TabKey,
      label: "Inventario de Activos",
      description: "Stock, catálogo de hardware y fichas técnicas",
      icon: Laptop,
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
              Plataforma tecnológica para el control de inventario de hardware, trazabilidad de préstamos a
              colaboradores, historial de mantenimientos preventivos/correctivos y medición algorítmica de Acuerdos de Nivel de Servicio (SLAs).
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Server className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white">Corporación 100% Ingenieros</div>
              <div className="text-[11px] text-slate-400">Infraestructura & Soporte TI</div>
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
