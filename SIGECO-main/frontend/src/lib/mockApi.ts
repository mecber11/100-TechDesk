// ─────────────────────────────────────────────────────────────────────────────
// SIGECO – Interceptor de API para Modo Demo con Persistencia en IndexedDB
// Se activa cuando VITE_DEMO_MODE=true en .env.local
// ─────────────────────────────────────────────────────────────────────────────

import {
  ensureDemoStorageInitialized,
  getStoreAll,
  getStoreItem,
  putStoreItem,
  deleteStoreItem,
  resetDemoData,
  computeAssetDepreciation,
  DEFAULT_DEMO_IMAGES,
} from "./demoStorage";
import type {
  Asset,
  AssetAssignment,
  AssetMaintenance,
  SlaPolicy,
  AssetImage,
  TechDeskNotification,
  AssetValuationSummary,
  AssignmentSummary,
} from "../features/ti/types";

// Retraso simulado de latencia de red realista
const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

export const DEMO_USER = {
  id: 1,
  id_usuario: 1,
  email: "ti@ingenieros.edu.pe",
  correo: "ti@ingenieros.edu.pe",
  name: "Encargado de TI",
  nombre_completo: "Encargado de TI",
  roles: ["TI_Encargado", "Administrador_Empresa"],
  is_manager: true,
  is_lead: true,
  must_change_password: false,
  area: { id: 4, id_area: 4, code: "TI", codigo: "TI", name: "Tecnología de la Información", nombre: "Tecnología de la Información" },
  modules: { ia: true, documentos: true, slack: true },
};

export const DEMO_AREAS = [
  { id: 1, id_area: 1, code: "ADM", codigo: "ADM", name: "Administración", nombre: "Administración" },
  { id: 2, id_area: 2, code: "VEN", codigo: "VEN", name: "Ventas", nombre: "Ventas" },
  { id: 3, id_area: 3, code: "MKT", codigo: "MKT", name: "Marketing", nombre: "Marketing" },
  { id: 4, id_area: 4, code: "TI", codigo: "TI", name: "Tecnología de la Información", nombre: "Tecnología de la Información" },
  { id: 5, id_area: 5, code: "OPE", codigo: "OPE", name: "Operaciones", nombre: "Operaciones" },
];

export const DEMO_USERS = [
  { id: 1, id_usuario: 1, name: "Encargado de TI", nombre_completo: "Encargado de TI", email: "ti@ingenieros.edu.pe", correo: "ti@ingenieros.edu.pe", area_id: 4, area: DEMO_AREAS[3] },
  { id: 2, id_usuario: 2, name: "Ana Torres", nombre_completo: "Ana Torres", email: "ana.torres@empresa.com", correo: "ana.torres@empresa.com", area_id: 1, area: DEMO_AREAS[0] },
  { id: 3, id_usuario: 3, name: "Carlos Mendoza", nombre_completo: "Carlos Mendoza", email: "carlos.mendoza@empresa.com", correo: "carlos.mendoza@empresa.com", area_id: 2, area: DEMO_AREAS[1] },
  { id: 4, id_usuario: 4, name: "Lucía Fernández", nombre_completo: "Lucía Fernández", email: "lucia.fernandez@empresa.com", correo: "lucia.fernandez@empresa.com", area_id: 3, area: DEMO_AREAS[2] },
  { id: 5, id_usuario: 5, name: "Roberto Gómez", nombre_completo: "Roberto Gómez", email: "roberto.gomez@empresa.com", correo: "roberto.gomez@empresa.com", area_id: 1, area: DEMO_AREAS[0] },
];

