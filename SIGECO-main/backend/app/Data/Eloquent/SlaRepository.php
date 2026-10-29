<?php

namespace App\Data\Eloquent;

use App\Data\Contracts\SlaRepositoryInterface;
use App\Domain\Req\InternalOrder;
use App\Domain\TechDesk\OrderSla;
use App\Domain\TechDesk\SlaPolicy;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SlaRepository implements SlaRepositoryInterface
{
    public function listPolicies(): Collection
    {
        return SlaPolicy::query()->orderBy('id_politica')->get();
    }

    public function findPolicy(int $id): ?SlaPolicy
    {
        return SlaPolicy::query()->find($id);
    }

    public function savePolicy(array $data, ?int $id = null): SlaPolicy
    {
        if ($id) {
            $policy = SlaPolicy::query()->findOrFail($id);
            $policy->update($data);

            return $policy;
        }

        $data['creado_en'] = now();

        return SlaPolicy::query()->create($data);
    }

    public function findMatchingPolicy(string $priority, ?string $category = null): ?SlaPolicy
    {
        $query = SlaPolicy::query()->where('activo', true)->where('prioridad', $priority);

        if ($category) {
            $catPolicy = (clone $query)->where('categoria', $category)->first();
            if ($catPolicy) {
                return $catPolicy;
            }
        }

        return $query->whereNull('categoria')->first() ?: SlaPolicy::query()->where('activo', true)->first();
    }

    public function findMetricByOrder(int $orderId): ?OrderSla
    {
        return OrderSla::query()->with('policy')->where('id_pedido', $orderId)->first();
    }

    public function saveOrderSla(array $data): OrderSla
    {
        $data['actualizado_en'] = now();

        return OrderSla::query()->updateOrCreate(
            ['id_pedido' => $data['id_pedido']],
            $data
        );
    }

    public function getActiveOrdersForSlaTracking(): Collection
    {
        // Obtener pedidos no cerrados dirigidos a TI o creados recientemente
        return InternalOrder::query()
            ->with(['fromArea', 'toArea', 'requestedBy:id_usuario,nombre_completo,correo'])
            ->whereIn('estado', ['Enviado', 'EnAtencion', 'Escalado'])
            ->orderByDesc('creado_en')
            ->limit(50)
            ->get();
    }

    public function getSlaDashboardMetrics(): array
    {
        $totalOrdersWithSla = OrderSla::query()->count();
        $cumplidos = OrderSla::query()->where('cumplio_sla', true)->count();
        $vencidos = OrderSla::query()->where('estado_sla', 'Vencido')->orWhere('cumplio_sla', false)->count();
        $enRiesgo = OrderSla::query()->where('estado_sla', 'EnRiesgo')->count();
        $enTiempo = OrderSla::query()->where('estado_sla', 'EnTiempo')->count();

        $tasaCumplimiento = $totalOrdersWithSla > 0
            ? round(($cumplidos / max(1, $cumplidos + $vencidos)) * 100, 1)
            : 100.0;

        $avgResolucion = OrderSla::query()
            ->whereNotNull('tiempo_resolucion_minutos')
            ->avg('tiempo_resolucion_minutos');

        return [
            'total_pedidos_sla' => $totalOrdersWithSla,
            'cumplidos' => $cumplidos,
            'vencidos' => $vencidos,
            'en_riesgo' => $enRiesgo,
            'en_tiempo' => $enTiempo,
            'tasa_cumplimiento_porcentaje' => $tasaCumplimiento,
            'tiempo_promedio_resolucion_horas' => $avgResolucion ? round($avgResolucion / 60, 1) : null,
        ];
    }
}
