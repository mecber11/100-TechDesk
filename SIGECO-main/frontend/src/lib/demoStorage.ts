import type {
  Asset,
  AssetAssignment,
  AssetMaintenance,
  SlaPolicy,
  AssetImage,
  TechDeskNotification,
} from "../features/ti/types";

const DB_NAME = "SIGECO_TECHDESK_DEMO_V2";
const DB_VERSION = 1;

// Default sample SVG data-URI for standalone demo photos (laptop, server, network)
export const DEFAULT_DEMO_IMAGES: AssetImage[] = [
  {
    id_imagen: 1,
    image_id: 1,
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'><rect width='400' height='260' fill='%230f172a'/><rect x='80' y='40' width='240' height='150' rx='8' fill='%231e293b' stroke='%2338bdf8' stroke-width='2'/><rect x='95' y='55' width='210' height='120' rx='4' fill='%230284c7'/><polygon points='40,205 360,205 340,195 60,195' fill='%23334155'/><text x='200' y='125' fill='white' font-family='sans-serif' font-size='16' font-weight='bold' text-anchor='middle'>HP EliteBook 840</text></svg>",
    mime: "image/svg+xml",
    tamano_bytes: 4096,
    nombre_original: "hp_elitebook_shared.svg",
    hash_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    creado_en: "2025-10-29T10:00:00Z",
  },
  {
    id_imagen: 2,
    image_id: 2,
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'><rect width='400' height='260' fill='%230f172a'/><rect x='60' y='50' width='280' height='140' rx='6' fill='%231e293b' stroke='%2310b981' stroke-width='2'/><circle cx='90' cy='85' r='6' fill='%2310b981'/><circle cx='115' cy='85' r='6' fill='%2310b981'/><rect x='140' y='75' width='180' height='20' rx='3' fill='%23047857'/><text x='200' y='145' fill='white' font-family='sans-serif' font-size='15' font-weight='bold' text-anchor='middle'>Dell PowerEdge R750</text></svg>",
    mime: "image/svg+xml",
    tamano_bytes: 3800,
    nombre_original: "dell_poweredge_server.svg",
    hash_sha256: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
    creado_en: "2024-05-15T12:00:00Z",
  },
  {
    id_imagen: 3,
    image_id: 3,
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'><rect width='400' height='260' fill='%230f172a'/><rect x='70' y='30' width='260' height='160' rx='6' fill='%231e293b' stroke='%23f59e0b' stroke-width='2'/><rect x='85' y='45' width='230' height='130' fill='%23b45309'/><rect x='185' y='190' width='30' height='35' fill='%23475569'/><rect x='150' y='225' width='100' height='10' rx='3' fill='%23334155'/><text x='200' y='115' fill='white' font-family='sans-serif' font-size='16' font-weight='bold' text-anchor='middle'>LG UltraFine 27&quot; 4K</text></svg>",
    mime: "image/svg+xml",
    tamano_bytes: 4200,
    nombre_original: "lg_ultrafine_monitor.svg",
    hash_sha256: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    creado_en: "2024-04-20T09:00:00Z",
  },
];

// Cálculo estandarizado de meses completos de calendario con aniversarios y ajuste de fin de mes (Sección 6.3)
export function calculateCompletedCalendarMonths(acquisitionDateStr: string, asOfDateStr: string): number {
  if (!acquisitionDateStr || !asOfDateStr) return 0;

  const [acqY, acqM, acqD] = acquisitionDateStr.split("T")[0].split("-").map(Number);
  const [asOfY, asOfM, asOfD] = asOfDateStr.split("T")[0].split("-").map(Number);

  if (asOfY < acqY || (asOfY === acqY && asOfM < acqM) || (asOfY === acqY && asOfM === acqM && asOfD < acqD)) {
    return 0;
  }

  let totalMonths = (asOfY - acqY) * 12 + (asOfM - acqM);
  // Días en el mes de corte
  const daysInAsOfMonth = new Date(asOfY, asOfM, 0).getDate();
  const effectiveDay = Math.min(acqD, daysInAsOfMonth);

  if (asOfD < effectiveDay) {
    totalMonths--;
  }

  return Math.max(0, totalMonths);
}

