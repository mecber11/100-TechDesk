import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../store/auth";

export function RequireRole({ allowedRoles }: { allowedRoles: string[] }) {
  const user = useAuth((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasRole = user.roles?.some(
    (role) => allowedRoles.includes(role) || (!allowedRoles.includes("Plataforma_Admin") && ["Administrador_Empresa", "SuperAdmin", "Super_Admin"].includes(role)),
  );

  if (!hasRole) {
    // Optionally redirect to a 403 page or the root dashboard
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