// Parser seguro para bodies JSON o FormData
function parseBody(body: any): any {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

export async function mockApi<T>(path: string, init?: RequestInit): Promise<T> {
  await delay();
  await ensureDemoStorageInitialized();

  const method = (init?.method ?? "GET").toUpperCase();
  const cleanPath = path.split("?")[0].replace(/\/$/, "");
  const params = new URLSearchParams(path.includes("?") ? path.split("?")[1] : "");
  const body = parseBody(init?.body);

  // ── 1. AUTH & CONFIGURACIÓN ────────────────────────────────────────────────
  if (cleanPath === "/auth/login" && method === "POST") {
    return { user: { ...DEMO_USER, must_change_password: false } } as unknown as T;
  }
  if (cleanPath === "/auth/me") {
    return { ...DEMO_USER } as unknown as T;
  }
  if (cleanPath === "/auth/logout" && method === "POST") {
    return { message: "Sesión demo finalizada." } as unknown as T;
  }
  if (cleanPath === "/auth/password" && method === "POST") {
    return { message: "Contraseña demo actualizada." } as unknown as T;
  }
  if (cleanPath === "/modules") {
    return { ia: true, documentos: true, slack: true } as unknown as T;
  }
  if (cleanPath === "/areas") {
    return { data: DEMO_AREAS } as unknown as T;
  }
  if (cleanPath === "/users") {
    return { data: DEMO_USERS } as unknown as T;
  }
  if (cleanPath === "/team") {
    return DEMO_USERS as unknown as T;
  }
  if (cleanPath === "/lookups") {
    return {
      areas: DEMO_AREAS,
      users: DEMO_USERS,
      asset_types: ["Laptop", "Desktop", "Monitor", "Periférico", "Accesorio de Red", "Servidor", "Impresora", "Otro"],
      priorities: ["Urgente", "Alta", "Media", "Baja"],
    } as unknown as T;
  }
  if (cleanPath === "/ops") {
    return { pending: 2, in_progress: 1, resolved: 18, total: 21 } as unknown as T;
  }

  // ── 2. IMÁGENES DE ACTIVOS (TD02) ──────────────────────────────────────────
  if (cleanPath === "/techdesk/asset-images" && method === "POST") {
    const images = await getStoreAll<AssetImage>("asset_images");
    const nextId = images.length > 0 ? Math.max(...images.map((i) => i.id_imagen)) + 1 : 1;

    let imageUrl = DEFAULT_DEMO_IMAGES[0].url;
    let mime = "image/png";
    let originalName = "captura_demo.png";

    if (init?.body instanceof FormData) {
      const file = init.body.get("image") as File;
      if (file) {
        mime = file.type || "image/png";
        originalName = file.name || "imagen_demo.png";
        // Convertir File a DataURL para persistirlo en IndexedDB
        imageUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }
    } else if (body && body.image_url) {
      imageUrl = body.image_url;
      if (body.mime) mime = body.mime;
      if (body.nombre_original) originalName = body.nombre_original;
    }

    const newImg: AssetImage = {
      id_imagen: nextId,
      image_id: nextId,
      url: imageUrl,
      mime: mime,
      tamano_bytes: 10240,
      nombre_original: originalName,
      hash_sha256: `demo_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      creado_en: new Date().toISOString(),
    };

    await putStoreItem("asset_images", newImg);

    return {
      message: "Imagen cargada y persistida en demo local.",
      data: newImg,
    } as unknown as T;
  }

  if (cleanPath === "/techdesk/asset-images" && method === "GET") {
    const images = await getStoreAll<AssetImage>("asset_images");
    const assets = await getStoreAll<Asset>("assets");

    const enriched = images.map((img) => ({
      ...img,
      assets: assets
        .filter((a) => a.id_imagen === img.id_imagen)
        .map((a) => ({ id_activo: a.id_activo, codigo_patrimonial: a.codigo_patrimonial, nombre: a.nombre, marca: a.marca, modelo: a.modelo })),
    }));

    return { data: enriched } as unknown as T;
  }

  // ── 3. VALORACIÓN DE ACTIVOS (TD03) ───────────────────────────────────────
  if (cleanPath === "/techdesk/assets/valuation" && method === "GET") {
    const allAssets = await getStoreAll<Asset>("assets");
    const assignments = await getStoreAll<AssetAssignment>("assignments");
    const asOfStr = params.get("as_of") || "2026-10-29";

    const filterType = params.get("tipo");
    const filterStatus = params.get("estado");
    const filterBrand = params.get("marca")?.toLowerCase();
    const filterModel = params.get("modelo")?.toLowerCase();
    const filterFrom = params.get("adquisicion_desde");
    const filterTo = params.get("adquisicion_hasta");
    const filterValStatus = params.get("valoracion_status");
    const filterSearch = params.get("search")?.toLowerCase();

    // Por defecto incluye Disponible, Asignado y Mantenimiento (excluye Baja a menos que se filtre explícitamente)
    let filtered = allAssets.filter((a) => {
      if (filterStatus) {
        if (a.estado !== filterStatus) return false;
      } else {
        if (a.estado === "Baja") return false;
      }

      if (filterType && a.tipo !== filterType) return false;
      if (filterBrand && !a.marca.toLowerCase().includes(filterBrand)) return false;
      if (filterModel && !a.modelo.toLowerCase().includes(filterModel)) return false;
      if (filterFrom && a.fecha_adquisicion && a.fecha_adquisicion < filterFrom) return false;
      if (filterTo && a.fecha_adquisicion && a.fecha_adquisicion > filterTo) return false;

      if (filterSearch) {
        const text = `${a.codigo_patrimonial} ${a.nombre} ${a.numero_serie || ""} ${a.identificador_alternativo || ""}`.toLowerCase();
        if (!text.includes(filterSearch)) return false;
      }

      return true;
    });

    // Enriquecer con cálculo exacto de depreciación lineal
    let valuedCount = 0;
    let pendingCount = 0;
    let fullyDepreciatedCount = 0;
    let totalAcquisition = 0;
    let totalDepreciation = 0;
    let totalCurrent = 0;

    const byTypeMap: Record<string, { tipo: string; count: number; acquisition_value: number; current_value: number }> = {};
    const byStatusMap: Record<string, { estado: string; count: number; acquisition_value: number; current_value: number }> = {};
    const byAreaMap: Record<string, { area: string; count: number; acquisition_value: number; current_value: number }> = {};
    const pendingDetails: { id_activo: number; codigo_patrimonial: string; nombre: string; motivo: string }[] = [];

    const enrichedList: Asset[] = [];

    for (const a of filtered) {
      const dep = computeAssetDepreciation(a, asOfStr);
      a.depreciation_info = dep;

      // Vincular custodia actual
      const activeAsg = assignments.find((asg) => asg.id_activo === a.id_activo && asg.estado === "Activo");
      a.current_assignment = activeAsg || null;

      if (filterValStatus === "completed" && !dep.valorable) continue;
      if (filterValStatus === "pending" && dep.valorable) continue;

      if (dep.valorable) {
        valuedCount++;
        const cost = Number(a.costo_adquisicion || 0);
        const cur = dep.valor_actual;
        const loss = dep.depreciacion_acumulada || 0;

        if (cur <= 0) fullyDepreciatedCount++;

        totalAcquisition += cost;
        totalDepreciation += loss;
        totalCurrent += cur;

        // Desglose por tipo
        if (!byTypeMap[a.tipo]) byTypeMap[a.tipo] = { tipo: a.tipo, count: 0, acquisition_value: 0, current_value: 0 };
        byTypeMap[a.tipo].count++;
        byTypeMap[a.tipo].acquisition_value += cost;
        byTypeMap[a.tipo].current_value += cur;

        // Desglose por estado
        if (!byStatusMap[a.estado]) byStatusMap[a.estado] = { estado: a.estado, count: 0, acquisition_value: 0, current_value: 0 };
        byStatusMap[a.estado].count++;
        byStatusMap[a.estado].acquisition_value += cost;
        byStatusMap[a.estado].current_value += cur;

        // Desglose por área
        const areaName = activeAsg?.assigned_area?.nombre || a.ubicacion || "Almacén TI / Sin custodia activa";
        if (!byAreaMap[areaName]) byAreaMap[areaName] = { area: areaName, count: 0, acquisition_value: 0, current_value: 0 };
        byAreaMap[areaName].count++;
        byAreaMap[areaName].acquisition_value += cost;
        byAreaMap[areaName].current_value += cur;
      } else {
        pendingCount++;
        pendingDetails.push({
          id_activo: a.id_activo,
          codigo_patrimonial: a.codigo_patrimonial,
          nombre: a.nombre,
          motivo: dep.motivo_pendiente || "Datos pendientes de valoración",
        });
      }

      enrichedList.push(a);
    }

    const summary: AssetValuationSummary = {
      as_of: `${asOfStr}T12:00:00-05:00`,
      timezone: "America/Lima",
      currency: "PEN",
      method: "linear_completed_calendar_months",
      scope: "filtered_operational_assets",
      total_assets: enrichedList.length,
      valued_assets: valuedCount,
      pending_valuation_assets: pendingCount,
      fully_depreciated_assets: fullyDepreciatedCount,
      acquisition_value: totalAcquisition.toFixed(2),
      accumulated_depreciation: totalDepreciation.toFixed(2),
      current_value: totalCurrent.toFixed(2),
      pending_details: pendingDetails,
      by_type: Object.values(byTypeMap).map((t) => ({ ...t, acquisition_value: t.acquisition_value.toFixed(2), current_value: t.current_value.toFixed(2) })),
      by_status: Object.values(byStatusMap).map((s) => ({ ...s, acquisition_value: s.acquisition_value.toFixed(2), current_value: s.current_value.toFixed(2) })),
      by_area: Object.values(byAreaMap).map((ar) => ({ ...ar, acquisition_value: ar.acquisition_value.toFixed(2), current_value: ar.current_value.toFixed(2) })),
      assets: enrichedList,
    };

    return { data: summary } as unknown as T;
  }

  // ── 4. ACTIVOS CRUD (TD01) ────────────────────────────────────────────────
  if (cleanPath === "/techdesk/assets" && method === "GET") {
    let assets = await getStoreAll<Asset>("assets");
    const assignments = await getStoreAll<AssetAssignment>("assignments");
    const images = await getStoreAll<AssetImage>("asset_images");

    // Enriquecer relaciones y cálculo de depreciación
    assets = assets.map((a) => {
      const activeAsg = assignments.find((asg) => asg.id_activo === a.id_activo && asg.estado === "Activo");
      const img = images.find((i) => i.id_imagen === a.id_imagen);
      return {
        ...a,
        image_url: img ? img.url : a.image_url,
        current_assignment: activeAsg || null,
        depreciation_info: computeAssetDepreciation(a, "2026-10-29"),
      };
    });

    const search = params.get("search")?.toLowerCase();
    const tipo = params.get("tipo");
    const estado = params.get("estado");
    const condicion = params.get("condicion");

    if (search) {
      assets = assets.filter((a) =>
        `${a.codigo_patrimonial} ${a.nombre} ${a.marca} ${a.modelo} ${a.numero_serie || ""} ${a.identificador_alternativo || ""}`
          .toLowerCase()
          .includes(search)
      );
    }
    if (tipo) assets = assets.filter((a) => a.tipo === tipo);
    if (estado) assets = assets.filter((a) => a.estado === estado);
    if (condicion) assets = assets.filter((a) => a.condicion_fisica === condicion);

    assets.sort((a, b) => b.id_activo - a.id_activo);

    const page = parseInt(params.get("page") || "1", 10);
    const perPage = Math.min(100, parseInt(params.get("per_page") || "12", 10));
    const start = (page - 1) * perPage;
    const paginated = assets.slice(start, start + perPage);

    return {
      data: paginated,
      total: assets.length,
      current_page: page,
      last_page: Math.max(1, Math.ceil(assets.length / perPage)),
    } as unknown as T;
  }

  if (cleanPath === "/techdesk/assets/kpis" && method === "GET") {
    const assets = await getStoreAll<Asset>("assets");
    const disponibles = assets.filter((a) => a.estado === "Disponible").length;
    const asignados = assets.filter((a) => a.estado === "Asignado").length;
    const en_mantenimiento = assets.filter((a) => a.estado === "Mantenimiento").length;
    const de_baja = assets.filter((a) => a.estado === "Baja").length;

    return {
      data: {
        total_activos: assets.length,
        disponibles,
        asignados,
        en_mantenimiento,
        de_baja,
      },
    } as unknown as T;
  }

  if (cleanPath === "/techdesk/assets/stock" && method === "GET") {
    const assets = await getStoreAll<Asset>("assets");
    const stock = assets.filter((a) => a.estado === "Disponible");
    return { data: stock } as unknown as T;
  }

  // Ficha técnica individual de activo (TD09)
  const assetIdMatch = cleanPath.match(/^\/techdesk\/assets\/(\d+)$/);
  if (assetIdMatch && method === "GET") {
    const id = parseInt(assetIdMatch[1], 10);
    const asset = await getStoreItem<Asset>("assets", id);
    if (!asset) {
      throw new Error(`El activo con ID ${id} no existe.`);
    }

    const assignments = await getStoreAll<AssetAssignment>("assignments");
    const maintenances = await getStoreAll<AssetMaintenance>("maintenances");
    const images = await getStoreAll<AssetImage>("asset_images");

    const activeAsg = assignments.find((asg) => asg.id_activo === id && asg.estado === "Activo");
    const assetHistory = assignments.filter((asg) => asg.id_activo === id).sort((a, b) => b.fecha_asignacion.localeCompare(a.fecha_asignacion));
    const assetMaint = maintenances.filter((m) => m.id_activo === id).sort((a, b) => b.fecha_programada.localeCompare(a.fecha_programada));
    const img = images.find((i) => i.id_imagen === asset.id_imagen);

    const fullAsset: Asset = {
      ...asset,
      image_url: img ? img.url : asset.image_url,
      current_assignment: activeAsg || null,
      assignments: assetHistory,
      maintenances: assetMaint,
      depreciation_info: computeAssetDepreciation(asset, "2026-10-29"),
    };

    return { data: fullAsset } as unknown as T;
  }

  if (cleanPath === "/techdesk/assets" && method === "POST") {
    const assets = await getStoreAll<Asset>("assets");
    const nextId = assets.length > 0 ? Math.max(...assets.map((a) => a.id_activo)) + 1 : 1;

    const code = (body.codigo_patrimonial || "").trim().toUpperCase();
    if (!code) throw new Error("El código patrimonial es obligatorio.");

    if (assets.some((a) => a.codigo_patrimonial === code)) {
      throw new Error(`El código patrimonial ${code} ya se encuentra registrado.`);
    }

    // Validación de identidad física (TD01)
    const type = body.tipo_identificador_externo || "Serie";
    const brand = (body.marca || "").trim().toUpperCase();
    const issuer = (body.emisor_identificador_externo || brand || "FABRICANTE").trim().toUpperCase();

    let rawVal = "";
    if (type === "Serie") {
      rawVal = (body.numero_serie || "").trim();
    } else {
      rawVal = (body.identificador_alternativo || body.numero_serie || "").trim();
    }

    const invalidFillers = ["SIN SERIE", "SINSERIE", "N/A", "NA", "0000", "0", "NINGUNO", "NONE", "PENDIENTE"];
    if (!rawVal || invalidFillers.includes(rawVal.toUpperCase())) {
      throw new Error("Debe registrar un identificador físico verificable (Serie, Service Tag, MAC o IMEI válido). No se permiten comodines vacíos.");
    }

    let normalized = rawVal.toUpperCase().replace(/\s+/g, "");
    if (type === "MAC") {
      const cleanMac = rawVal.toUpperCase().replace(/[^A-F0-9]/g, "");
      if (cleanMac.length === 12) {
        normalized = cleanMac.match(/.{1,2}/g)!.join(":");
      } else {
        throw new Error(`La dirección MAC ${rawVal} debe tener 12 dígitos hexadecimales.`);
      }
    } else if (type === "IMEI") {
      const cleanImei = rawVal.replace(/[^0-9]/g, "");
      if (cleanImei.length === 15) {
        normalized = cleanImei;
      } else {
        throw new Error(`El código IMEI ${rawVal} debe tener 15 dígitos numéricos.`);
      }
    }

    // Comprobación de unicidad de identidad externa
    const dup = assets.find(
      (a) =>
        (a.tipo_identificador_externo || "Serie") === type &&
        (a.emisor_identificador_externo || a.marca.toUpperCase()) === issuer &&
        (a.identificador_normalizado || a.numero_serie?.toUpperCase()) === normalized
    );
    if (dup) {
      throw new Error(`El identificador físico '${normalized}' (${type} de ${issuer}) ya pertenece a la unidad ${dup.codigo_patrimonial} (${dup.nombre}).`);
    }

    // Validación de fecha no futura
    if (body.fecha_adquisicion && body.fecha_adquisicion > "2026-10-29") {
      throw new Error("La fecha de adquisición no puede ser posterior a la fecha actual.");
    }

    const newAsset: Asset = {
      id_activo: nextId,
      codigo_patrimonial: code,
      numero_serie: type === "Serie" ? rawVal : null,
      tipo_identificador_externo: type,
      identificador_alternativo: type !== "Serie" ? rawVal : null,
      emisor_identificador_externo: issuer,
      identificador_normalizado: normalized,
      id_imagen: body.id_imagen ? Number(body.id_imagen) : null,
      image_url: body.image_url || null,
      nombre: body.nombre,
      tipo: body.tipo,
      marca: body.marca,
      modelo: body.modelo,
      especificaciones: body.especificaciones || null,
      estado: body.estado || "Disponible",
      condicion_fisica: body.condicion_fisica || "Bueno",
      ubicacion: body.ubicacion || "Almacén TI",
      fecha_adquisicion: body.fecha_adquisicion || null,
      costo_adquisicion: body.costo_adquisicion !== undefined && body.costo_adquisicion !== null && body.costo_adquisicion !== "" ? Number(body.costo_adquisicion) : null,
      vida_util_meses: Number(body.vida_util_meses || 36),
      notas: body.notas || null,
      creado_en: new Date().toISOString(),
    };

    newAsset.depreciation_info = computeAssetDepreciation(newAsset, "2026-10-29");
    await putStoreItem("assets", newAsset);

    return {
      message: "Activo registrado exitosamente en demo.",
      data: newAsset,
    } as unknown as T;
  }

  if (assetIdMatch && method === "PUT") {
    const id = parseInt(assetIdMatch[1], 10);
    const asset = await getStoreItem<Asset>("assets", id);
    if (!asset) throw new Error(`El activo con ID ${id} no existe.`);

    const assets = await getStoreAll<Asset>("assets");

    if (body.codigo_patrimonial) {
      const code = body.codigo_patrimonial.trim().toUpperCase();
      if (code !== asset.codigo_patrimonial && assets.some((a) => a.id_activo !== id && a.codigo_patrimonial === code)) {
        throw new Error(`El código patrimonial ${code} ya pertenece a otro activo.`);
      }
      asset.codigo_patrimonial = code;
    }

    if (body.nombre) asset.nombre = body.nombre;
    if (body.tipo) asset.tipo = body.tipo;
    if (body.marca) asset.marca = body.marca;
    if (body.modelo) asset.modelo = body.modelo;
    if (body.estado) asset.estado = body.estado;
    if (body.condicion_fisica) asset.condicion_fisica = body.condicion_fisica;
    if (body.ubicacion !== undefined) asset.ubicacion = body.ubicacion;
    if (body.id_imagen !== undefined) asset.id_imagen = body.id_imagen ? Number(body.id_imagen) : null;
    if (body.image_url !== undefined) asset.image_url = body.image_url;
    if (body.costo_adquisicion !== undefined) asset.costo_adquisicion = body.costo_adquisicion !== null && body.costo_adquisicion !== "" ? Number(body.costo_adquisicion) : null;
    if (body.fecha_adquisicion !== undefined) asset.fecha_adquisicion = body.fecha_adquisicion;
    if (body.vida_util_meses !== undefined) asset.vida_util_meses = Number(body.vida_util_meses);
    if (body.notas !== undefined) asset.notas = body.notas;
    if (body.especificaciones !== undefined) asset.especificaciones = body.especificaciones;

    asset.depreciation_info = computeAssetDepreciation(asset, "2026-10-29");
    await putStoreItem("assets", asset);

    return { message: "Activo actualizado exitosamente.", data: asset } as unknown as T;
  }

  if (assetIdMatch && method === "DELETE") {
    const id = parseInt(assetIdMatch[1], 10);
    const asset = await getStoreItem<Asset>("assets", id);
    if (!asset) throw new Error(`El activo con ID ${id} no existe.`);
    if (asset.estado === "Asignado") {
      throw new Error("No se puede eliminar un activo actualmente asignado a un usuario.");
    }
    await deleteStoreItem("assets", id);
    return { message: "Activo eliminado de la base local demo." } as unknown as T;
  }

  // ── 5. ASIGNACIONES, FILTROS Y EXPORTACIÓN CSV (TD04, TD05, TD07) ─────────
  if (cleanPath === "/techdesk/assignments/summary" && method === "GET") {
    const assignments = await getStoreAll<AssetAssignment>("assignments");
    const today = "2026-10-29";

    const filtered = filterAssignmentsList(assignments, params);
    const activos = filtered.filter((a) => a.estado === "Activo").length;
    const devueltos = filtered.filter((a) => a.estado === "Devuelto").length;
    const activos_vencidos = filtered.filter(
      (a) => a.estado === "Activo" && a.fecha_devolucion_estimada && a.fecha_devolucion_estimada < today
    ).length;

    const summary: AssignmentSummary = {
      total_filtrado: filtered.length,
      activos,
      devueltos,
      activos_vencidos,
    };

    return { data: summary } as unknown as T;
  }

  if (cleanPath === "/techdesk/assignments/export" && method === "GET") {
    const assignments = await getStoreAll<AssetAssignment>("assignments");
    const assets = await getStoreAll<Asset>("assets");
    const filtered = filterAssignmentsList(assignments, params);

    // Generar CSV completo del conjunto filtrado
    const headers = [
      "ID Asignacion",
      "Codigo Patrimonial",
      "Numero de Serie / Identificador",
      "Tipo Identificador",
      "Equipo / Nombre",
      "Marca",
      "Modelo",
      "Area Solicitante",
      "Area de Destino",
      "Colaborador Asignado",
      "Correo Colaborador",
      "Fecha Asignacion",
      "Fecha Devolucion Estimada",
      "Fecha Devolucion Real",
      "Estado Prestamo",
      "Condicion Entrega",
      "Condicion Devolucion",
      "ID Pedido Vinculado",
    ];

    const rows = filtered.map((asg) => {
      const ast = assets.find((a) => a.id_activo === asg.id_activo) || asg.asset;
      const ident = ast ? (ast.numero_serie || ast.identificador_alternativo || "Sin serie") : "";
      const sanitize = (val: any) => {
        const s = String(val ?? "");
        if (["=", "+", "-", "@"].includes(s.charAt(0))) return `"'${s}"`;
        return `"${s.replace(/"/g, '""')}"`;
      };

      return [
        asg.id_asignacion,
        sanitize(ast?.codigo_patrimonial || asg.asset_code),
        sanitize(ident),
        sanitize(ast?.tipo_identificador_externo || "Serie"),
        sanitize(ast?.nombre || asg.asset_name),
        sanitize(ast?.marca || ""),
        sanitize(ast?.modelo || ""),
        sanitize(asg.requesting_area?.nombre || asg.requesting_area_name || "Área solicitante no informada"),
        sanitize(asg.assigned_area?.nombre || asg.destination_area_name || "Sin área de destino"),
        sanitize(asg.assigned_user?.nombre_completo || asg.assigned_user_name || ""),
        sanitize(asg.assigned_user?.correo || asg.assigned_user_email || ""),
        asg.fecha_asignacion || "",
        asg.fecha_devolucion_estimada || "",
        asg.fecha_devolucion_real || "",
        asg.estado,
        sanitize(asg.condicion_entrega),
        sanitize(asg.condicion_devolucion || ""),
        asg.id_pedido || "",
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    return blob as unknown as T;
  }

  if (cleanPath === "/techdesk/assignment-lookups" && method === "GET") {
    return {
      data: {
        users: DEMO_USERS,
        areas: DEMO_AREAS,
      },
    } as unknown as T;
  }

  if (cleanPath === "/techdesk/assignments" && method === "GET") {
    const assignments = await getStoreAll<AssetAssignment>("assignments");
    const assets = await getStoreAll<Asset>("assets");

    // Enriquecer datos de activos
    const enriched = assignments.map((asg) => {
      const ast = assets.find((a) => a.id_activo === asg.id_activo);
      return {
        ...asg,
        asset: ast || asg.asset,
        asset_code: ast ? ast.codigo_patrimonial : asg.asset_code,
        asset_name: ast ? ast.nombre : asg.asset_name,
      };
    });

    const filtered = filterAssignmentsList(enriched, params);

    // Ordenamiento
    const orderBy = params.get("order_by") || "fecha_asignacion";
    const orderDir = (params.get("order_dir") || "desc").toLowerCase();

    filtered.sort((a: any, b: any) => {
      const valA = a[orderBy] || "";
      const valB = b[orderBy] || "";
      return orderDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    const page = parseInt(params.get("page") || "1", 10);
    const perPage = Math.min(100, parseInt(params.get("per_page") || "12", 10));
    const start = (page - 1) * perPage;
    const paginated = filtered.slice(start, start + perPage);

    return {
      data: paginated,
      total: filtered.length,
      current_page: page,
      last_page: Math.max(1, Math.ceil(filtered.length / perPage)),
    } as unknown as T;
  }

  if (cleanPath === "/techdesk/assignments" && method === "POST") {
    const assetId = parseInt(body.id_activo, 10);
    const userId = parseInt(body.id_usuario_asignado, 10);
    const destAreaId = body.id_area_destino ? parseInt(body.id_area_destino, 10) : null;
    const reqAreaId = body.id_area_solicitante ? parseInt(body.id_area_solicitante, 10) : destAreaId;

    const asset = await getStoreItem<Asset>("assets", assetId);
    if (!asset) throw new Error("El activo seleccionado no existe.");
    if (asset.estado !== "Disponible") {
      throw new Error(`El activo ${asset.codigo_patrimonial} no está disponible (Estado actual: ${asset.estado}).`);
    }

    const assignments = await getStoreAll<AssetAssignment>("assignments");
    const activeAss = assignments.find((a) => a.id_activo === assetId && a.estado === "Activo");
    if (activeAss) {
      throw new Error(`El activo ${asset.codigo_patrimonial} ya tiene un préstamo activo en curso.`);
    }

    const nextId = assignments.length > 0 ? Math.max(...assignments.map((a) => a.id_asignacion)) + 1 : 1;
    const user = DEMO_USERS.find((u) => u.id_usuario === userId) || { id_usuario: userId, nombre_completo: "Colaborador Asignado", correo: "usuario@empresa.com" };
    const destArea = DEMO_AREAS.find((ar) => ar.id_area === destAreaId) || { id_area: destAreaId || 4, nombre: "Área Asignada", codigo: "LOC" };
    const reqArea = DEMO_AREAS.find((ar) => ar.id_area === reqAreaId) || destArea;

    const newAssignment: AssetAssignment = {
      id_asignacion: nextId,
      id_activo: assetId,
      id_usuario_asignado: userId,
      id_area_destino: destAreaId,
      id_area_solicitante: reqAreaId,
      id_pedido: body.id_pedido ? parseInt(body.id_pedido, 10) : null,
      asignado_por: 1,
      fecha_asignacion: new Date().toISOString(),
      fecha_devolucion_estimada: body.fecha_devolucion_estimada || null,
      fecha_devolucion_real: null,
      estado: "Activo",
      condicion_entrega: body.condicion_entrega || "Operativo",
      observaciones_entrega: body.observaciones_entrega || null,
      asset: asset,
      asset_code: asset.codigo_patrimonial,
      asset_name: asset.nombre,
      assigned_user: { id_usuario: user.id_usuario, nombre_completo: user.nombre_completo, correo: user.correo },
      assigned_area: { id_area: destArea.id_area, nombre: destArea.nombre, codigo: destArea.codigo },
      requesting_area: { id_area: reqArea.id_area, nombre: reqArea.nombre, codigo: reqArea.codigo },
    };

    // Actualizar estado del activo en IndexedDB
    asset.estado = "Asignado";
    asset.ubicacion = destArea.nombre;
    asset.current_assignment = newAssignment;

    await putStoreItem("assignments", newAssignment);
    await putStoreItem("assets", asset);

    return {
      message: "Activo asignado exitosamente.",
      data: newAssignment,
    } as unknown as T;
  }

  const returnMatch = cleanPath.match(/^\/techdesk\/assignments\/(\d+)\/return$/);
  if (returnMatch && method === "POST") {
    const id = parseInt(returnMatch[1], 10);
    const assignment = await getStoreItem<AssetAssignment>("assignments", id);
    if (!assignment) throw new Error("La asignación no existe.");
    if (assignment.estado === "Devuelto") {
      throw new Error("Esta asignación ya fue registrada como devuelta anteriormente.");
    }

    const cond = body.condicion_devolucion || "Operativo";
    const isDamaged = ["Malo", "Dañado", "Averiado"].includes(cond);

    assignment.estado = "Devuelto";
    assignment.fecha_devolucion_real = new Date().toISOString();
    assignment.condicion_devolucion = cond;
    assignment.observaciones_devolucion = body.observaciones_devolucion || null;
    assignment.recibido_por = 1;

    // Actualizar activo
    const asset = await getStoreItem<Asset>("assets", assignment.id_activo);
    if (asset) {
      asset.estado = isDamaged ? "Mantenimiento" : "Disponible";
      asset.condicion_fisica = isDamaged ? "Malo" : "Bueno";
      asset.ubicacion = "Almacén TI";
      asset.current_assignment = null;
      await putStoreItem("assets", asset);

      // Si fue dañado, crear alerta en notificaciones
      if (isDamaged) {
        const notifs = await getStoreAll<TechDeskNotification>("notifications");
        const nextNId = notifs.length > 0 ? Math.max(...notifs.map((n) => n.id_notificacion)) + 1 : 1;
        await putStoreItem("notifications", {
          id_notificacion: nextNId,
          tipo: "mantenimiento",
          titulo: `Equipo ${asset.codigo_patrimonial} devuelto dañado`,
          mensaje: `Se registró la devolución de ${asset.nombre} en condición '${cond}'. Se inmovilizó para mantenimiento.`,
          destinatario_id: 1,
          leido: false,
          creado_en: new Date().toISOString(),
        });
      }
    }

    await putStoreItem("assignments", assignment);

    return {
      message: "Devolución registrada correctamente.",
      data: assignment,
    } as unknown as T;
  }

  if (cleanPath === "/techdesk/my-assets" && method === "GET") {
    const assignments = await getStoreAll<AssetAssignment>("assignments");
    const myAssigned = assignments.filter((a) => a.id_usuario_asignado === DEMO_USER.id && a.estado === "Activo");
    return { data: myAssigned } as unknown as T;
  }

  // ── 6. MANTENIMIENTOS (TD08) ──────────────────────────────────────────────
  if (cleanPath === "/techdesk/maintenances" && method === "GET") {
    let maints = await getStoreAll<AssetMaintenance>("maintenances");
    const assets = await getStoreAll<Asset>("assets");

    maints = maints.map((m) => {
      const ast = assets.find((a) => a.id_activo === m.id_activo);
      return {
        ...m,
        asset: ast || m.asset,
        asset_code: ast ? ast.codigo_patrimonial : m.asset_code,
        asset_name: ast ? ast.nombre : m.asset_name,
      };
    });

    const search = params.get("search")?.toLowerCase();
    const status = params.get("status");
    const tipo = params.get("tipo");
    const assetId = params.get("asset_id");

    if (search) {
      maints = maints.filter((m) =>
        `${m.titulo} ${m.tecnico_responsable} ${m.descripcion_falla || ""} ${m.asset_code || ""}`
          .toLowerCase()
          .includes(search)
      );
    }
    if (status) maints = maints.filter((m) => m.estado === status);
    if (tipo) maints = maints.filter((m) => m.tipo_mantenimiento === tipo);
    if (assetId) maints = maints.filter((m) => m.id_activo === parseInt(assetId, 10));

    maints.sort((a, b) => b.fecha_programada.localeCompare(a.fecha_programada));

    const page = parseInt(params.get("page") || "1", 10);
    const perPage = Math.min(100, parseInt(params.get("per_page") || "12", 10));
    const start = (page - 1) * perPage;
    const paginated = maints.slice(start, start + perPage);

    return {
      data: paginated,
      total: maints.length,
      current_page: page,
      last_page: Math.max(1, Math.ceil(maints.length / perPage)),
    } as unknown as T;
  }

  if (cleanPath === "/techdesk/maintenances" && method === "POST") {
    const assetId = parseInt(body.id_activo, 10);
    const asset = await getStoreItem<Asset>("assets", assetId);
    if (!asset) throw new Error("El activo seleccionado no existe.");

    const maints = await getStoreAll<AssetMaintenance>("maintenances");
    const nextId = maints.length > 0 ? Math.max(...maints.map((m) => m.id_mantenimiento)) + 1 : 1;

    const targetState = body.estado || "Programado";
    if (targetState === "EnProceso") {
      if (asset.estado === "Asignado") {
        throw new Error(`El equipo ${asset.codigo_patrimonial} está actualmente prestado. Debe registrarse su devolución antes de iniciar el trabajo técnico.`);
      }
      asset.estado = "Mantenimiento";
      await putStoreItem("assets", asset);
    }

    if (targetState === "Completado") {
      if (!body.tecnico_responsable) throw new Error("Debe registrar el técnico responsable al completar.");
      if (!body.diagnostico_solucion) throw new Error("Debe registrar el diagnóstico o solución aplicada.");
    }

    const newMaint: AssetMaintenance = {
      id_mantenimiento: nextId,
      id_activo: assetId,
      tipo_mantenimiento: body.tipo_mantenimiento || "Preventivo",
      titulo: body.titulo,
      descripcion_falla: body.descripcion_falla || null,
      diagnostico_solucion: body.diagnostico_solucion || null,
      piezas_reemplazadas: body.piezas_reemplazadas || null,
      costo: Number(body.costo || 0),
      tecnico_responsable: body.tecnico_responsable,
      realizado_por: 1,
      estado: targetState,
      fecha_programada: body.fecha_programada || new Date().toISOString().split("T")[0],
      fecha_ejecucion: targetState === "Completado" ? (body.fecha_ejecucion || new Date().toISOString()) : null,
      proximo_mantenimiento_sugerido: body.proximo_mantenimiento_sugerido || null,
      observaciones: body.observaciones || null,
      asset: asset,
      asset_code: asset.codigo_patrimonial,
      asset_name: asset.nombre,
    };

    await putStoreItem("maintenances", newMaint);

    return {
      message: "Registro de mantenimiento guardado en demo.",
      data: newMaint,
    } as unknown as T;
  }

  const maintIdMatch = cleanPath.match(/^\/techdesk\/maintenances\/(\d+)$/);
  if (maintIdMatch && method === "PUT") {
    const id = parseInt(maintIdMatch[1], 10);
    const maint = await getStoreItem<AssetMaintenance>("maintenances", id);
    if (!maint) throw new Error("El mantenimiento no existe.");

    const asset = await getStoreItem<Asset>("assets", maint.id_activo);
    const targetState = body.estado || maint.estado;

    // Transición a EnProceso
    if (targetState === "EnProceso" && maint.estado !== "EnProceso") {
      if (asset && asset.estado === "Asignado") {
        throw new Error(`El equipo ${asset.codigo_patrimonial} está actualmente asignado. Debe recibirse antes de iniciar la intervención.`);
      }
      if (asset) {
        asset.estado = "Mantenimiento";
        await putStoreItem("assets", asset);
      }
    }

    // Transición a Completado
    if (targetState === "Completado") {
      const tech = body.tecnico_responsable || maint.tecnico_responsable;
      const diag = body.diagnostico_solucion || maint.diagnostico_solucion;
      if (!tech) throw new Error("Debe registrar el técnico responsable.");
      if (!diag) throw new Error("Debe registrar el diagnóstico o solución aplicada.");

      maint.fecha_ejecucion = body.fecha_ejecucion || maint.fecha_ejecucion || new Date().toISOString();

      if (asset && asset.estado === "Mantenimiento") {
        asset.estado = "Disponible";
        asset.condicion_fisica = "Bueno";
        await putStoreItem("assets", asset);
      }
    }

    // Transición a Cancelado
    if (targetState === "Cancelado" && maint.estado === "EnProceso") {
      if (asset && asset.estado === "Mantenimiento") {
        asset.estado = "Disponible";
        await putStoreItem("assets", asset);
      }
    }

    Object.assign(maint, body, { estado: targetState });
    await putStoreItem("maintenances", maint);

    return { message: "Mantenimiento actualizado en demo.", data: maint } as unknown as T;
  }

  if (maintIdMatch && method === "DELETE") {
    const id = parseInt(maintIdMatch[1], 10);
    const maint = await getStoreItem<AssetMaintenance>("maintenances", id);
    if (!maint) throw new Error("El registro no existe.");
    if (maint.estado === "Completado") {
      throw new Error("No se puede eliminar físicamente un mantenimiento concluido. Se debe conservar el historial técnico.");
    }
    await deleteStoreItem("maintenances", id);
    return { message: "Mantenimiento eliminado en demo." } as unknown as T;
  }

  // ── 7. SLA POLÍTICAS Y BANDEJA DE NOTIFICACIONES (TD10) ───────────────────
  if (cleanPath === "/techdesk/sla/policies" && method === "GET") {
    const policies = await getStoreAll<SlaPolicy>("sla_policies");
    return { data: policies } as unknown as T;
  }

  if (cleanPath === "/techdesk/sla/policies" && method === "POST") {
    const policies = await getStoreAll<SlaPolicy>("sla_policies");
    const nextId = policies.length > 0 ? Math.max(...policies.map((p) => p.id_politica)) + 1 : 1;

    const newPolicy: SlaPolicy = {
      id_politica: nextId,
      nombre: body.nombre,
      prioridad: body.prioridad,
      categoria: body.categoria || null,
      tiempo_primera_respuesta_horas: Number(body.tiempo_primera_respuesta_horas || 2),
      tiempo_resolucion_horas: Number(body.tiempo_resolucion_horas || 24),
      activo: body.activo !== undefined ? body.activo : true,
      descripcion: body.descripcion || null,
      creado_en: new Date().toISOString(),
    };

    await putStoreItem("sla_policies", newPolicy);
    return { message: "Política de SLA registrada.", data: newPolicy } as unknown as T;
  }

  if (cleanPath === "/techdesk/sla/dashboard" && method === "GET") {
    return {
      data: {
        total_pedidos_sla: 14,
        cumplidos: 11,
        vencidos: 2,
        en_riesgo: 1,
        en_tiempo: 11,
        tasa_cumplimiento_porcentaje: 84.6,
        tiempo_promedio_resolucion_horas: 3.4,
        active_orders_tracking: [
          {
            order_id: 102,
            order_code: "REQ-MKT-004",
            title: "Laptop para diseñadora externa en feria",
            priority: "Alta",
            status: "EnAtencion",
            from_area: "Marketing",
            requested_by: "Lucía Fernández",
            created_at: "2026-10-29T08:00:00Z",
            deadline_sla: "2026-10-29T20:00:00Z",
            sla_status: "EnRiesgo",
          },
          {
            order_id: 105,
            order_code: "REQ-VEN-012",
            title: "Falla de red en área de caja",
            priority: "Urgente",
            status: "Enviado",
            from_area: "Ventas",
            requested_by: "Carlos Mendoza",
            created_at: "2026-10-29T07:00:00Z",
            deadline_sla: "2026-10-29T11:00:00Z",
            sla_status: "Vencido",
          },
        ],
      },
    } as unknown as T;
  }

  if (cleanPath === "/techdesk/notifications" && method === "GET") {
    const notifs = await getStoreAll<TechDeskNotification>("notifications");
    notifs.sort((a, b) => b.creado_en.localeCompare(a.creado_en));
    return { data: notifs } as unknown as T;
  }

  const notifReadMatch = cleanPath.match(/^\/techdesk\/notifications\/(\d+)\/read$/);
  if (notifReadMatch && method === "POST") {
    const id = parseInt(notifReadMatch[1], 10);
    const notif = await getStoreItem<TechDeskNotification>("notifications", id);
    if (notif) {
      notif.leido = true;
      await putStoreItem("notifications", notif);
    }
    return { success: true, message: "Notificación marcada como leída." } as unknown as T;
  }

  if (cleanPath === "/techdesk/notifications/mark-all-read" && method === "POST") {
    const notifs = await getStoreAll<TechDeskNotification>("notifications");
    for (const n of notifs) {
      n.leido = true;
      await putStoreItem("notifications", n);
    }
    return { success: true, count: notifs.length } as unknown as T;
  }

  // ── 8. RESTABLECER DEMO (TD11) ────────────────────────────────────────────
  if (cleanPath === "/techdesk/demo/reset" && method === "POST") {
    await resetDemoData();
    return { message: "Datos de demostración restablecidos a sus fixtures originales." } as unknown as T;
  }

  // ── 9. MESA DE AYUDA / INTERNAL ORDERS ────────────────────────────────────
  if (cleanPath === "/internal-orders" && method === "GET") {
    return {
      data: [
        { id_pedido: 101, codigo_pedido: "REQ-VEN-001", titulo: "Monitor secundario para ejecutiva", estado: "Atendido", prioridad: "Media" },
        { id_pedido: 102, codigo_pedido: "REQ-MKT-004", titulo: "Laptop para diseñadora externa en feria", estado: "EnAtencion", prioridad: "Alta" },
      ],
      total: 2,
      current_page: 1,
      last_page: 1,
    } as unknown as T;
  }

  throw new Error(`Ruta o método no soportado en modo demo: ${method} ${cleanPath}`);
}

// Función auxiliar para aplicar los filtros combinados a asignaciones en demo
function filterAssignmentsList(list: AssetAssignment[], params: URLSearchParams): AssetAssignment[] {
  const today = "2026-10-29";
  const threeDaysLater = "2026-11-01";

  const status = params.get("status");
  const userId = params.get("user_id");
  const assetId = params.get("asset_id");
  const reqAreaId = params.get("requesting_area_id");
  const destAreaId = params.get("destination_area_id");
  const orderId = params.get("order_id");
  const assignedFrom = params.get("assigned_from");
  const assignedTo = params.get("assigned_to");
  const dueFrom = params.get("due_from");
  const dueTo = params.get("due_to");
  const returnedFrom = params.get("returned_from");
  const returnedTo = params.get("returned_to");
  const assetType = params.get("asset_type");
  const dueStatus = params.get("due_status");
  const search = params.get("search")?.toLowerCase();

  return list.filter((asg) => {
    if (status && asg.estado !== status) return false;
    if (userId && asg.id_usuario_asignado !== parseInt(userId, 10)) return false;
    if (assetId && asg.id_activo !== parseInt(assetId, 10)) return false;
    if (reqAreaId && asg.id_area_solicitante !== parseInt(reqAreaId, 10)) return false;
    if (destAreaId && asg.id_area_destino !== parseInt(destAreaId, 10)) return false;
    if (orderId && asg.id_pedido !== parseInt(orderId, 10)) return false;

    if (assignedFrom && asg.fecha_asignacion && asg.fecha_asignacion.substring(0, 10) < assignedFrom) return false;
    if (assignedTo && asg.fecha_asignacion && asg.fecha_asignacion.substring(0, 10) > assignedTo) return false;

    if (dueFrom && asg.fecha_devolucion_estimada && asg.fecha_devolucion_estimada < dueFrom) return false;
    if (dueTo && asg.fecha_devolucion_estimada && asg.fecha_devolucion_estimada > dueTo) return false;

    if (returnedFrom) {
      if (!asg.fecha_devolucion_real || asg.fecha_devolucion_real.substring(0, 10) < returnedFrom) return false;
    }
    if (returnedTo) {
      if (!asg.fecha_devolucion_real || asg.fecha_devolucion_real.substring(0, 10) > returnedTo) return false;
    }

    if (assetType && asg.asset && asg.asset.tipo !== assetType) return false;

    // Vencimiento
    if (dueStatus) {
      if (dueStatus === "overdue") {
        if (asg.estado !== "Activo" || !asg.fecha_devolucion_estimada || asg.fecha_devolucion_estimada >= today) return false;
      } else if (dueStatus === "due_soon") {
        if (
          asg.estado !== "Activo" ||
          !asg.fecha_devolucion_estimada ||
          asg.fecha_devolucion_estimada < today ||
          asg.fecha_devolucion_estimada > threeDaysLater
        )
          return false;
      } else if (dueStatus === "on_track") {
        if (asg.estado !== "Activo" || !asg.fecha_devolucion_estimada || asg.fecha_devolucion_estimada <= threeDaysLater) return false;
      } else if (dueStatus === "no_due_date") {
        if (asg.estado !== "Activo" || asg.fecha_devolucion_estimada) return false;
      }
    }

    if (search) {
      const text = `${asg.asset_code || ""} ${asg.asset_name || ""} ${asg.assigned_user?.nombre_completo || ""} ${asg.assigned_user?.correo || ""}`.toLowerCase();
      if (!text.includes(search)) return false;
    }

    return true;
  });
}
