import { useEffect, useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Area as RechartsArea,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Gauge,
  Inbox,
  Layers3,
  PieChart as PieChartIcon,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../store/auth";
import { useTheme } from "../../store/theme";
import { PageHeader } from "../../shared/PageHeader";
import { StatusBadge } from "../../shared/StatusBadge";
import { TeamManagement } from "../areas/TeamManagement";

type Area = { area_id: number; code: string; name: string };
type Kpi = { code: string; name: string; value: number; unit: "count" | "percent" };
type Ops = {
  scope: {
    mode: "global" | "area" | "personal";
    area: { id: number; code: string; name: string } | null;
    can_filter_areas: boolean;
    available_areas: Area[];
  };
  kpis: Kpi[];
  orders_by_status: { status: string; qty: number }[];
  orders_by_category: { category: string; qty: number }[];
  monthly_activity: { period: string; created: number; resolved: number }[];
  area_performance: { area_id: number; area: string; total: number; open: number; resolved: number }[];
  recent_orders: {
    order_id: number;
    order_code: string;
    request_type: string;
    title: string;
    kind: string;
    priority: string;
    status: string;
    from_area: string;
    to_area: string;
    requested_by_name: string | null;
    requested_by_email: string | null;
  }[];
};

const kpiVisuals = {
  TOTAL: {
    icon: Inbox,
    eyebrow: "Volumen acumulado",
    tone: "cyan",
    card: "from-cyan-500/[0.12] via-white to-white dark:from-cyan-400/[0.13] dark:via-navy dark:to-navy",
    iconClass: "bg-cyan-500/12 text-cyan-600 ring-cyan-500/15 dark:text-cyan-300",
    glow: "bg-cyan-400/20",
    accent: "from-cyan-400 to-blue-500",
  },
  OPEN: {
    icon: Clock3,
    eyebrow: "Requieren gestión",
    tone: "amber",
    card: "from-amber-500/[0.13] via-white to-white dark:from-amber-400/[0.12] dark:via-navy dark:to-navy",
    iconClass: "bg-amber-500/12 text-amber-600 ring-amber-500/15 dark:text-amber-300",
    glow: "bg-amber-400/20",
    accent: "from-amber-400 to-orange-500",
  },
  RESOLVED: {
    icon: CheckCircle2,
    eyebrow: "Gestión completada",
    tone: "emerald",
    card: "from-emerald-500/[0.12] via-white to-white dark:from-emerald-400/[0.12] dark:via-navy dark:to-navy",
    iconClass: "bg-emerald-500/12 text-emerald-600 ring-emerald-500/15 dark:text-emerald-300",
    glow: "bg-emerald-400/20",
    accent: "from-emerald-400 to-teal-500",
  },
  URGENT: {
    icon: CircleAlert,
    eyebrow: "Atención prioritaria",
    tone: "rose",
    card: "from-rose-500/[0.12] via-white to-white dark:from-rose-400/[0.12] dark:via-navy dark:to-navy",
    iconClass: "bg-rose-500/12 text-rose-600 ring-rose-500/15 dark:text-rose-300",
    glow: "bg-rose-400/20",
    accent: "from-rose-400 to-fuchsia-500",
  },
  COMPLETION: {
    icon: Gauge,
    eyebrow: "Eficiencia operativa",
    tone: "violet",
    card: "from-violet-500/[0.12] via-white to-white dark:from-violet-400/[0.12] dark:via-navy dark:to-navy",
    iconClass: "bg-violet-500/12 text-violet-600 ring-violet-500/15 dark:text-violet-300",
    glow: "bg-violet-400/20",
    accent: "from-violet-400 to-fuchsia-500",
  },
} as const;

const fallbackVisual = { ...kpiVisuals.TOTAL, icon: Activity };
const statusColors: Record<string, string> = {
  Borrador: "#94A3B8",
  Enviado: "#38BDF8",
  EnAtencion: "#F59E0B",
  Escalado: "#A78BFA",
  Atendido: "#34D399",
  Rechazado: "#FB7185",
  Cerrado: "#14B8A6",
};

export function AreaOperationsDashboard({ areaCode, title, personal = false }: { areaCode?: string; title?: string; personal?: boolean }) {
  const user = useAuth((state) => state.user);
  const theme = useTheme((state) => state.theme);
  const [selectedArea, setSelectedArea] = useState(areaCode ?? "");
  useEffect(() => setSelectedArea(areaCode ?? ""), [areaCode]);

  const query = useQuery({
    queryKey: ["ops", personal ? "personal" : "supervision", user?.id, selectedArea],
    queryFn: () => api<Ops>(personal ? "/ops?personal=1" : `/ops${selectedArea ? `?area=${encodeURIComponent(selectedArea)}` : ""}`),
  });
  const data = query.data;
  const isDark = theme === "dark";
  const axisColor = isDark ? "#8292A8" : "#64748B";
  const gridColor = isDark ? "rgba(148,163,184,.12)" : "rgba(148,163,184,.22)";
  const isManager =
    user?.is_manager === true ||
    user?.is_lead === true ||
    user?.roles?.some(
      (role) => role === "Administrador_Empresa" || role === "SuperAdmin" || role === "Super_Admin" || role.endsWith("_Encargado"),
    ) || false;
  const scopeName = data?.scope?.area?.name;
  const pageTitle = title ?? (scopeName ? `Panel de ${scopeName}` : "Control general de áreas");
  const subtitle = personal ? "Indicadores y evolución de los pedidos y tickets que has creado con tu cuenta." : scopeName
    ? `Seguimiento de pedidos y tickets enviados o recibidos por ${scopeName}.`
    : "Visión integral de solicitudes, carga operativa y nivel de atención de todas las áreas.";
  const statusData = (data?.orders_by_status ?? []).map((entry) => ({
    ...entry,
    color: statusColors[entry.status] ?? "#22D3EE",
  }));
  const statusTotal = statusData.reduce((total, entry) => total + entry.qty, 0);
  const completion = data?.kpis?.find((kpi) => kpi.code === "COMPLETION")?.value ?? 0;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <PageHeader title={pageTitle} subtitle={subtitle} />
        {data?.scope?.can_filter_areas && (
          <motion.label
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="interactive-surface w-full min-w-0 rounded-2xl border border-black/5 bg-white/85 p-3 text-xs font-extrabold text-slate-500 shadow-card backdrop-blur dark:border-white/[0.07] dark:bg-navy/85 xl:w-72"
          >
            <span className="mb-2 flex items-center gap-2 uppercase tracking-[0.14em]"><Layers3 size={14} className="text-teal" /> Control por área</span>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-navy outline-none transition focus:border-teal focus:ring-4 focus:ring-teal/10 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
              value={selectedArea}
              onChange={(event) => setSelectedArea(event.target.value)}
            >
              <option value="">Todas las áreas</option>
              {data.scope?.available_areas?.map((area) => (
                <option key={area.area_id} value={area.code}>{area.name}</option>
              ))}
            </select>
          </motion.label>
        )}
      </div>

      {query.isError && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-400/15 dark:bg-rose-400/[0.07] dark:text-rose-300">
          No se pudieron cargar las métricas operativas.
        </motion.p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {query.isLoading
          ? Array.from({ length: 5 }).map((_, index) => <KpiSkeleton key={index} />)
          : (data?.kpis ?? []).map((kpi, index) => <KpiCard key={kpi.code} kpi={kpi} index={index} />)}
      </div>

      <section className="dashboard-insight overflow-hidden rounded-3xl border border-black/5 bg-gradient-to-r from-[#0d263a] via-[#103c50] to-[#105b68] p-4 text-white shadow-xl shadow-cyan-950/10 dark:border-white/[0.08] dark:from-[#0b1d2d] dark:via-[#0c3042] dark:to-[#0b4350] sm:p-5">
        <div className="relative z-10 grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-cyan-200 ring-1 ring-white/10 backdrop-blur"><Sparkles size={23} /></span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/70">Lectura ejecutiva</p>
              <h2 className="mt-1 text-lg font-black">Nivel de atención del ámbito seleccionado</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300">El indicador compara las solicitudes atendidas o cerradas frente al total registrado. Úsalo como referencia rápida de carga y capacidad operativa.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-2 min-[360px]:flex-row min-[360px]:items-end min-[360px]:justify-between">
              <div><span className="text-3xl font-black tracking-tight">{completion}%</span><span className="ml-2 text-xs font-bold text-cyan-100/70">completado</span></div>
              <TrendingUp size={20} className="text-emerald-300" />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(completion, 100)}%` }} transition={{ duration: 0.9, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-teal-300 to-emerald-300 shadow-[0_0_18px_rgba(94,234,212,.45)]" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Distribución por estado"
          subtitle="Composición actual de todas las solicitudes"
          icon={PieChartIcon}
          tone="cyan"
          empty={statusData.length === 0}
        >
          <PieChart>
            <Pie data={statusData} dataKey="qty" nameKey="status" cx="50%" cy="46%" innerRadius="56%" outerRadius="78%" paddingAngle={4} cornerRadius={7} stroke="transparent">
              {statusData.map((entry) => <Cell key={entry.status} fill={entry.color} />)}
              <Label value={`${statusTotal}`} position="center" className="fill-navy text-2xl font-black dark:fill-white" />
            </Pie>
            <Tooltip content={<DashboardTooltip />} />
            <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{String(value)}</span>} />
          </PieChart>
        </ChartCard>

        <ChartCard
          title="Necesidades por categoría"
          subtitle="Tipos de requerimiento con mayor demanda"
          icon={BarChart3}
          tone="violet"
          empty={(data?.orders_by_category?.length ?? 0) === 0}
        >
          <BarChart data={data?.orders_by_category ?? []} layout="vertical" margin={{ top: 6, right: 18, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="categoryGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#22D3EE" /></linearGradient>
            </defs>
            <CartesianGrid stroke={gridColor} strokeDasharray="4 5" horizontal={false} />
            <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: axisColor }} />
            <YAxis type="category" dataKey="category" width={92} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: axisColor }} />
            <Tooltip cursor={{ fill: isDark ? "rgba(255,255,255,.025)" : "rgba(34,211,238,.045)" }} content={<DashboardTooltip />} />
            <Bar dataKey="qty" name="Solicitudes" fill="url(#categoryGradient)" radius={[0, 8, 8, 0]} maxBarSize={27} />
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Evolución mensual"
          subtitle="Solicitudes registradas frente a las resueltas"
          icon={TrendingUp}
          tone="emerald"
          empty={(data?.monthly_activity?.length ?? 0) === 0}
          className={(data?.area_performance?.length ?? 0) === 0 ? "xl:col-span-2" : ""}
        >
          <AreaChart data={data?.monthly_activity ?? []} margin={{ top: 10, right: 14, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="createdArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60A5FA" stopOpacity={0.34} /><stop offset="100%" stopColor="#60A5FA" stopOpacity={0.01} /></linearGradient>
              <linearGradient id="resolvedArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34D399" stopOpacity={0.34} /><stop offset="100%" stopColor="#34D399" stopOpacity={0.01} /></linearGradient>
            </defs>
            <CartesianGrid stroke={gridColor} strokeDasharray="4 5" vertical={false} />
            <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: axisColor }} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: axisColor }} />
            <Tooltip content={<DashboardTooltip />} />
            <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{String(value)}</span>} />
            <RechartsArea type="monotone" dataKey="created" name="Registradas" stroke="#60A5FA" strokeWidth={3} fill="url(#createdArea)" activeDot={{ r: 5, strokeWidth: 3, stroke: isDark ? "#0B1C2C" : "#FFFFFF" }} />
            <RechartsArea type="monotone" dataKey="resolved" name="Resueltas" stroke="#34D399" strokeWidth={3} fill="url(#resolvedArea)" activeDot={{ r: 5, strokeWidth: 3, stroke: isDark ? "#0B1C2C" : "#FFFFFF" }} />
          </AreaChart>
        </ChartCard>

        {(data?.area_performance?.length ?? 0) > 0 && (
          <ChartCard title="Rendimiento por área" subtitle="Carga pendiente y capacidad de resolución" icon={Layers3} tone="amber" empty={false}>
            <BarChart data={data?.area_performance ?? []} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="openGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FBBF24" /><stop offset="100%" stopColor="#F97316" /></linearGradient>
                <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2DD4BF" /><stop offset="100%" stopColor="#10B981" /></linearGradient>
              </defs>
              <CartesianGrid stroke={gridColor} strokeDasharray="4 5" vertical={false} />
              <XAxis dataKey="area" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: axisColor }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: axisColor }} />
              <Tooltip cursor={{ fill: isDark ? "rgba(255,255,255,.025)" : "rgba(34,211,238,.04)" }} content={<DashboardTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{String(value)}</span>} />
              <Bar dataKey="open" name="Pendientes" fill="url(#openGradient)" radius={[7, 7, 2, 2]} maxBarSize={30} />
              <Bar dataKey="resolved" name="Resueltas" fill="url(#resolvedGradient)" radius={[7, 7, 2, 2]} maxBarSize={30} />
            </BarChart>
          </ChartCard>
        )}
      </div>

      <section className="interactive-surface overflow-hidden rounded-3xl border border-black/5 bg-white shadow-card dark:border-white/[0.06] dark:bg-navy">
        <div className="flex flex-col gap-3 border-b border-black/5 bg-gradient-to-r from-slate-50/80 to-cyan-50/35 px-5 py-4 dark:border-white/[0.06] dark:from-white/[0.035] dark:to-cyan-400/[0.025] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-600 ring-1 ring-cyan-500/10 dark:text-cyan-300"><Activity size={19} /></span>
            <div><h2 className="font-black text-navy dark:text-white">Actividad reciente</h2><p className="text-xs text-slate-500 dark:text-slate-400">Últimos pedidos dentro de la visibilidad autorizada.</p></div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 dark:border-emerald-400/15 dark:bg-emerald-400/[0.07] dark:text-emerald-300">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Actualización operativa
          </span>
        </div>
        <div className="divide-y divide-black/5 dark:divide-white/[0.045] md:hidden">
          {(data?.recent_orders ?? []).map((order, index) => (
            <motion.article key={order.order_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.035, 0.25) }} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[10px] font-bold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">{order.order_code}</span><h3 className="mt-2 break-words text-sm font-extrabold text-navy dark:text-white">{order.title}</h3></div>
                <StatusBadge value={order.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-xs dark:bg-white/[0.03]">
                <div className="min-w-0"><span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Solicitante</span><span className="mt-1 block truncate font-bold text-slate-700 dark:text-slate-200">{order.requested_by_name ?? "—"}</span></div>
                <div><span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Área</span><span className="mt-1 block font-bold text-slate-700 dark:text-slate-200">{order.from_area}</span></div>
                <div><span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Tipo</span><span className="mt-1 block font-bold text-slate-700 dark:text-slate-200">{order.request_type}</span></div>
                <div><span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Prioridad</span><span className="mt-1 flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200"><span className={`size-1.5 rounded-full ${order.priority === "Urgente" ? "bg-rose-500" : order.priority === "Alta" ? "bg-amber-500" : "bg-cyan-500"}`} />{order.priority}</span></div>
              </div>
            </motion.article>
          ))}
          {!query.isLoading && (data?.recent_orders?.length ?? 0) === 0 && <div className="p-8 text-center text-sm font-bold text-slate-500">Aún no hay solicitudes registradas en este ámbito.</div>}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-slate-50/70 text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:bg-white/[0.025]">
              <tr><th className="p-3.5">Código</th><th className="p-3.5">Solicitud</th><th className="p-3.5">Solicitante</th><th className="p-3.5">Área</th><th className="p-3.5">Tipo</th><th className="p-3.5">Estado</th></tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/[0.045]">
              {(data?.recent_orders ?? []).map((order, index) => (
                <motion.tr key={order.order_id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(index * 0.035, 0.25) }} className="transition-colors hover:bg-cyan-50/45 dark:hover:bg-cyan-400/[0.035]">
                  <td className="p-3.5"><span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[11px] font-bold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">{order.order_code}</span></td>
                  <td className="p-3.5"><div className="max-w-64 truncate font-extrabold text-navy dark:text-slate-100">{order.title}</div><div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500"><span className={`size-1.5 rounded-full ${order.priority === "Urgente" ? "bg-rose-500" : order.priority === "Alta" ? "bg-amber-500" : "bg-cyan-500"}`} />{order.kind} · {order.priority}</div></td>
                  <td className="p-3.5"><div className="font-bold text-slate-700 dark:text-slate-200">{order.requested_by_name ?? "—"}</div><div className="text-[11px] text-slate-500">{order.requested_by_email ?? "Sin correo"}</div></td>
                  <td className="p-3.5"><span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 dark:border-white/10 dark:text-slate-300">{order.from_area}</span></td>
                  <td className="p-3.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{order.request_type}</td>
                  <td className="p-3.5"><StatusBadge value={order.status} /></td>
                </motion.tr>
              ))}
              {!query.isLoading && (data?.recent_orders?.length ?? 0) === 0 && (
                <tr><td className="p-10 text-center" colSpan={6}><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.05]"><Inbox size={22} /></div><p className="mt-3 text-sm font-bold text-slate-500">Aún no hay solicitudes registradas en este ámbito.</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Gestión de equipos: Únicamente visible en el Panel de Control general (Admin), no en paneles por área */}
      {!personal && isManager && <TeamManagement areaCode={areaCode} />}
    </div>
  );
}

function KpiCard({ kpi, index }: { kpi: Kpi; index: number }) {
  const visual = kpiVisuals[kpi.code as keyof typeof kpiVisuals] ?? fallbackVisual;
  const Icon = visual.icon;
  const value = `${kpi.value}${kpi.unit === "percent" ? "%" : ""}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.055, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={`group relative min-h-40 overflow-hidden rounded-3xl border border-black/5 bg-gradient-to-br p-4 shadow-card dark:border-white/[0.065] ${visual.card}`}
    >
      <span className={`absolute -right-8 -top-8 size-24 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-150 ${visual.glow}`} />
      <span className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${visual.accent}`} />
      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{kpi.name}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">{visual.eyebrow}</p></div>
          <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ring-1 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105 ${visual.iconClass}`}><Icon size={19} strokeWidth={2.25} /></span>
        </div>
        <div>
          <p className="text-3xl font-black tracking-[-0.04em] text-navy dark:text-white">{value}</p>
          {kpi.unit === "percent" ? (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/[0.07]"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(kpi.value, 100)}%` }} transition={{ delay: 0.2 + index * 0.04, duration: 0.8 }} className={`h-full rounded-full bg-gradient-to-r ${visual.accent}`} /></div>
          ) : (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-slate-400"><span className={`size-1.5 rounded-full bg-gradient-to-r ${visual.accent}`} /> dato actualizado</div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function KpiSkeleton() {
  return <div className="min-h-40 animate-pulse rounded-3xl border border-black/5 bg-white/70 p-4 shadow-card dark:border-white/[0.05] dark:bg-white/[0.035]"><div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-white/10" /><div className="mt-8 h-9 w-1/3 rounded-lg bg-slate-200 dark:bg-white/10" /><div className="mt-5 h-2 w-full rounded bg-slate-100 dark:bg-white/[0.06]" /></div>;
}

const chartTones = {
  cyan: "from-cyan-500 to-blue-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
  violet: "from-violet-500 to-fuchsia-500 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  emerald: "from-emerald-500 to-teal-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  amber: "from-amber-500 to-orange-500 bg-amber-500/10 text-amber-600 dark:text-amber-300",
};

function ChartCard({ title, subtitle, icon: Icon, tone, empty, className = "", children }: { title: string; subtitle: string; icon: typeof Activity; tone: keyof typeof chartTones; empty: boolean; className?: string; children: ReactElement }) {
  const toneClass = chartTones[tone];
  const gradient = toneClass.split(" ").slice(0, 2).join(" ");
  const iconClasses = toneClass.split(" ").slice(2).join(" ");

  return (
    <motion.section whileHover={{ y: -3 }} transition={{ duration: 0.22 }} className={`interactive-surface relative h-[340px] overflow-hidden rounded-3xl border border-black/5 bg-white p-4 shadow-card dark:border-white/[0.06] dark:bg-navy sm:h-[370px] sm:p-5 ${className}`}>
      <span className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${gradient}`} />
      <div className="mb-3 flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${iconClasses}`}><Icon size={19} /></span>
        <div><h2 className="text-sm font-black text-navy dark:text-white">{title}</h2><p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p></div>
      </div>
      {empty ? <EmptyChart /> : <ResponsiveContainer width="100%" height="82%">{children}</ResponsiveContainer>}
    </motion.section>
  );
}

function EmptyChart() {
  return <div className="grid h-[78%] place-items-center text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.05]"><BarChart3 size={22} /></span><p className="mt-3 text-xs font-bold text-slate-500">Sin datos suficientes para graficar</p><p className="mt-1 text-[10px] text-slate-400">La visualización aparecerá al registrar actividad.</p></div></div>;
}

function DashboardTooltip({ active, payload, label }: { active?: boolean; payload?: readonly { name?: string; value?: string | number; color?: string }[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-2xl border border-white/10 bg-[#0b1c2c]/95 p-3 text-white shadow-2xl backdrop-blur">
      {label !== undefined && <p className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>}
      <div className="space-y-1.5">{payload.map((entry, index) => <div key={`${entry.name}-${index}`} className="flex items-center justify-between gap-4 text-xs"><span className="flex items-center gap-1.5 text-slate-300"><span className="size-1.5 rounded-full" style={{ background: entry.color ?? "#22D3EE" }} />{entry.name}</span><strong>{entry.value}</strong></div>)}</div>
    </div>
  );
}
