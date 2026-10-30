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
        $payload['tiempo_primera_respuesta_horas'] = max(0.1, (float) ($payload['tiempo_primera_respuesta_horas'] ?? 2));
        $payload['tiempo_resolucion_horas'] = max(0.5, (float) ($payload['tiempo_resolucion_horas'] ?? 24));
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

        // Respetar horas fraccionarias con precisión en minutos
        $resolutionMinutesLimit = (int) round($resolutionHours * 60);
        $firstResponseMinutesLimit = (int) round($firstResponseHours * 60);

        $deadline = (clone $createdAt)->addMinutes($resolutionMinutesLimit);
        $firstResponseDeadline = (clone $createdAt)->addMinutes($firstResponseMinutesLimit);

        $now = now();
        $isClosedOrResolved = in_array($order->estado, ['Atendido', 'Cerrado'], true);
        $isInProgress = $order->estado === 'EnAtencion';

        // Hito estable de primera atención
        $firstResponseMinutes = null;
        $metFirstResponse = null;
        $attentionAt = $order->fecha_atencion ?? null;

        if ($isInProgress || $isClosedOrResolved || $attentionAt) {
            $attentionTimestamp = Carbon::parse($attentionAt ?? $now);
            $firstResponseMinutes = max(0, $createdAt->diffInMinutes($attentionTimestamp));
            $metFirstResponse = $attentionTimestamp->lte($firstResponseDeadline);
        }

        // Hito de resolución
        $resolutionMinutes = null;
        $metSla = null;
        $slaStatus = 'EnTiempo';

        if ($isClosedOrResolved) {
            $resolvedAt = Carbon::parse($order->fecha_atencion ?? $order->fecha_cierre ?? $now);
            $resolutionMinutes = max(0, $createdAt->diffInMinutes($resolvedAt));
            $metSla = $resolvedAt->lte($deadline);
            $slaStatus = $metSla ? 'Cumplido' : 'Vencido';
        } else {
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

        $metric = $this->slaRepo->saveOrderSla($metricData);

        // Crear alerta persistente en bandeja TechDesk deduplicada por pedido y tipo
        if (in_array($slaStatus, ['EnRiesgo', 'Vencido'], true)) {
            $alertType = $slaStatus === 'Vencido' ? 'sla_vencido' : 'sla_riesgo';
            $existingAlert = $this->slaRepo->findNotificationByOrderAndType($order->id_pedido, $alertType);

            if (! $existingAlert) {
                $code = $order->codigo_pedido ?? "PED-{$order->id_pedido}";
                $title = $slaStatus === 'Vencido'
                    ? "Alerta SLA: Pedido {$code} vencido"
                    : "Advertencia SLA: Pedido {$code} en riesgo";

                $msg = $slaStatus === 'Vencido'
                    ? "El pedido {$code} superó el plazo máximo de resolución establecido en {$resolutionHours} horas."
                    : "El pedido {$code} tiene menos del 25% de tiempo restante antes de vencer su SLA ({$resolutionHours}h).";

                $this->slaRepo->createNotification([
                    'id_pedido' => $order->id_pedido,
                    'tipo' => $alertType,
                    'titulo' => $title,
                    'mensaje' => $msg,
                    'destinatario_id' => $order->asignado_a ?? null,
                    'leido' => false,
                ]);
            }
        }

        return $metric;
    }

    public function getMetricByOrder(int $orderId): ?OrderSla
    {
        return $this->slaRepo->findMetricByOrder($orderId);
    }

    public function getDashboardMetrics(): array
    {
        $metrics = $this->slaRepo->getSlaDashboardMetrics();
        $activeOrders = $this->slaRepo->getActiveOrdersForSlaTracking();

        $trackingList = [];
        foreach ($activeOrders as $order) {
            $orderMetric = $this->calculateSlaForOrder($order);

            $trackingList[] = [
                'order_id' => $order->id_pedido,
                'order_code' => $order->codigo_pedido,
                'title' => $order->titulo,
                'priority' => $order->prioridad,
                'status' => $order->estado,
                'from_area' => $order->fromArea?->nombre,
                'requested_by' => $order->requestedBy?->nombre_completo,
                'created_at' => $order->creado_en ? $order->creado_en->toIso8601String() : null,
                'deadline_sla' => $orderMetric->fecha_limite_sla ? $orderMetric->fecha_limite_sla->toIso8601String() : null,
                'sla_status' => $orderMetric->estado_sla,
            ];
        }

        $metrics['active_orders_tracking'] = $trackingList;

        return $metrics;
    }

    public function getNotifications(?int $userId = null): Collection
    {
        return $this->slaRepo->getNotifications($userId);
    }

    public function markNotificationRead(int $id): bool
    {
        return $this->slaRepo->markNotificationRead($id);
    }

    public function markAllNotificationsRead(?int $userId = null): int
    {
        return $this->slaRepo->markAllNotificationsRead($userId);
    }
}