// Cálculo de depreciación de un activo para una fecha de corte dada
export function computeAssetDepreciation(asset: Asset, asOfDateStr: string = "2026-10-29"): {
  valorable: boolean;
  motivo_pendiente: string | null;
  meses_uso: number;
  meses_depreciados: number;
  porcentaje_depreciacion: number;
  depreciacion_acumulada: number;
  valor_actual: number;
  vida_util_restante_meses: number;
} {
  const cost = asset.costo_adquisicion !== null && asset.costo_adquisicion !== undefined && asset.costo_adquisicion !== ""
    ? Number(asset.costo_adquisicion)
    : null;
  const usefulLife = Math.max(1, Number(asset.vida_util_meses || 36));

  if (cost === null || !asset.fecha_adquisicion) {
    return {
      valorable: false,
      motivo_pendiente: cost === null ? "Costo de adquisición no registrado" : "Fecha de adquisición no registrada",
      meses_uso: 0,
      meses_depreciados: 0,
      porcentaje_depreciacion: 0,
      depreciacion_acumulada: 0,
      valor_actual: cost !== null ? Math.max(0, cost) : 0,
      vida_util_restante_meses: usefulLife,
    };
  }

  if (cost < 0) {
    return {
      valorable: false,
      motivo_pendiente: "Costo de adquisición inválido",
      meses_uso: 0,
      meses_depreciados: 0,
      porcentaje_depreciacion: 0,
      depreciacion_acumulada: 0,
      valor_actual: 0,
      vida_util_restante_meses: usefulLife,
    };
  }

  const [acqY, acqM, acqD] = asset.fecha_adquisicion.split("T")[0].split("-").map(Number);
  const [asOfY, asOfM, asOfD] = asOfDateStr.split("T")[0].split("-").map(Number);

  if (asOfY < acqY || (asOfY === acqY && asOfM < acqM) || (asOfY === acqY && asOfM === acqM && asOfD < acqD)) {
    return {
      valorable: false,
      motivo_pendiente: "Fecha de adquisición futura",
      meses_uso: 0,
      meses_depreciados: 0,
      porcentaje_depreciacion: 0,
      depreciacion_acumulada: 0,
      valor_actual: cost,
      vida_util_restante_meses: usefulLife,
    };
  }

  const completedMonths = calculateCompletedCalendarMonths(asset.fecha_adquisicion, asOfDateStr);
  const m = Math.min(usefulLife, completedMonths);

  const depreciacionAcumulada = Math.round((cost * m / usefulLife) * 100) / 100;
  const valorActual = Math.max(0, Math.round((cost - depreciacionAcumulada) * 100) / 100);
  const porcentaje = cost > 0 ? Math.min(100, Math.round((depreciacionAcumulada / cost) * 10000) / 100) : 0;

  return {
    valorable: true,
    motivo_pendiente: null,
    meses_uso: completedMonths,
    meses_depreciados: m,
    porcentaje_depreciacion: porcentaje,
    depreciacion_acumulada: depreciacionAcumulada,
    valor_actual: valorActual,
    vida_util_restante_meses: Math.max(0, usefulLife - completedMonths),
  };
}

let dbInstance: IDBDatabase | null = null;

export async function getDb(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("assets")) {
        db.createObjectStore("assets", { keyPath: "id_activo" });
      }
      if (!db.objectStoreNames.contains("asset_images")) {
        db.createObjectStore("asset_images", { keyPath: "id_imagen" });
      }
      if (!db.objectStoreNames.contains("assignments")) {
        db.createObjectStore("assignments", { keyPath: "id_asignacion" });
      }
      if (!db.objectStoreNames.contains("maintenances")) {
        db.createObjectStore("maintenances", { keyPath: "id_mantenimiento" });
      }
      if (!db.objectStoreNames.contains("sla_policies")) {
        db.createObjectStore("sla_policies", { keyPath: "id_politica" });
      }
      if (!db.objectStoreNames.contains("internal_orders")) {
        db.createObjectStore("internal_orders", { keyPath: "id_pedido" });
      }
      if (!db.objectStoreNames.contains("notifications")) {
        db.createObjectStore("notifications", { keyPath: "id_notificacion" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getStoreAll<T>(storeName: string): Promise<T[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getStoreItem<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ? (req.result as T) : null);
    req.onerror = () => reject(req.error);
  });
}

