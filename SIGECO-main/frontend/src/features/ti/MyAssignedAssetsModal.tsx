import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Laptop, X, ShieldCheck } from "lucide-react";
import { api } from "../../lib/api";
import type { AssetAssignment } from "./types";

export function MyAssignedAssetsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["techdesk-my-assets"],
    queryFn: () => api<{ data: AssetAssignment[] }>("/techdesk/my-assets"),
    enabled: isOpen,
  });

  const myAssets = data?.data || [];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Laptop className="h-5 w-5 text-cyan-400" />
              Mis Equipos y Activos Asignados
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Consultando inventario asignado...
              </div>
            ) : !myAssets.length ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Laptop className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                No tienes equipos de cómputo o periféricos asignados formalmente a tu usuario en este momento.
              </div>
            ) : (
              myAssets.map((item) => (
                <div
                  key={item.id_asignacion}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 font-mono text-xs font-bold border border-cyan-500/30">
                      {item.asset?.codigo_patrimonial || "ACT-TI"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 border border-emerald-500/30">
                      <ShieldCheck className="h-3 w-3" />
                      En Posesión
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {item.asset?.nombre}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {item.asset?.tipo} • {item.asset?.marca} {item.asset?.modelo}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Número de Serie</span>
                      <span className="font-mono text-slate-200">
                        {item.asset?.numero_serie || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Fecha Asignación</span>
                      <span className="text-slate-200">
                        {item.fecha_asignacion ? item.fecha_asignacion.substring(0, 10) : "-"}
                      </span>
                    </div>
                  </div>

                  {item.condicion_entrega && (
                    <div className="text-[11px] text-slate-400 italic">
                      Condición entregada: {item.condicion_entrega}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
