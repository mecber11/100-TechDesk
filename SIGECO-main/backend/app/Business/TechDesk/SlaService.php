<?php

namespace App\Business\TechDesk;

use App\Common\Exceptions\DomainException;
use App\Data\Contracts\SlaRepositoryInterface;
use App\Domain\TechDesk\OrderSla;
use App\Domain\TechDesk\SlaPolicy;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class SlaService
{
    public function __construct(
        private readonly SlaRepositoryInterface $slaRepo
    ) {}

    public function listPolicies(): Collection
    {
        return $this->slaRepo->listPolicies();
    }

    public function savePolicy(array $payload, ?int $id = null): SlaPolicy
    {
        $payload['tiempo_primera_respuesta_horas'] = max(0.5, (float) ($payload['tiempo_primera_respuesta_horas'] ?? 2));
        $payload['tiempo_resolucion_horas'] = max(1, (float) ($payload['tiempo_resolucion_horas'] ?? 24));
        $payload['activo'] = (bool) ($payload['activo'] ?? true);

        return $this->slaRepo->savePolicy($payload, $id);
    }

    public function calculateSlaForOrder(object $order): OrderSla
    {
        $priority = $order->prioridad ?? 'Media';
        $category = $order->categoria ?? null;

        $policy = $this->slaRepo->findMatchingPolicy($priority, $category);
        $resolutionHours = $policy ? (float) $policy->tiempo_resolucion_horas : 24.0;
        $firstResponseHours = $policy ? (float) $policy->tiempo_primera_respuesta_horas : 2.0;

        $createdAt = Carbon::parse($order->creado_en ?? now());
        $deadline = (clone $createdAt)->addHours((int) $resolutionHours);

        $now = now();
        $isClosedOrResolved = in_array($order->estado, ['Atendido', 'Cerrado'], true);
        $isInProgress = $order->estado === 'EnAtencion';

        $firstResponseMinutes = null;
        if ($isInProgress || $isClosedOrResolved) {
            $attentionAt = $order->fecha_atencion ?? $order->actualizado_en ?? $now;
            $firstResponseMinutes = max(0, $createdAt->diffInMinutes(Carbon::parse($attentionAt)));
        }

        $resolutionMinutes = null;
        $metSla = null;
        $slaStatus = 'EnTiempo';

        if ($isClosedOrResolved) {
            $resolvedAt = Carbon::parse($order->fecha_atencion ?? $order->fecha_cierre ?? $now);
            $resolutionMinutes = max(0, $createdAt->diffInMinutes($resolvedAt));
            $metSla = $resolvedAt->lte($deadline);
            $slaStatus = $metSla ? 'Cumplido' : 'Vencido';
        } else {
            // En progreso o nuevo
            if ($now->gt($deadline)) {
                $slaStatus = 'Vencido';
                $metSla = false;
            } else {
                $totalMinutes = $createdAt->diffInMinutes($deadline);
                $remainingMinutes = $now->diffInMinutes($deadline, false);
                $percentRemaining = $totalMinutes > 0 ? ($remainingMinutes / $totalMinutes) * 100 : 0;

                if ($percentRemaining <= 25 || $remainingMinutes <= 120) {
                    $slaStatus = 'EnRiesgo';
                } else {
                    $slaStatus = 'EnTiempo';
                }
            }
        }

        $metricData = [
            'id_pedido' => $order->id_pedido,
            'id_politica' => $policy?->id_politica,
            'tiempo_primera_respuesta_minutos' => $firstResponseMinutes,
            'tiempo_resolucion_minutos' => $resolutionMinutes,
            'fecha_limite_sla' => $deadline,
            'cumplio_sla' => $metSla,
            'estado_sla' => $slaStatus,
            'alerta_enviada' => $slaStatus === 'Vencido' || $slaStatus === 'EnRiesgo',
        ];

        return $this->slaRepo->saveOrderSla($metricData);
    }

    public function getMetricByOrder(int $orderId): ?OrderSla
    {
        return $this->slaRepo->findMetricByOrder($orderId);
    }

    public function getDashboardMetrics(): array
    {
        // Actualizar métricas activas
        $activeOrders = $this->slaRepo->getActiveOrdersForSlaTracking();
        foreach ($activeOrders as $order) {
            $this->calculateSlaForOrder($order);
        }

        $metrics = $this->slaRepo->getSlaDashboardMetrics();
        $metrics['active_orders_tracking'] = $activeOrders->map(function ($order) {
            $metric = $this->slaRepo->findMetricByOrder($order->id_pedido);
            return [
                'order_id' => $order->id_pedido,
                'order_code' => $order->codigo_pedido,
                'title' => $order->titulo,
                'priority' => $order->prioridad,
                'status' => $order->estado,
                'from_area' => $order->fromArea?->nombre,
                'requested_by' => $order->requestedBy?->nombre_completo ?? $order->nombre_solicitante,
                'created_at' => $order->creado_en,
                'deadline_sla' => $metric?->fecha_limite_sla,
                'sla_status' => $metric?->estado_sla ?? 'EnTiempo',
            ];
        });

        return $metrics;
    }
}
