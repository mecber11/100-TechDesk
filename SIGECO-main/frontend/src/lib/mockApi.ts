// ─────────────────────────────────────────────────────────────────────────────
// SIGECO – Interceptor de API para Modo Demo (sin backend)
// Se activa cuando VITE_DEMO_MODE=true en el archivo .env.local
// ─────────────────────────────────────────────────────────────────────────────

import {
  DEMO_USER,
  DEMO_ASSETS,
  DEMO_ASSET_KPIS,
  DEMO_ASSIGNMENTS,
  DEMO_MAINTENANCES,
  DEMO_SLA_POLICIES,
  DEMO_SLA_DASHBOARD,
  DEMO_ORDERS,
  DEMO_AREAS,
  DEMO_USERS,
  DEMO_OPS,
  DEMO_LOOKUPS,
  DEMO_MODULES,
  DEMO_INTERNAL_ORDERS,
} from "./mockData";

// Simulamos latencia de red para que se vea realista
const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

// Contador autoincremental para IDs generados en demo
let nextId = 100;

// Estado mutable en memoria para el modo demo
let demoAssets = [...DEMO_ASSETS];
let demoAssignments = [...DEMO_ASSIGNMENTS];
let demoMaintenances = [...DEMO_MAINTENANCES];
let demoSlaPolicies = [...DEMO_SLA_POLICIES];
let demoInternalOrders = [...DEMO_INTERNAL_ORDERS];

// Función paginadora genérica
function paginate<T>(items: T[], page = 1, perPage = 12) {
  const start = (page - 1) * perPage;
  const data = items.slice(start, start + perPage);
  return {
    data,
    total: items.length,
    current_page: page,
    last_page: Math.max(1, Math.ceil(items.length / perPage)),
  };
}

