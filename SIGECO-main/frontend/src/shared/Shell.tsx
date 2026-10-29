import { BrandLogo } from "./BrandLogo";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowLeftRight,
  Briefcase,
  Building2,
  Calculator,
  ChevronDown,
  FolderOpen,
  Laptop,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Monitor,
  Moon,
  Brain,
  Palette,
  Settings,
  Sparkles,
  Sun,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "../store/theme";
import { useAuth } from "../store/auth";
import { useModules } from "../lib/modules";
import { MyAssignedAssetsModal } from "../features/ti/MyAssignedAssetsModal";

type NavTone = "cyan" | "violet" | "amber" | "emerald" | "rose" | "blue";
type NavItem = {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  roles: string[];
  tone: NavTone;
};
type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    id: "operation",
    label: "Operación",
    icon: Activity,
    items: [
      { to: "/", label: "Mi panel", description: "Mis solicitudes y seguimiento", icon: LayoutDashboard, roles: ["*"], tone: "cyan" },
      { to: "/operacion", label: "Supervisión de empresa", description: "Operación de todas las áreas", icon: Activity, roles: ["Administrador_Empresa", "SuperAdmin", "Super_Admin"], tone: "blue" },
      { to: "/pedidos", label: "Pedidos y tickets", description: "Mesa de ayuda TI", icon: ArrowLeftRight, roles: ["*"], tone: "violet" },
    ],
  },
  {
    id: "management",
    label: "Gestión",
    icon: Settings,
    items: [
      {
        to: "/documentos",
        label: "Documentación",
        description: "Archivos y versiones",
        icon: FolderOpen,
        roles: ["SuperAdmin", "Super_Admin", "TI_Encargado", "TI_Equipo", "Administracion_Encargado", "Administracion_Equipo"],
        tone: "blue",
      },
      {
        to: "/areas",
        label: "Control de áreas",
        description: "Equipos y responsables",
        icon: Building2,
        roles: ["SuperAdmin", "Super_Admin"],
        tone: "amber",
      },
    ],
  },
  {
    id: "dashboards",
    label: "Paneles por área",
    icon: Sparkles,
    items: [
      { to: "/administracion", label: "Administración", description: "Gestión operativa", icon: Settings, roles: ["SuperAdmin", "Super_Admin", "Administracion_Encargado", "Administracion_Equipo"], tone: "blue" },
      { to: "/ventas", label: "Ventas", description: "Control comercial", icon: Briefcase, roles: ["SuperAdmin", "Super_Admin", "Ventas_Encargado", "Ventas_Equipo"], tone: "emerald" },
      { to: "/marketing", label: "Marketing", description: "Campañas y solicitudes", icon: Megaphone, roles: ["SuperAdmin", "Super_Admin", "Marketing_Encargado", "Marketing_Equipo"], tone: "rose" },
      { to: "/ti", label: "Tecnología TI", description: "100% TechDesk: Activos, SLAs y Soporte", icon: Monitor, roles: ["SuperAdmin", "Super_Admin", "TI_Encargado", "TI_Equipo"], tone: "cyan" },
      { to: "/rrhh", label: "Recursos Humanos", description: "Gestión del equipo", icon: Users, roles: ["SuperAdmin", "Super_Admin", "Recursos_Humanos_Encargado", "Recursos_Humanos_Equipo"], tone: "violet" },
      { to: "/contabilidad", label: "Contabilidad", description: "Control financiero", icon: Calculator, roles: ["SuperAdmin", "Super_Admin", "Contabilidad_Encargado", "Contabilidad_Equipo"], tone: "amber" },
      { to: "/psicologia", label: "Psicología", description: "Gestión y solicitudes del área", icon: Brain, roles: ["SuperAdmin", "Super_Admin", "Psicologia_Encargado", "Psicologia_Equipo"], tone: "rose" },
      { to: "/diseno", label: "Diseño", description: "Creación y edición visual", icon: Palette, roles: ["SuperAdmin", "Super_Admin", "Diseno_Encargado", "Diseno_Equipo"], tone: "violet" },
    ],
  },
];

