import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../store/auth";
import { FloatingAgent } from "./FloatingAgent";
import { useModules } from "../lib/modules";

export function RequireAuth() {
  const user = useAuth((s) => s.user);
  const initialized = useAuth((s) => s.initialized);
  const hydrate = useAuth((s) => s.hydrate);
  const location = useLocation();
  const modules = useModules();

  useEffect(() => {
    if (!initialized) void hydrate();
  }, [hydrate, initialized]);

  if (!initialized) {
    return <div className="grid min-h-screen place-items-center bg-[#06121f] text-sm font-bold text-cyan-100">Validando sesión…</div>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.must_change_password && location.pathname !== "/cambiar-contrasena") {
    return <Navigate to="/cambiar-contrasena" replace />;
  }
  const platform = user.roles?.includes("Plataforma_Admin");
  const manager = user.is_manager || user.roles?.some((role) => role.endsWith("_Encargado") || ["Administrador_Empresa", "SuperAdmin", "Super_Admin"].includes(role));
  if (!manager && ["/administracion", "/ventas", "/marketing", "/ti", "/rrhh", "/contabilidad", "/psicologia", "/diseno", "/operacion", "/areas"].includes(location.pathname)) return <Navigate to="/" replace />;
  if (platform && !["/plataforma", "/cambiar-contrasena"].includes(location.pathname)) return <Navigate to="/plataforma" replace />;
  if (location.pathname === "/documentos" && !modules.documentos) return <Navigate to="/" replace />;
  return (
    // La cuenta de plataforma tiene una navegación independiente.
    <>
      <Outlet />
      {modules.ia && !platform && !user.must_change_password && <FloatingAgent />}
    </>
  );
}