// ─── Router central del mock ─────────────────────────────────────────────────
export async function mockApi<T>(path: string, init?: RequestInit): Promise<T> {
  await delay();

  const method = (init?.method ?? "GET").toUpperCase();
  const cleanPath = path.split("?")[0].replace(/\/$/, "");
  const params = new URLSearchParams(path.includes("?") ? path.split("?")[1] : "");
  const body = init?.body ? JSON.parse(init.body as string) : {};

  // ── AUTH ─────────────────────────────────────────────────────────────────
  if (cleanPath === "/auth/login" && method === "POST") {
    // Acepta cualquier email + password en modo demo
    return { user: { ...DEMO_USER, must_change_password: false } } as unknown as T;
  }
  if (cleanPath === "/auth/me") {
    return { ...DEMO_USER } as unknown as T;
  }
  if (cleanPath === "/auth/logout" && method === "POST") {
    return { message: "Sesión cerrada" } as unknown as T;
  }
  if (cleanPath === "/auth/password" && method === "POST") {
    return { message: "Contraseña actualizada" } as unknown as T;
  }

  // ── MÓDULOS ──────────────────────────────────────────────────────────────
  if (cleanPath === "/modules") {
    return { ia: false, documentos: true, slack: false } as unknown as T;
  }

  // ── ÁREAS ────────────────────────────────────────────────────────────────
  if (cleanPath === "/areas") {
    return DEMO_AREAS as unknown as T;
  }

  // ── USUARIOS ─────────────────────────────────────────────────────────────
  if (cleanPath === "/users") {
    return { data: DEMO_USERS } as unknown as T;
  }

  // ── LOOKUPS ──────────────────────────────────────────────────────────────
  if (cleanPath === "/lookups") {
    return {
      areas: DEMO_AREAS.data,
      users: DEMO_USERS,
      asset_types: ["Laptop","Desktop","Monitor","Periférico","Accesorio de Red","Servidor","Impresora","Otro"],
      priorities: ["Urgente","Alta","Media","Baja"],
    } as unknown as T;
  }

  // ── OPS DASHBOARD ────────────────────────────────────────────────────────
  if (cleanPath === "/ops") {
    return {
      pending: 2, in_progress: 1, resolved: 18, total: 21,
      by_area: DEMO_AREAS.data.map((a) => ({ area: a.nombre, count: Math.floor(Math.random() * 5) })),
    } as unknown as T;
  }

  // ── INTERNAL ORDERS ──────────────────────────────────────────────────────
  if (cleanPath === "/internal-orders") {
    return DEMO_ORDERS as unknown as T;
  }
  if (/^\/internal-orders\/\d+$/.test(cleanPath)) {
    const id = parseInt(cleanPath.split("/")[2]);
    const order = DEMO_ORDERS.data.find((o) => o.id_pedido === id);
    return { data: order ?? DEMO_ORDERS.data[0] } as unknown as T;
  }
  if (cleanPath === "/internal-orders" && method === "POST") {
    return { data: { id_pedido: ++nextId, ...body, estado: "Pendiente", codigo_pedido: `TI-2024-00${nextId}`, creado_en: new Date().toISOString() } } as unknown as T;
  }
  if (/^\/internal-orders\/\d+\/move$/.test(cleanPath) && method === "POST") {
    return { message: "Estado actualizado" } as unknown as T;
  }

  // ── TECHDESK: ACTIVOS ────────────────────────────────────────────────────
  if (cleanPath === "/techdesk/assets/kpis") {
    return { data: DEMO_ASSET_KPIS } as unknown as T;
  }
  if (cleanPath === "/techdesk/assets/stock") {
    const available = demoAssets.filter((a) => a.estado === "Disponible");
    return { data: available } as unknown as T;
  }
  if (cleanPath === "/techdesk/assets" && method === "GET") {
    const page = parseInt(params.get("page") ?? "1");
    const search = (params.get("search") ?? "").toLowerCase();
    const tipo = params.get("tipo") ?? "";
    const estado = params.get("estado") ?? "";
    let filtered = demoAssets;
    if (search) filtered = filtered.filter((a) => a.nombre.toLowerCase().includes(search) || a.codigo_patrimonial.toLowerCase().includes(search) || a.marca.toLowerCase().includes(search));
    if (tipo) filtered = filtered.filter((a) => a.tipo === tipo);
    if (estado) filtered = filtered.filter((a) => a.estado === estado);
    return paginate(filtered, page, 12) as unknown as T;
  }
  if (/^\/techdesk\/assets\/\d+$/.test(cleanPath) && method === "GET") {
    const id = parseInt(cleanPath.split("/")[3]);
    const asset = demoAssets.find((a) => a.id_activo === id);
    return { data: asset } as unknown as T;
  }
  if (cleanPath === "/techdesk/assets" && method === "POST") {
    const newAsset = {
      id_activo: ++nextId,
      ...body,
      estado: body.estado ?? "Disponible",
      condicion_fisica: body.condicion_fisica ?? "Bueno",
      creado_en: new Date().toISOString(),
      depreciation_info: { meses_uso: 0, porcentaje_depreciacion: 0, valor_actual: body.costo_adquisicion ?? 0, vida_util_restante_meses: body.vida_util_meses ?? 36 },
      creator: { id_usuario: 1, nombre_completo: "Encargado de TI", correo: "ti@ingenieros.edu.pe" },
    };
    demoAssets = [newAsset, ...demoAssets];
    return { data: newAsset, message: "Activo registrado exitosamente." } as unknown as T;
  }
  if (/^\/techdesk\/assets\/\d+$/.test(cleanPath) && method === "PUT") {
    const id = parseInt(cleanPath.split("/")[3]);
    demoAssets = demoAssets.map((a) => a.id_activo === id ? { ...a, ...body } : a);
    return { data: demoAssets.find((a) => a.id_activo === id), message: "Activo actualizado." } as unknown as T;
  }
  if (/^\/techdesk\/assets\/\d+$/.test(cleanPath) && method === "DELETE") {
    const id = parseInt(cleanPath.split("/")[3]);
    demoAssets = demoAssets.filter((a) => a.id_activo !== id);
    return { message: "Activo eliminado." } as unknown as T;
  }

  // ── TECHDESK: MIS ACTIVOS ─────────────────────────────────────────────────
  if (cleanPath === "/techdesk/my-assets") {
    const myActive = demoAssignments.filter((a) => a.id_usuario_asignado === 1 && a.estado === "Activo");
    return { data: myActive } as unknown as T;
  }

  // ── TECHDESK: ASIGNACIONES ────────────────────────────────────────────────
  if (cleanPath === "/techdesk/assignments" && method === "GET") {
    const page = parseInt(params.get("page") ?? "1");
    const status = params.get("status") ?? "";
    const search = (params.get("search") ?? "").toLowerCase();
    let filtered = demoAssignments;
    if (status) filtered = filtered.filter((a) => a.estado === status);
    if (search) filtered = filtered.filter((a) => (a.asset_name ?? "").toLowerCase().includes(search) || (a.assigned_user_name ?? "").toLowerCase().includes(search));
    return paginate(filtered, page, 12) as unknown as T;
  }
  if (/^\/techdesk\/assignments\/\d+$/.test(cleanPath) && method === "GET") {
    const id = parseInt(cleanPath.split("/")[3]);
    return { data: demoAssignments.find((a) => a.id_asignacion === id) } as unknown as T;
  }
  if (cleanPath === "/techdesk/assignments" && method === "POST") {
    const asset = demoAssets.find((a) => a.id_activo === parseInt(body.id_activo));
    const newAssignment = {
      id_asignacion: ++nextId,
      id_activo: parseInt(body.id_activo),
      id_usuario_asignado: parseInt(body.id_usuario_asignado),
      id_area_destino: body.id_area_destino ? parseInt(body.id_area_destino) : null,
      asignado_por: 1,
      fecha_asignacion: new Date().toISOString(),
      fecha_devolucion_estimada: body.fecha_devolucion_estimada || null,
      fecha_devolucion_real: null,
      estado: "Activo" as const,
      condicion_entrega: body.condicion_entrega ?? "Operativo",
      observaciones_entrega: body.observaciones_entrega ?? null,
      asset_code: asset?.codigo_patrimonial ?? "",
      asset_name: asset?.nombre ?? "",
      assigned_user_name: DEMO_USERS.find((u) => u.id_usuario === parseInt(body.id_usuario_asignado))?.nombre_completo ?? "Usuario",
      assigned_user_email: DEMO_USERS.find((u) => u.id_usuario === parseInt(body.id_usuario_asignado))?.correo ?? "",
      asset,
      assigned_user: DEMO_USERS.find((u) => u.id_usuario === parseInt(body.id_usuario_asignado)) ? { id_usuario: parseInt(body.id_usuario_asignado), nombre_completo: DEMO_USERS.find((u) => u.id_usuario === parseInt(body.id_usuario_asignado))!.nombre_completo, correo: DEMO_USERS.find((u) => u.id_usuario === parseInt(body.id_usuario_asignado))!.correo } : undefined,
      assigned_by: { id_usuario: 1, nombre_completo: "Encargado de TI", correo: "ti@ingenieros.edu.pe" },
    };
    demoAssignments = [newAssignment, ...demoAssignments];
    // Actualizar estado del activo
    demoAssets = demoAssets.map((a) => a.id_activo === parseInt(body.id_activo) ? { ...a, estado: "Asignado" as const } : a);
    return { data: newAssignment, message: "Activo asignado exitosamente." } as unknown as T;
  }
  if (/^\/techdesk\/assignments\/\d+\/return$/.test(cleanPath) && method === "POST") {
    const id = parseInt(cleanPath.split("/")[3]);
    demoAssignments = demoAssignments.map((a) => a.id_asignacion === id ? { ...a, estado: "Devuelto" as const, fecha_devolucion_real: new Date().toISOString(), condicion_devolucion: body.condicion_devolucion, observaciones_devolucion: body.observaciones_devolucion } : a);
    const assignment = demoAssignments.find((a) => a.id_asignacion === id);
    if (assignment) demoAssets = demoAssets.map((a) => a.id_activo === assignment.id_activo ? { ...a, estado: "Disponible" as const } : a);
    return { message: "Devolución registrada." } as unknown as T;
  }
  if (/^\/techdesk\/assignments\/history\/\d+$/.test(cleanPath)) {
    const assetId = parseInt(cleanPath.split("/")[4]);
    return { data: demoAssignments.filter((a) => a.id_activo === assetId) } as unknown as T;
  }

  // ── TECHDESK: MANTENIMIENTOS ──────────────────────────────────────────────
  if (cleanPath === "/techdesk/maintenances" && method === "GET") {
    const page = parseInt(params.get("page") ?? "1");
    const status = params.get("status") ?? "";
    const tipo = params.get("tipo") ?? "";
    const search = (params.get("search") ?? "").toLowerCase();
    let filtered = demoMaintenances;
    if (status) filtered = filtered.filter((m) => m.estado === status);
    if (tipo) filtered = filtered.filter((m) => m.tipo_mantenimiento === tipo);
    if (search) filtered = filtered.filter((m) => m.titulo.toLowerCase().includes(search) || (m.asset_name ?? "").toLowerCase().includes(search));
    return paginate(filtered, page, 12) as unknown as T;
  }
  if (/^\/techdesk\/maintenances\/\d+$/.test(cleanPath) && method === "GET") {
    const id = parseInt(cleanPath.split("/")[3]);
    return { data: demoMaintenances.find((m) => m.id_mantenimiento === id) } as unknown as T;
  }
  if (cleanPath === "/techdesk/maintenances" && method === "POST") {
    const asset = demoAssets.find((a) => a.id_activo === parseInt(body.id_activo));
    const newMaint = {
      id_mantenimiento: ++nextId,
      ...body,
      id_activo: parseInt(body.id_activo),
      costo: parseFloat(body.costo ?? "0"),
      asset_code: asset?.codigo_patrimonial ?? "",
      asset_name: asset?.nombre ?? "",
      asset,
    };
    demoMaintenances = [newMaint, ...demoMaintenances];
    if (body.estado !== "Completado" && body.estado !== "Cancelado") {
      demoAssets = demoAssets.map((a) => a.id_activo === parseInt(body.id_activo) ? { ...a, estado: "Mantenimiento" as const } : a);
    }
    return { data: newMaint, message: "Mantenimiento registrado." } as unknown as T;
  }
  if (/^\/techdesk\/maintenances\/\d+$/.test(cleanPath) && method === "PUT") {
    const id = parseInt(cleanPath.split("/")[3]);
    demoMaintenances = demoMaintenances.map((m) => m.id_mantenimiento === id ? { ...m, ...body, costo: parseFloat(body.costo ?? m.costo) } : m);
    if (body.estado === "Completado" || body.estado === "Cancelado") {
      const maint = demoMaintenances.find((m) => m.id_mantenimiento === id);
      if (maint) demoAssets = demoAssets.map((a) => a.id_activo === maint.id_activo ? { ...a, estado: "Disponible" as const } : a);
    }
    return { data: demoMaintenances.find((m) => m.id_mantenimiento === id), message: "Mantenimiento actualizado." } as unknown as T;
  }
  if (/^\/techdesk\/maintenances\/\d+$/.test(cleanPath) && method === "DELETE") {
    const id = parseInt(cleanPath.split("/")[3]);
    demoMaintenances = demoMaintenances.filter((m) => m.id_mantenimiento !== id);
    return { message: "Mantenimiento eliminado." } as unknown as T;
  }
  if (/^\/techdesk\/maintenances\/asset\/\d+$/.test(cleanPath)) {
    const assetId = parseInt(cleanPath.split("/")[4]);
    return { data: demoMaintenances.filter((m) => m.id_activo === assetId) } as unknown as T;
  }

  // ── TECHDESK: SLA ─────────────────────────────────────────────────────────
  if (cleanPath === "/techdesk/sla/policies" && method === "GET") {
    return { data: demoSlaPolicies } as unknown as T;
  }
  if (cleanPath === "/techdesk/sla/policies" && method === "POST") {
    const newPolicy = { id_politica: ++nextId, ...body, activo: true, creado_en: new Date().toISOString() };
    demoSlaPolicies = [...demoSlaPolicies, newPolicy];
    return { data: newPolicy, message: "Política SLA guardada." } as unknown as T;
  }
  if (/^\/techdesk\/sla\/policies\/\d+$/.test(cleanPath) && method === "PUT") {
    const id = parseInt(cleanPath.split("/")[4]);
    demoSlaPolicies = demoSlaPolicies.map((p) => p.id_politica === id ? { ...p, ...body } : p);
    return { data: demoSlaPolicies.find((p) => p.id_politica === id), message: "Política actualizada." } as unknown as T;
  }
  if (cleanPath === "/techdesk/sla/dashboard") {
    return { data: DEMO_SLA_DASHBOARD } as unknown as T;
  }
  if (/^\/techdesk\/sla\/order\/\d+$/.test(cleanPath)) {
    const orderId = parseInt(cleanPath.split("/")[4]);
    const tracking = DEMO_SLA_DASHBOARD.active_orders_tracking.find((t) => t.order_id === orderId);
    return { data: tracking ? { id_pedido: orderId, estado_sla: tracking.sla_status, fecha_limite_sla: tracking.deadline_sla } : null } as unknown as T;
  }

  // ── Plataforma / Team / Documents ────────────────────────────────────────
  if (cleanPath === "/platform/settings") {
    return { data: { ia: false, documentos: true, slack: false } } as unknown as T;
  }
  if (cleanPath === "/modules") {
    return DEMO_MODULES as unknown as T;
  }
  if (cleanPath === "/lookups") {
    return DEMO_LOOKUPS as unknown as T;
  }
  if (cleanPath === "/ops") {
    return DEMO_OPS as unknown as T;
  }
  if (cleanPath === "/areas") {
    return DEMO_AREAS as unknown as T;
  }
  if (cleanPath === "/team") {
    return DEMO_USERS.map((u) => ({ ...u, estado: "approved", activo: true, roles: ["TI_Encargado"] })) as unknown as T;
  }
  if (cleanPath === "/documents") {
    return { data: [], total: 0, current_page: 1, last_page: 1 } as unknown as T;
  }

  // ── Pedidos / Mesa de Ayuda (/internal-orders) ───────────────────────────
  if (cleanPath === "/internal-orders" && method === "GET") {
    const page = parseInt(params.get("page") ?? "1");
    const perPage = parseInt(params.get("per_page") ?? "12");
    return paginate(demoInternalOrders, page, perPage) as unknown as T;
  }
  if (cleanPath === "/internal-orders" && method === "POST") {
    const newOrder = {
      order_id: ++nextId,
      order_code: `REQ-2024-${String(nextId).padStart(3, "0")}`,
      request_type: body.request_type ?? "Incidente",
      title: body.title ?? "Nueva solicitud",
      kind: body.kind ?? "Soporte TI",
      priority: body.priority ?? "Media",
      status: "Pendiente",
      description: body.description ?? "",
      created_at: new Date().toISOString(),
      from_area: { name: "Tecnología de la Información" },
      to_area: { name: body.to_area_code ? (DEMO_LOOKUPS.areas.find(a => a.code === body.to_area_code)?.name ?? "TI") : "Tecnología de la Información" },
      requested_by: { full_name: DEMO_USER.name, email: DEMO_USER.email },
      assigned_to: { full_name: "Encargado de TI", email: "ti@ingenieros.edu.pe" },
      attachments: [],
      history: [],
    };
    demoInternalOrders = [newOrder, ...demoInternalOrders];
    return newOrder as unknown as T;
  }
  if (/^\/internal-orders\/\d+$/.test(cleanPath) && method === "GET") {
    const id = parseInt(cleanPath.split("/")[2]);
    const found = demoInternalOrders.find((o) => o.order_id === id);
    return (found ?? demoInternalOrders[0]) as unknown as T;
  }
  if (/^\/internal-orders\/\d+\/move$/.test(cleanPath) && method === "POST") {
    const id = parseInt(cleanPath.split("/")[2]);
    const toStatus = body.to_status ?? "En Proceso";
    demoInternalOrders = demoInternalOrders.map((o) =>
      o.order_id === id
        ? {
            ...o,
            status: toStatus,
            history: [
              ...(o.history ?? []),
              {
                history_id: ++nextId,
                from_status: o.status,
                to_status: toStatus,
                note: body.note ?? "",
                changed_at: new Date().toISOString(),
                changed_by: { full_name: DEMO_USER.name, email: DEMO_USER.email },
              },
            ],
          }
        : o,
    );
    return { message: "Estado de orden actualizado con éxito." } as unknown as T;
  }
  if (cleanPath === "/internal-orders/assist" && method === "POST") {
    return {
      title: "Solicitud clasificada automáticamente por el asistente",
      description: body.text ?? "",
      request_type: "Incidente",
      kind: "Soporte Técnico",
      priority: "Alta",
      to_area_code: "TI",
      confidence: "Alta (94%)",
      reason: "Detectadas palabras clave de infraestructura y soporte informático.",
      alternatives: ["Mesa de ayuda TI", "Atención a usuarios"],
      areas: DEMO_LOOKUPS.areas.map(a => ({ code: a.code, name: a.name, purpose: "Gestión de solicitudes" })),
    } as unknown as T;
  }

  // Fallback – ruta no manejada
  console.warn(`[DEMO MODE] Ruta no mockeada: ${method} ${path}`);
  return { data: [], message: "Demo: ruta no implementada" } as unknown as T;
}
