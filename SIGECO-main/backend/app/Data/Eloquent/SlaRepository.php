<?php

namespace App\Data\Eloquent;

use App\Data\Contracts\SlaRepositoryInterface;
use App\Domain\Req\InternalOrder;
use App\Domain\TechDesk\OrderSla;
use App\Domain\TechDesk\SlaPolicy;
use App\Domain\TechDesk\TechDeskNotification;
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
            $policy = SlaPolicy::query()->where('id_politica', $id)->firstOrFail();
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

        // Buscar política de la misma prioridad con categoría general (null)
        $samePriorityGeneral = $query->whereNull('categoria')->first();
        if ($samePriorityGeneral) {
            return $samePriorityGeneral;
        }

        // Si no hay categoría general con esa prioridad, retornar cualquier política activa de esa misma prioridad
        return SlaPolicy::query()->where('activo', true)->where('prioridad', $priority)->first();
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
        // Alcance TI: pedidos dirigidos a TI o creados para TI que se encuentren activos, sin límite silencioso de 50
        return InternalOrder::query()
            ->with(['fromArea', 'toArea', 'requestedBy:id_usuario,nombre_completo,correo'])
            ->whereHas('toArea', function ($q) {
                $q->where('codigo', 'TI');
            })
            ->whereIn('estado', ['Enviado', 'EnAtencion', 'Escalado'])
            ->orderBy('creado_en')
            ->get();
    }

    public function getSlaDashboardMetrics(): array
    {
        $totalOrdersWithSla = OrderSla::query()->count();
        $cumplidos = OrderSla::query()->where('cumplio_sla', true)->count();
        $vencidos = OrderSla::query()->where(function ($q) {
            $q->where('estado_sla', 'Vencido')->orWhere('cumplio_sla', false);
        })->count();
        $enRiesgo = OrderSla::query()->where('estado_sla', 'EnRiesgo')->count();
        $enTiempo = OrderSla::query()->where('estado_sla', 'EnTiempo')->count();

        $tasaCumplimiento = ($cumplidos + $vencidos) > 0
            ? round(($cumplidos / ($cumplidos + $vencidos)) * 100, 1)
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

    public function getNotifications(?int $userId = null): Collection
    {
        $query = TechDeskNotification::query()->orderByDesc('creado_en');

        if ($userId !== null) {
            $query->where(function ($q) use ($userId) {
                $q->whereNull('destinatario_id')->orWhere('destinatario_id', $userId);
            });
        }

        return $query->limit(50)->get();
    }

    public function markNotificationRead(int $id): bool
    {
        $notification = TechDeskNotification::query()->find($id);
        if ($notification) {
            $notification->update(['leido' => true, 'actualizado_en' => now()]);
            return true;
        }

        return false;
    }

    public function markAllNotificationsRead(?int $userId = null): int
    {
        $query = TechDeskNotification::query()->where('leido', false);
        if ($userId !== null) {
            $query->where(function ($q) use ($userId) {
                $q->whereNull('destinatario_id')->orWhere('destinatario_id', $userId);
            });
        }

        return $query->update(['leido' => true, 'actualizado_en' => now()]);
    }

    public function createNotification(array $data): ?object
    {
        $data['creado_en'] = now();
        $data['actualizado_en'] = now();

        return TechDeskNotification::query()->create($data);
    }

    public function findNotificationByOrderAndType(int $orderId, string $type): ?object
    {
        return TechDeskNotification::query()
            ->where('id_pedido', $orderId)
            ->where('tipo', $type)
            ->first();
    }
}