export function Shell() {
  const { theme, toggle } = useTheme();
  const user = useAuth((state) => state.user);
  const logout = useAuth((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const modules = useModules();
  const platform = user?.roles?.includes("Plataforma_Admin");
  const manager = user?.is_manager || user?.roles?.some((role) => role.endsWith("_Encargado") || ["Administrador_Empresa", "SuperAdmin", "Super_Admin"].includes(role));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [myAssetsOpen, setMyAssetsOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navGroups.map((group) => [group.id, true])),
  );

  const hasAccess = (roles: string[]) => {
    if (roles.includes("*")) return true;
    return user?.roles?.some((role) => roles.includes(role) || role === "Administrador_Empresa" || role === "SuperAdmin" || role === "Super_Admin");
  };

  const visibleGroups = useMemo(
    () => platform ? [{ id: "platform", label: "Plataforma", icon: Settings, items: [{ to: "/plataforma", label: "Configuración", description: "Empresa y módulos", icon: Settings, roles: ["Plataforma_Admin"], tone: "blue" as NavTone }] }]
      : navGroups.filter((group) => group.id !== "dashboards" || manager).map((group) => ({ ...group, items: group.items.filter((item) => hasAccess(item.roles) && (item.to !== "/documentos" || modules.documentos)) })).filter((group) => group.items.length > 0),
    [user?.roles, platform, manager, modules.documentos],
  );
  const activeItem = visibleGroups.flatMap((group) => group.items).find((item) => item.to === location.pathname);
  const initials = (user?.name ?? "Usuario")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="app-shell min-h-screen lg:grid lg:grid-cols-[288px_minmax(0,1fr)]">
      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            aria-label="Cerrar menú"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/65 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`sidebar-panel fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[min(288px,calc(100vw-24px))] flex-col overflow-hidden transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:w-[288px] lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="sidebar-aurora" aria-hidden="true">
          <span className="sidebar-orb sidebar-orb-one" />
          <span className="sidebar-orb sidebar-orb-two" />
        </div>

        <div className="relative shrink-0 flex items-center justify-between px-5 pb-5 pt-5">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo className="h-14 w-14" />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-black tracking-tight text-white">SIGECO</div>
              <div className="truncate text-[10px] font-semibold tracking-wide text-slate-400">{platform ? "Configuración de plataforma" : "Control de áreas · soporte TI"}</div>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="sidebar-close lg:hidden" aria-label="Cerrar menú lateral">
            <X size={18} />
          </button>
        </div>

        <div className="relative mx-4 mb-4 flex shrink-0 items-center gap-2 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.05] px-3 py-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/75">Sistema operativo</span>
          <span className="ml-auto text-[10px] font-semibold text-slate-500">En línea</span>
        </div>

        <div className="sidebar-scroll relative min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {visibleGroups.map((group) => {
            const GroupIcon = group.icon;
            const isExpanded = expanded[group.id];
            const containsActive = group.items.some((item) => item.to === location.pathname);

            return (
              <section key={group.id} className="mb-2">
                <button
                  type="button"
                  onClick={() => setExpanded((current) => ({ ...current, [group.id]: !current[group.id] }))}
                  className={`menu-group-trigger ${containsActive ? "has-active" : ""}`}
                  aria-expanded={isExpanded}
                >
                  <span className="flex items-center gap-2">
                    <GroupIcon size={13} />
                    {group.label}
                  </span>
                  <motion.span animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={14} />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.nav
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1 pb-2 pt-1">
                        {group.items.map(({ to, label, description, icon: Icon, tone }) => (
                          <NavLink
                            key={to}
                            to={to}
                            end={to === "/"}
                            data-tone={tone}
                            className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`}
                          >
                            <span className="nav-glow" aria-hidden="true" />
                            <span className="nav-icon"><Icon size={17} strokeWidth={2.1} /></span>
                            <span className="relative min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-extrabold">{label}</span>
                              <span className="mt-0.5 block truncate text-[10px] font-medium opacity-50">{description}</span>
                            </span>
                            <span className="nav-dot" aria-hidden="true" />
                          </NavLink>
                        ))}
                      </div>
                    </motion.nav>
                  )}
                </AnimatePresence>
              </section>
            );
          })}
        </div>

        <div className="sidebar-footer sticky bottom-0 z-20 shrink-0 border-t border-white/[0.06] p-3">
          <div className="user-card">
            <div className="user-avatar">{initials || "U"}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-extrabold text-white">{user?.name}</div>
              <div className="truncate text-[10px] text-slate-400">{user?.email}</div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              className="logout-icon"
              aria-label="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="relative min-w-0 overflow-hidden">
        <div className="app-atmosphere" aria-hidden="true">
          <span className="ambient-orb ambient-orb-one" />
          <span className="ambient-orb ambient-orb-two" />
          <span className="ambient-grid" />
        </div>

        <header className="app-header sticky top-0 z-30 flex h-[68px] items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setMobileOpen(true)} className="header-action lg:hidden" aria-label="Abrir menú">
              <Menu size={19} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="hidden text-[10px] font-black uppercase tracking-[0.18em] text-teal-dark dark:text-teal sm:inline">SIGECO</span>
                <span className="hidden size-1 rounded-full bg-slate-300 sm:inline" />
                <span className="truncate text-sm font-extrabold text-navy dark:text-white">{activeItem?.label ?? "Panel de control"}</span>
              </div>
              <p className="hidden truncate text-[11px] text-slate-500 dark:text-slate-400 sm:block">{activeItem?.description ?? "Control por áreas y mesa de ayuda TI"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={() => setMyAssetsOpen(true)}
              whileTap={{ scale: 0.88 }}
              className="header-action"
              title="Mis Equipos Asignados"
              aria-label="Mis Equipos Asignados"
            >
              <Laptop size={17} />
            </motion.button>
            <motion.button
              type="button"
              onClick={toggle}
              whileTap={{ scale: 0.88 }}
              className="header-action"
              aria-label="Cambiar tema"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ opacity: 0, rotate: -80, scale: 0.5 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 80, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              className="header-logout"
            >
              <LogOut size={15} /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        <MyAssignedAssetsModal isOpen={myAssetsOpen} onClose={() => setMyAssetsOpen(false)} />

        <main className="relative z-10 p-4 sm:p-6 lg:p-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -7, filter: "blur(3px)" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
