import { Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./shared/Shell";
import { RequireAuth } from "./shared/RequireAuth";
import { RequireRole } from "./shared/RequireRole";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { ChangePasswordPage } from "./features/auth/ChangePasswordPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { DocumentsPage } from "./features/documents/DocumentsPage";
import { OrdersPage } from "./features/orders/OrdersPage";
import { AreasPage } from "./features/areas/AreasPage";
import { VentasDashboard } from "./features/ventas/VentasDashboard";
import { MarketingDashboard } from "./features/marketing/MarketingDashboard";
import { TIDashboard } from "./features/ti/TIDashboard";
import { RRHHDashboard } from "./features/rrhh/RRHHDashboard";
import { ContabilidadDashboard } from "./features/contabilidad/ContabilidadDashboard";
import { DisenoDashboard } from "./features/diseno/DisenoDashboard";
import { AreaOperationsDashboard } from "./features/dashboard/AreaOperationsDashboard";
import { PlatformPage } from "./features/platform/PlatformPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/cambiar-contrasena" element={<ChangePasswordPage />} />
        <Route element={<Shell />}>
          <Route element={<RequireRole allowedRoles={["Plataforma_Admin"]} />}>
            <Route path="/plataforma" element={<PlatformPage />} />
          </Route>
          <Route path="/" element={<DashboardPage />} />
          <Route element={<RequireRole allowedRoles={["Administrador_Empresa", "SuperAdmin", "Super_Admin"]} />}>
            <Route path="/operacion" element={<AreaOperationsDashboard title="Supervisión de la empresa" />} />
          </Route>
          <Route path="/pedidos" element={<OrdersPage />} />
          
          <Route element={<RequireRole allowedRoles={["Administracion_Encargado", "Administracion_Equipo", "TI_Encargado", "TI_Equipo", "SuperAdmin", "Super_Admin"]} />}>
            <Route path="/documentos" element={<DocumentsPage />} />
          </Route>

          <Route element={<RequireRole allowedRoles={["SuperAdmin", "Super_Admin"]} />}>
            <Route path="/areas" element={<AreasPage />} />
          </Route>

          <Route element={<RequireRole allowedRoles={["Administracion_Encargado", "Administracion_Equipo", "SuperAdmin", "Super_Admin"]} />}>
            <Route path="/administracion" element={<AreaOperationsDashboard areaCode="ADM" title="Panel de Administración" />} />
          </Route>

          <Route element={<RequireRole allowedRoles={["Ventas_Encargado", "Ventas_Equipo", "SuperAdmin", "Super_Admin"]} />}>
            <Route path="/ventas" element={<VentasDashboard />} />
          </Route>

          <Route element={<RequireRole allowedRoles={["Marketing_Encargado", "Marketing_Equipo", "SuperAdmin", "Super_Admin"]} />}>
            <Route path="/marketing" element={<MarketingDashboard />} />
          </Route>

          <Route element={<RequireRole allowedRoles={["TI_Encargado", "TI_Equipo", "SuperAdmin", "Super_Admin"]} />}>
            <Route path="/ti" element={<TIDashboard />} />
          </Route>

          <Route element={<RequireRole allowedRoles={["Recursos_Humanos_Encargado", "Recursos_Humanos_Equipo", "SuperAdmin", "Super_Admin"]} />}>
            <Route path="/rrhh" element={<RRHHDashboard />} />
          </Route>

          <Route element={<RequireRole allowedRoles={["Contabilidad_Encargado", "Contabilidad_Equipo", "SuperAdmin", "Super_Admin"]} />}>
            <Route path="/contabilidad" element={<ContabilidadDashboard />} />
          </Route>

          <Route element={<RequireRole allowedRoles={["Psicologia_Encargado", "Psicologia_Equipo", "SuperAdmin", "Super_Admin"]} />}>
            <Route path="/psicologia" element={<AreaOperationsDashboard areaCode="PSICO" title="Panel de Psicología" />} />
          </Route>

          <Route element={<RequireRole allowedRoles={["Diseno_Encargado", "Diseno_Equipo", "SuperAdmin", "Super_Admin"]} />}>
            <Route path="/diseno" element={<DisenoDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