export async function putStoreItem<T>(storeName: string, item: T): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteStoreItem(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Datos sintéticos iniciales completos según especificación
export function getInitialFixtures() {
  const images: AssetImage[] = [...DEFAULT_DEMO_IMAGES];

  const assets: Asset[] = [
    // 1. Laptop HP A (Fixture 13.1)
    {
      id_activo: 1,
      codigo_patrimonial: "TI-2025-001",
      numero_serie: "HP-DEMO-SN-A01",
      tipo_identificador_externo: "Serie",
      emisor_identificador_externo: "HP",
      identificador_normalizado: "HP-DEMO-SN-A01",
      nombre: "Laptop HP EliteBook 840 G10 (Unidad A)",
      tipo: "Laptop",
      marca: "HP",
      modelo: "EliteBook 840 G10",
      id_imagen: 1,
      image_url: images[0].url,
      especificaciones: { procesador: "Intel Core i7-1365U", ram: "16 GB DDR5", almacenamiento: "512 GB NVMe", so: "Windows 11 Pro" },
      estado: "Disponible",
      condicion_fisica: "Bueno",
      ubicacion: "Almacén TI",
      fecha_adquisicion: "2025-10-29",
      costo_adquisicion: 4800.00,
      vida_util_meses: 48,
      notas: "Unidad A asignada al stock corporativo de alto rendimiento.",
      creado_en: "2025-10-29T09:00:00Z",
    },
    // 2. Laptop HP B (Mismo modelo, MISMA FOTO, distinta serie y código - Fixture 13.1)
    {
      id_activo: 2,
      codigo_patrimonial: "TI-2026-002",
      numero_serie: "HP-DEMO-SN-B02",
      tipo_identificador_externo: "Serie",
      emisor_identificador_externo: "HP",
      identificador_normalizado: "HP-DEMO-SN-B02",
      nombre: "Laptop HP EliteBook 840 G10 (Unidad B)",
      tipo: "Laptop",
      marca: "HP",
      modelo: "EliteBook 840 G10",
      id_imagen: 1, // Reutiliza exactamente la misma imagen de HP A sin duplicar stock
      image_url: images[0].url,
      especificaciones: { procesador: "Intel Core i7-1365U", ram: "16 GB DDR5", almacenamiento: "512 GB NVMe", so: "Windows 11 Pro" },
      estado: "Disponible",
      condicion_fisica: "Bueno",
      ubicacion: "Almacén TI",
      fecha_adquisicion: "2026-04-29",
      costo_adquisicion: 2400.00,
      vida_util_meses: 24,
      notas: "Unidad B adquirida posteriormente en lote corporativo.",
      creado_en: "2026-04-29T10:00:00Z",
    },
    // 3. Servidor Dell con Identificador Alternativo (ServiceTag)
    {
      id_activo: 3,
      codigo_patrimonial: "TI-SRV-2024",
      numero_serie: null,
      tipo_identificador_externo: "ServiceTag",
      identificador_alternativo: "DELL-TAG-8841Z",
      emisor_identificador_externo: "DELL",
      identificador_normalizado: "DELL-TAG-8841Z",
      nombre: "Servidor Dell PowerEdge R750",
      tipo: "Servidor",
      marca: "Dell",
      modelo: "PowerEdge R750",
      id_imagen: 2,
      image_url: images[1].url,
      especificaciones: { procesador: "2x Intel Xeon Gold 6338", ram: "128 GB ECC", almacenamiento: "4x 1.92TB SAS SSD RAID 10", so: "Ubuntu Server 24.04 LTS" },
      estado: "Disponible",
      condicion_fisica: "Nuevo",
      ubicacion: "Data Center - Rack 02",
      fecha_adquisicion: "2024-05-15",
      costo_adquisicion: 12500.00,
      vida_util_meses: 60,
      notas: "Nodo principal para microservicios y bases de datos.",
      creado_en: "2024-05-15T08:00:00Z",
    },
    // 4. Activo legado pendiente de completar identificación y valoración
    {
      id_activo: 4,
      codigo_patrimonial: "TI-LEGACY-004",
      numero_serie: null,
      tipo_identificador_externo: "Serie",
      identificador_alternativo: null,
      identificador_normalizado: null,
      nombre: "Laptop Lenovo ThinkPad T480 (Pendiente Ficha)",
      tipo: "Laptop",
      marca: "Lenovo",
      modelo: "ThinkPad T480",
      id_imagen: null,
      image_url: null,
      especificaciones: { ram: "8 GB", almacenamiento: "256 GB SSD" },
      estado: "Disponible",
      condicion_fisica: "Regular",
      ubicacion: "Almacén TI",
      fecha_adquisicion: null,
      costo_adquisicion: null,
      vida_util_meses: 36,
      notas: "Equipo migrado desde sistema anterior con datos patrimoniales incompletos.",
      creado_en: "2023-01-10T12:00:00Z",
    },
    // 5. Monitor LG (Asignado a Ventas)
    {
      id_activo: 5,
      codigo_patrimonial: "TI-2024-010",
      numero_serie: "LG-MON-27UK850",
      tipo_identificador_externo: "Serie",
      emisor_identificador_externo: "LG",
      identificador_normalizado: "LG-MON-27UK850",
      nombre: "Monitor LG 27\" 4K UltraFine",
      tipo: "Monitor",
      marca: "LG",
      modelo: "27UK850-W",
      id_imagen: 3,
      image_url: images[2].url,
      especificaciones: { resolucion: "3840×2160 (4K)", panel: "IPS", frecuencia: "60Hz" },
      estado: "Asignado",
      condicion_fisica: "Bueno",
      ubicacion: "Piso 1 - Ventas",
      fecha_adquisicion: "2024-04-20",
      costo_adquisicion: 1200.00,
      vida_util_meses: 60,
      creado_en: "2024-04-20T11:00:00Z",
    },
    // 6. Desktop HP (En Mantenimiento)
    {
      id_activo: 6,
      codigo_patrimonial: "TI-2023-015",
      numero_serie: "HP-DESK-PD400",
      tipo_identificador_externo: "Serie",
      emisor_identificador_externo: "HP",
      identificador_normalizado: "HP-DESK-PD400",
      nombre: "Desktop HP ProDesk 400 G7",
      tipo: "Desktop",
      marca: "HP",
      modelo: "ProDesk 400 G7",
      id_imagen: null,
      especificaciones: { procesador: "Intel Core i5-10500", ram: "16 GB", almacenamiento: "512 GB SSD" },
      estado: "Mantenimiento",
      condicion_fisica: "Regular",
      ubicacion: "Taller TI - Banco 1",
      fecha_adquisicion: "2023-08-10",
      costo_adquisicion: 2800.00,
      vida_util_meses: 48,
      notas: "Falla en fuente de poder. Intervención en curso.",
      creado_en: "2023-08-10T14:00:00Z",
    },
    // 7. Impresora Epson (Baja)
    {
      id_activo: 7,
      codigo_patrimonial: "TI-2022-099",
      numero_serie: "EPS-L3150-OLD",
      tipo_identificador_externo: "Serie",
      emisor_identificador_externo: "EPSON",
      identificador_normalizado: "EPS-L3150-OLD",
      nombre: "Impresora Multifuncional Epson L3150",
      tipo: "Impresora",
      marca: "Epson",
      modelo: "EcoTank L3150",
      id_imagen: null,
      estado: "Baja",
      condicion_fisica: "Malo",
      ubicacion: "Bajas y Reciclaje TI",
      fecha_adquisicion: "2022-01-10",
      costo_adquisicion: 850.00,
      vida_util_meses: 36,
      notas: "Cabezal dañado irreversiblemente. Declarado de baja técnica.",
      creado_en: "2022-01-10T09:00:00Z",
    },
    // 8. Switch Cisco con MAC (Totalmente depreciado)
    {
      id_activo: 8,
      codigo_patrimonial: "TI-NET-2020",
      numero_serie: null,
      tipo_identificador_externo: "MAC",
      identificador_alternativo: "00:1B:44:11:3A:B7",
      emisor_identificador_externo: "CISCO",
      identificador_normalizado: "00:1B:44:11:3A:B7",
      nombre: "Switch Cisco Catalyst 2960 24P",
      tipo: "Accesorio de Red",
      marca: "Cisco",
      modelo: "Catalyst 2960-24TT",
      id_imagen: null,
      especificaciones: { puertos: "24x 10/100, 2x Gigabit Uplink", capa: "Layer 2" },
      estado: "Disponible",
      condicion_fisica: "Bueno",
      ubicacion: "Almacén TI",
      fecha_adquisicion: "2020-01-15",
      costo_adquisicion: 1500.00,
      vida_util_meses: 36, // Adquirido hace más de 36 meses -> Valor actual = 0.00
      notas: "Operativo como equipo de contingencia para emergencias de red.",
      creado_en: "2020-01-15T10:00:00Z",
    },
    // 9. Laptop Dell XPS 15 (Asignada a Encargado de TI)
    {
      id_activo: 9,
      codigo_patrimonial: "TI-2024-001",
      numero_serie: "SN-DELL-XPS-8821",
      tipo_identificador_externo: "Serie",
      emisor_identificador_externo: "DELL",
      identificador_normalizado: "SN-DELL-XPS-8821",
      nombre: "Laptop Dell XPS 15 9530",
      tipo: "Laptop",
      marca: "Dell",
      modelo: "XPS 15 9530",
      id_imagen: null,
      especificaciones: { procesador: "Intel Core i7-13700H", ram: "32 GB DDR5", almacenamiento: "1 TB NVMe SSD", so: "Windows 11 Pro" },
      estado: "Asignado",
      condicion_fisica: "Bueno",
      ubicacion: "Piso 2 - Área TI",
      fecha_adquisicion: "2024-02-15",
      costo_adquisicion: 4850.00,
      vida_util_meses: 48,
      notas: "Equipo principal del encargado TI",
      creado_en: "2024-02-15T09:00:00Z",
    },
    // 10. Laptop Dell Inspiron (Disponible)
    {
      id_activo: 10,
      codigo_patrimonial: "TI-2024-003",
      numero_serie: "SN-DELL-INSP-3520",
      tipo_identificador_externo: "Serie",
      emisor_identificador_externo: "DELL",
      identificador_normalizado: "SN-DELL-INSP-3520",
      nombre: "Laptop Dell Inspiron 15 3520",
      tipo: "Laptop",
      marca: "Dell",
      modelo: "Inspiron 3520",
      id_imagen: null,
      estado: "Disponible",
      condicion_fisica: "Bueno",
      ubicacion: "Almacén TI",
      fecha_adquisicion: "2024-07-01",
      costo_adquisicion: 2100.00,
      vida_util_meses: 36,
      creado_en: "2024-07-01T10:00:00Z",
    },
    // 11. Monitor Samsung 24"
    {
      id_activo: 11,
      codigo_patrimonial: "TI-2024-011",
      numero_serie: "SN-SAMS-T35F-01",
      tipo_identificador_externo: "Serie",
      emisor_identificador_externo: "SAMSUNG",
      identificador_normalizado: "SN-SAMS-T35F-01",
      nombre: "Monitor Samsung 24\" IPS FHD",
      tipo: "Monitor",
      marca: "Samsung",
      modelo: "LF24T350FHLXZX",
      id_imagen: null,
      estado: "Disponible",
      condicion_fisica: "Bueno",
      ubicacion: "Almacén TI",
      fecha_adquisicion: "2024-08-15",
      costo_adquisicion: 550.00,
      vida_util_meses: 48,
      creado_en: "2024-08-15T12:00:00Z",
    },
    // 12. Impresora HP LaserJet Pro
    {
      id_activo: 12,
      codigo_patrimonial: "TI-2024-020",
      numero_serie: "SN-HP-LJ-M404DN",
      tipo_identificador_externo: "Serie",
      emisor_identificador_externo: "HP",
      identificador_normalizado: "SN-HP-LJ-M404DN",
      nombre: "Impresora Láser HP LaserJet Pro M404dn",
      tipo: "Impresora",
      marca: "HP",
      modelo: "M404dn",
      id_imagen: null,
      estado: "Disponible",
      condicion_fisica: "Nuevo",
      ubicacion: "Almacén TI",
      fecha_adquisicion: "2024-09-01",
      costo_adquisicion: 980.00,
      vida_util_meses: 48,
      creado_en: "2024-09-01T15:00:00Z",
    },
    // 13. Router Cisco ISR 4331
    {
      id_activo: 13,
      codigo_patrimonial: "TI-NET-2023",
      numero_serie: "SN-CSCO-ISR-4331",
      tipo_identificador_externo: "Serie",
      emisor_identificador_externo: "CISCO",
      identificador_normalizado: "SN-CSCO-ISR-4331",
      nombre: "Router Cisco ISR 4331 Gigabit",
      tipo: "Accesorio de Red",
      marca: "Cisco",
      modelo: "ISR 4331",
      id_imagen: null,
      estado: "Disponible",
      condicion_fisica: "Bueno",
      ubicacion: "Data Center - Rack 01",
      fecha_adquisicion: "2023-11-20",
      costo_adquisicion: 4200.00,
      vida_util_meses: 60,
      creado_en: "2023-11-20T10:00:00Z",
    },
    // 14. Teclado Mecánico y Mouse Inalámbrico
    {
      id_activo: 14,
      codigo_patrimonial: "TI-2024-PER-01",
      numero_serie: "LOGI-MK540-001",
      tipo_identificador_externo: "Serie",
      emisor_identificador_externo: "LOGITECH",
      identificador_normalizado: "LOGI-MK540-001",
      nombre: "Kit Teclado + Mouse Inalámbrico Logitech MK540",
      tipo: "Periférico",
      marca: "Logitech",
      modelo: "MK540 Advanced",
      id_imagen: null,
      estado: "Disponible",
      condicion_fisica: "Nuevo",
      ubicacion: "Almacén TI",
      fecha_adquisicion: "2024-10-01",
      costo_adquisicion: 190.00,
      vida_util_meses: 24,
      creado_en: "2024-10-01T11:00:00Z",
    },
  ];

  // Inyectar cálculo de depreciación exacto en cada activo
  assets.forEach((a) => {
    a.depreciation_info = computeAssetDepreciation(a, "2026-10-29");
  });

  // Asignaciones sintéticas (con solicitante vs destino, pedidos vinculados y varios estados de vencimiento)
  const assignments: AssetAssignment[] = [
    // 1. Monitor LG asignado: solicitante Ventas (id_area: 2), destino Ventas (id_area: 2)
    {
      id_asignacion: 1,
      id_activo: 5,
      id_usuario_asignado: 3,
      id_area_solicitante: 2,
      id_area_destino: 2,
      id_pedido: 101,
      asignado_por: 1,
      fecha_asignacion: "2026-10-15T09:30:00Z",
      fecha_devolucion_estimada: "2026-11-15", // Al día (> 3 días)
      fecha_devolucion_real: null,
      estado: "Activo",
      condicion_entrega: "Operativo",
      observaciones_entrega: "Entregado con cable HDMI y cable de poder.",
      assigned_user: { id_usuario: 3, nombre_completo: "Carlos Mendoza", correo: "carlos.mendoza@empresa.com" },
      assigned_area: { id_area: 2, nombre: "Ventas", codigo: "VEN" },
      requesting_area: { id_area: 2, nombre: "Ventas", codigo: "VEN" },
      assigned_by: { id_usuario: 1, nombre_completo: "Encargado de TI", correo: "ti@ingenieros.edu.pe" },
      order: { id_pedido: 101, codigo_pedido: "REQ-VEN-001", titulo: "Monitor secundario para ejecutiva", estado: "Atendido" },
    },
    // 2. Laptop Dell XPS 15 asignada al Encargado TI: solicitante TI (4), destino TI (4)
    {
      id_asignacion: 2,
      id_activo: 9,
      id_usuario_asignado: 1,
      id_area_solicitante: 4,
      id_area_destino: 4,
      id_pedido: null,
      asignado_por: 1,
      fecha_asignacion: "2026-10-01T08:00:00Z",
      fecha_devolucion_estimada: "2026-10-28", // Vencido (anterior a 2026-10-29)
      fecha_devolucion_real: null,
      estado: "Activo",
      condicion_entrega: "Operativo",
      observaciones_entrega: "Equipo de administración de redes y servidores.",
      assigned_user: { id_usuario: 1, nombre_completo: "Encargado de TI", correo: "ti@ingenieros.edu.pe" },
      assigned_area: { id_area: 4, nombre: "Tecnología de la Información", codigo: "TI" },
      requesting_area: { id_area: 4, nombre: "Tecnología de la Información", codigo: "TI" },
      assigned_by: { id_usuario: 1, nombre_completo: "Encargado de TI", correo: "ti@ingenieros.edu.pe" },
    },
    // 3. Préstamo inter-área: Solicitante Ventas (2), Destino Marketing (3) - Por vencer (en los próximos 2 días)
    {
      id_asignacion: 3,
      id_activo: 10,
      id_usuario_asignado: 4,
      id_area_solicitante: 2,
      id_area_destino: 3,
      id_pedido: 102,
      asignado_por: 1,
      fecha_asignacion: "2026-10-20T11:00:00Z",
      fecha_devolucion_estimada: "2026-10-31", // Por vencer (hoy 29 + 2 días)
      fecha_devolucion_real: null,
      estado: "Activo",
      condicion_entrega: "Operativo",
      observaciones_entrega: "Préstamo temporal para diseño gráfico y feria.",
      assigned_user: { id_usuario: 4, nombre_completo: "Lucía Fernández", correo: "lucia.fernandez@empresa.com" },
      assigned_area: { id_area: 3, nombre: "Marketing", codigo: "MKT" },
      requesting_area: { id_area: 2, nombre: "Ventas", codigo: "VEN" },
      assigned_by: { id_usuario: 1, nombre_completo: "Encargado de TI", correo: "ti@ingenieros.edu.pe" },
      order: { id_pedido: 102, codigo_pedido: "REQ-MKT-004", titulo: "Laptop para diseñadora externa", estado: "EnAtencion" },
    },
    // 4. Préstamo devuelto con éxito
    {
      id_asignacion: 4,
      id_activo: 1,
      id_usuario_asignado: 5,
      id_area_solicitante: 1,
      id_area_destino: 1,
      id_pedido: 95,
      asignado_por: 1,
      fecha_asignacion: "2026-09-01T09:00:00Z",
      fecha_devolucion_estimada: "2026-09-30",
      fecha_devolucion_real: "2026-09-29T16:00:00Z",
      estado: "Devuelto",
      condicion_entrega: "Operativo",
      condicion_devolucion: "Operativo",
      observaciones_entrega: "Préstamo mensual de auditoría interna.",
      observaciones_devolucion: "Devuelto en excelentes condiciones con cargador original.",
      recibido_por: 1,
      assigned_user: { id_usuario: 5, nombre_completo: "Roberto Gómez", correo: "roberto.gomez@empresa.com" },
      assigned_area: { id_area: 1, nombre: "Administración", codigo: "ADM" },
      requesting_area: { id_area: 1, nombre: "Administración", codigo: "ADM" },
      assigned_by: { id_usuario: 1, nombre_completo: "Encargado de TI", correo: "ti@ingenieros.edu.pe" },
      received_by: { id_usuario: 1, nombre_completo: "Encargado de TI", correo: "ti@ingenieros.edu.pe" },
    },
    // 5. Préstamo devuelto con daño (que derivó a mantenimiento)
    {
      id_asignacion: 5,
      id_activo: 6,
      id_usuario_asignado: 2,
      id_area_solicitante: 1,
      id_area_destino: 1,
      id_pedido: 98,
      asignado_por: 1,
      fecha_asignacion: "2026-08-01T10:00:00Z",
      fecha_devolucion_estimada: "2026-08-31",
      fecha_devolucion_real: "2026-09-01T11:30:00Z",
      estado: "Devuelto",
      condicion_entrega: "Operativo",
      condicion_devolucion: "Dañado",
      observaciones_entrega: "Entrega inicial para digitación.",
      observaciones_devolucion: "La fuente empezó a emitir humo y no encendió. Derivado a soporte correctivo.",
      recibido_por: 1,
      assigned_user: { id_usuario: 2, nombre_completo: "Ana Torres", correo: "ana.torres@empresa.com" },
      assigned_area: { id_area: 1, nombre: "Administración", codigo: "ADM" },
      requesting_area: { id_area: 1, nombre: "Administración", codigo: "ADM" },
      assigned_by: { id_usuario: 1, nombre_completo: "Encargado de TI", correo: "ti@ingenieros.edu.pe" },
      received_by: { id_usuario: 1, nombre_completo: "Encargado de TI", correo: "ti@ingenieros.edu.pe" },
    },
  ];

  // Vincular current_assignment en los activos asignados
  assets.forEach((a) => {
    const activeAss = assignments.find((asg) => asg.id_activo === a.id_activo && asg.estado === "Activo");
    if (activeAss) {
      a.current_assignment = activeAss;
    }
  });

  // Mantenimientos sintéticos (preventivos y correctivos)
  const maintenances: AssetMaintenance[] = [
    {
      id_mantenimiento: 1,
      id_activo: 6,
      tipo_mantenimiento: "Correctivo",
      titulo: "Reemplazo de fuente de poder ATX 500W",
      descripcion_falla: "Equipo no enciende tras descarga eléctrica en Administración.",
      diagnostico_solucion: "Diagnóstico: capacitor de entrada en cortocircuito. Solución: cambio de fuente por Corsair CV550 y limpieza interna.",
      piezas_reemplazadas: "Fuente de poder 500W ATX",
      costo: 240.00,
      tecnico_responsable: "Ing. Marco Aurelio (Soporte TI)",
      realizado_por: 1,
      estado: "EnProceso",
      fecha_programada: "2026-10-25",
      proximo_mantenimiento_sugerido: "2027-04-25",
      observaciones: "Pieza adquirida con orden de compra OC-TI-883.",
    },
    {
      id_mantenimiento: 2,
      id_activo: 1,
      tipo_mantenimiento: "Preventivo",
      titulo: "Mantenimiento preventivo anual y cambio de pasta térmica",
      descripcion_falla: "Ninguna. Plan de mantenimiento anual programado.",
      diagnostico_solucion: "Limpieza de disipador de cobre, ventilador y aplicación de pasta térmica Noctua NT-H1.",
      piezas_reemplazadas: null,
      costo: 60.00,
      tecnico_responsable: "Téc. Juan Silva",
      realizado_por: 1,
      estado: "Completado",
      fecha_programada: "2026-09-10",
      fecha_ejecucion: "2026-09-10T14:30:00Z",
      proximo_mantenimiento_sugerido: "2027-09-10",
      observaciones: "Temperaturas en estrés pasaron de 82°C a 68°C.",
    },
  ];

  // Políticas SLA corporativas
  const slaPolicies: SlaPolicy[] = [
    {
      id_politica: 1,
      nombre: "SLA Urgente - Fallas Críticas y Bloqueantes",
      prioridad: "Urgente",
      categoria: null,
      tiempo_primera_respuesta_horas: 1.0,
      tiempo_resolucion_horas: 4.0,
      activo: true,
      descripcion: "Aplica a incidentes de máxima prioridad que interrumpen la operación de una o más áreas.",
      creado_en: "2026-10-15T00:00:00Z",
    },
    {
      id_politica: 2,
      nombre: "SLA Alta - Solicitudes y Reemplazos de Hardware",
      prioridad: "Alta",
      categoria: "Hardware",
      tiempo_primera_respuesta_horas: 1.5,
      tiempo_resolucion_horas: 12.0,
      activo: true,
      descripcion: "Reemplazos de laptops, discos o monitores para continuidad laboral.",
      creado_en: "2026-10-15T00:00:00Z",
    },
    {
      id_politica: 3,
      nombre: "SLA Media - Soporte General y Préstamos",
      prioridad: "Media",
      categoria: null,
      tiempo_primera_respuesta_horas: 4.0,
      tiempo_resolucion_horas: 24.0,
      activo: true,
      descripcion: "Soporte cotidiano, licencias de software y entrega programada.",
      creado_en: "2026-10-15T00:00:00Z",
    },
    {
      id_politica: 4,
      nombre: "SLA Baja - Consultas y Tareas Menores",
      prioridad: "Baja",
      categoria: null,
      tiempo_primera_respuesta_horas: 8.0,
      tiempo_resolucion_horas: 48.0,
      activo: true,
      descripcion: "Requerimientos informativos sin premura operativa.",
      creado_en: "2026-10-15T00:00:00Z",
    },
  ];

  // Notificaciones internas de TechDesk
  const notifications: TechDeskNotification[] = [
    {
      id_notificacion: 1,
      id_pedido: 102,
      tipo: "sla_riesgo",
      titulo: "Advertencia SLA: Pedido REQ-MKT-004 en riesgo",
      mensaje: "El pedido REQ-MKT-004 tiene menos de 2 horas para vencer su tiempo de resolución comprometido.",
      destinatario_id: 1,
      leido: false,
      creado_en: "2026-10-29T08:15:00Z",
    },
    {
      id_notificacion: 2,
      id_pedido: 98,
      tipo: "mantenimiento",
      titulo: "Equipo derivado a Mantenimiento",
      mensaje: "El equipo TI-2023-015 fue devuelto con condición 'Dañado' y se creó la orden de trabajo técnico.",
      destinatario_id: 1,
      leido: true,
      creado_en: "2026-09-01T11:35:00Z",
    },
  ];

  return {
    images,
    assets,
    assignments,
    maintenances,
    slaPolicies,
    notifications,
  };
}

// Inicialización de la base IndexedDB con persistencia garantizada
export async function ensureDemoStorageInitialized(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("meta", "readonly");
  const store = tx.objectStore("meta");
  const req = store.get("is_seeded");

  await new Promise<void>((resolve, reject) => {
    req.onsuccess = async () => {
      if (!req.result) {
        await resetDemoData();
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

// Resiembra controlada de datos de prueba en IndexedDB
export async function resetDemoData(): Promise<void> {
  const db = await getDb();
  const fixtures = getInitialFixtures();

  const storeNames = ["assets", "asset_images", "assignments", "maintenances", "sla_policies", "notifications", "meta"];

  const tx = db.transaction(storeNames, "readwrite");

  // Limpiar stores
  storeNames.forEach((s) => tx.objectStore(s).clear());

  // Poblar imágenes
  const imgStore = tx.objectStore("asset_images");
  fixtures.images.forEach((img) => imgStore.put(img));

  // Poblar activos
  const assetStore = tx.objectStore("assets");
  fixtures.assets.forEach((ast) => assetStore.put(ast));

  // Poblar asignaciones
  const assignStore = tx.objectStore("assignments");
  fixtures.assignments.forEach((asg) => assignStore.put(asg));

  // Poblar mantenimientos
  const maintStore = tx.objectStore("maintenances");
  fixtures.maintenances.forEach((m) => maintStore.put(m));

  // Poblar políticas
  const policyStore = tx.objectStore("sla_policies");
  fixtures.slaPolicies.forEach((p) => policyStore.put(p));

  // Poblar notificaciones
  const notifStore = tx.objectStore("notifications");
  fixtures.notifications.forEach((n) => notifStore.put(n));

  // Meta de versión
  const metaStore = tx.objectStore("meta");
  metaStore.put({ key: "is_seeded", value: true, seeded_at: new Date().toISOString() });
  metaStore.put({ key: "schema_version", value: 1 });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

