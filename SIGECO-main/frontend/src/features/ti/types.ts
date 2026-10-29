export type AssetType =
  | "Laptop"
  | "Desktop"
  | "Monitor"
  | "Periférico"
  | "Accesorio de Red"
  | "Servidor"
  | "Impresora"
  | "Otro";

export type AssetStatus = "Disponible" | "Asignado" | "Mantenimiento" | "Baja";
export type AssetCondition = "Nuevo" | "Bueno" | "Regular" | "Malo";

export type DepreciationInfo = {
  meses_uso: number;
  porcentaje_depreciacion: number;
  valor_actual: number;
  vida_util_restante_meses: number;
};

export type Asset = {
  id_activo: number;
  asset_id?: number;
  codigo_patrimonial: string;
  patrimonial_code?: string;
  numero_serie?: string | null;
  serial_number?: string | null;
  nombre: string;
  name?: string;
  tipo: AssetType;
  type?: string;
  marca: string;
  brand?: string;
  modelo: string;
  model?: string;
  especificaciones?: Record<string, any> | null;
  estado: AssetStatus;
  status?: string;
  condicion_fisica: AssetCondition;
  physical_condition?: string;
  ubicacion?: string | null;
  location?: string | null;
  fecha_adquisicion?: string | null;
  costo_adquisicion?: number | string | null;
  vida_util_meses?: number;
  notas?: string | null;
  creado_en?: string;
  depreciation_info?: DepreciationInfo;
  creator?: { id_usuario: number; nombre_completo: string; correo: string };
  current_assignment?: AssetAssignment | null;
  assignments?: AssetAssignment[];
  maintenances?: AssetMaintenance[];
};

export type AssetAssignment = {
  id_asignacion: number;
  assignment_id?: number;
  id_activo: number;
  id_usuario_asignado: number;
  id_area_destino?: number | null;
  id_pedido?: number | null;
  asignado_por?: number | null;
  fecha_asignacion: string;
  fecha_devolucion_estimada?: string | null;
  fecha_devolucion_real?: string | null;
  estado: "Activo" | "Devuelto" | "Extraviado";
  condicion_entrega: string;
  condicion_devolucion?: string | null;
  observaciones_entrega?: string | null;
  observaciones_devolucion?: string | null;
  recibido_por?: number | null;
  asset?: Asset;
  asset_code?: string;
  asset_name?: string;
  assigned_user?: { id_usuario: number; nombre_completo: string; correo: string };
  assigned_user_name?: string;
  assigned_user_email?: string;
  assigned_area?: { id_area: number; nombre: string; codigo: string };
  assigned_by?: { id_usuario: number; nombre_completo: string; correo: string };
  received_by?: { id_usuario: number; nombre_completo: string; correo: string };
  order?: { id_pedido: number; codigo_pedido: string; titulo: string; estado: string };
};

export type AssetMaintenance = {
  id_mantenimiento: number;
  maintenance_id?: number;
  id_activo: number;
  tipo_mantenimiento: "Preventivo" | "Correctivo";
  titulo: string;
  descripcion_falla?: string | null;
  diagnostico_solucion?: string | null;
  piezas_reemplazadas?: string | null;
  costo: number | string;
  tecnico_responsable: string;
  realizado_por?: number | null;
  estado: "Programado" | "EnProceso" | "Completado" | "Cancelado";
  fecha_programada: string;
  fecha_ejecucion?: string | null;
  proximo_mantenimiento_sugerido?: string | null;
  observaciones?: string | null;
  asset?: Asset;
  asset_code?: string;
  asset_name?: string;
  technician_user?: { id_usuario: number; nombre_completo: string; correo: string };
};

export type SlaPolicy = {
  id_politica: number;
  policy_id?: number;
  nombre: string;
  categoria?: string | null;
  prioridad: "Urgente" | "Alta" | "Media" | "Baja";
  tiempo_primera_respuesta_horas: number;
  tiempo_resolucion_horas: number;
  activo: boolean;
  descripcion?: string | null;
  creado_en?: string;
};

export type SlaDashboardMetrics = {
  total_pedidos_sla: number;
  cumplidos: number;
  vencidos: number;
  en_riesgo: number;
  en_tiempo: number;
  tasa_cumplimiento_porcentaje: number;
  tiempo_promedio_resolucion_horas?: number | null;
  active_orders_tracking: {
    order_id: number;
    order_code: string;
    title: string;
    priority: string;
    status: string;
    from_area?: string;
    requested_by?: string;
    created_at: string;
    deadline_sla?: string;
    sla_status: "EnTiempo" | "EnRiesgo" | "Vencido" | "Cumplido";
  }[];
};
