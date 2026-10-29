<?php

namespace App\Data\Eloquent;

use App\Data\Contracts\OpsDashboardRepositoryInterface;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class OpsDashboardRepository implements OpsDashboardRepositoryInterface
{
    public function snapshot(?int $areaId, ?int $requesterId = null): array
    {
        $base = $this->orders($areaId, $requesterId);
        $total = (clone $base)->count();
        $resolved = (clone $base)->whereIn('o.estado', ['Atendido', 'Cerrado'])->count();

        return [
            'total' => $total,
            'open' => (clone $base)->whereIn('o.estado', ['Enviado', 'EnAtencion', 'Escalado'])->count(),
            'resolved' => $resolved,
            'urgent' => (clone $base)->where('o.prioridad', 'Urgente')->whereNotIn('o.estado', ['Atendido', 'Cerrado', 'Rechazado'])->count(),
            'completion' => $total > 0 ? round(($resolved / $total) * 100, 1) : 0,
            'orders_by_status' => $this->ordersByStatus($areaId, $requesterId),
            'orders_by_category' => $this->ordersByCategory($areaId, $requesterId),
            'monthly_activity' => $this->monthlyActivity($areaId, $requesterId),
            'recent_orders' => $this->recentOrders($areaId, $requesterId),
        ];
    }

    public function areaPerformance(): array
    {
        return DB::table('org.areas as a')
            ->leftJoin('req.pedidos as o', 'o.area_origen', '=', 'a.id_area')
            ->where('a.activa', true)
            ->groupBy('a.id_area', 'a.nombre', 'a.orden')
            ->orderBy('a.orden')
            ->select('a.id_area', 'a.nombre as area')
            ->selectRaw('COUNT(o.id_pedido) AS total')
            ->selectRaw("COUNT(o.id_pedido) FILTER (WHERE o.estado IN ('Enviado','EnAtencion','Escalado')) AS open")
            ->selectRaw("COUNT(o.id_pedido) FILTER (WHERE o.estado IN ('Atendido','Cerrado')) AS resolved")
            ->get()
            ->map(fn ($row) => [
                'area_id' => $row->id_area,
                'area' => $row->area,
                'total' => (int) $row->total,
                'open' => (int) $row->open,
                'resolved' => (int) $row->resolved,
            ])->all();
    }

    private function orders(?int $areaId, ?int $requesterId = null): Builder
    {
        $query = DB::table('req.pedidos as o');
        if ($requesterId !== null) $query->where('o.solicitado_por', $requesterId);
        if ($areaId !== null) {
            $query->where(function (Builder $visible) use ($areaId) {
                $visible->where('o.area_origen', $areaId)
                    ->orWhere('o.area_destino', $areaId);
            });
        }

        return $query;
    }

    private function ordersByStatus(?int $areaId, ?int $requesterId = null): array
    {
        return $this->orders($areaId, $requesterId)
            ->select('o.estado', DB::raw('COUNT(*) AS qty'))
            ->groupBy('o.estado')->orderByDesc('qty')->get()
            ->map(fn ($row) => ['status' => $row->estado, 'qty' => (int) $row->qty])->all();
    }

    private function ordersByCategory(?int $areaId, ?int $requesterId = null): array
    {
        return $this->orders($areaId, $requesterId)
            ->selectRaw("COALESCE(o.categoria, 'Sin categoría') AS categoria, COUNT(*) AS cantidad")
            ->groupBy('o.categoria')->orderByDesc('cantidad')->get()
            ->map(fn ($row) => ['category' => $row->categoria, 'qty' => (int) $row->cantidad])->all();
    }

    private function monthlyActivity(?int $areaId, ?int $requesterId = null): array
    {
        return $this->orders($areaId, $requesterId)
            ->where('o.creado_en', '>=', now()->subMonths(5)->startOfMonth())
            ->selectRaw("to_char(date_trunc('month', o.creado_en), 'YYYY-MM') AS periodo")
            ->selectRaw('COUNT(*) AS creados')
            ->selectRaw("COUNT(*) FILTER (WHERE o.estado IN ('Atendido','Cerrado')) AS atendidos")
            ->groupByRaw("date_trunc('month', o.creado_en)")
            ->orderByRaw("date_trunc('month', o.creado_en)")
            ->get()->map(fn ($row) => [
                'period' => $row->periodo,
                'created' => (int) $row->creados,
                'resolved' => (int) $row->atendidos,
            ])->all();
    }

    private function recentOrders(?int $areaId, ?int $requesterId = null): array
    {
        return $this->orders($areaId, $requesterId)
            ->leftJoin('org.areas as origin', 'origin.id_area', '=', 'o.area_origen')
            ->leftJoin('org.areas as destination', 'destination.id_area', '=', 'o.area_destino')
            ->leftJoin('sec.usuarios as requester', 'requester.id_usuario', '=', 'o.solicitado_por')
            ->selectRaw('o.id_pedido AS order_id, o.codigo_pedido AS order_code, o.tipo_solicitud AS request_type')
            ->selectRaw('o.titulo AS title, o.categoria AS kind, o.prioridad AS priority, o.estado AS status, o.creado_en AS created_at')
            ->addSelect('origin.nombre as from_area', 'destination.nombre as to_area')
            ->selectRaw('COALESCE(o.nombre_solicitante, requester.nombre_completo) AS requested_by_name, COALESCE(o.correo_solicitante, requester.correo) AS requested_by_email')
            ->orderByDesc('o.creado_en')->limit(8)->get()->all();
    }
}
