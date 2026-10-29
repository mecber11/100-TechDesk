<?php

namespace App\Business\InternalOrders;

use App\Business\Areas\AreaContextService;
use App\Business\Notifications\SlackTicketService;
use App\Business\TechDesk\SlaService;
use App\Common\Exceptions\DomainException;
use App\Data\Contracts\InternalOrderRepositoryInterface;
use App\Domain\Req\InternalOrder;
use App\Domain\Sec\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InternalOrderService
{
    public function __construct(
        private readonly InternalOrderRepositoryInterface $orders,
        private readonly AreaContextService $areas,
        private readonly SlackTicketService $slack,
        private readonly SlaService $sla,
    ) {}

    public function listForUser(
        User $user,
        ?string $status,
        int $perPage,
        ?string $day = null,
        ?string $month = null,
        ?int $year = null,
    ): LengthAwarePaginator
    {
        $global = $this->areas->isCompanyAdmin($user);
        $areaId = $global ? null : $this->areas->area($user)?->id_area;
        $result = $this->orders->paginateVisible($areaId, $global, $status, $perPage, $day, $month, $year, $this->areas->isManager($user) ? null : $user->id_usuario);
        $result->getCollection()->transform(function (InternalOrder $order) use ($user) {
            $order->setAttribute('allowed_transitions', $this->allowedTransitions($order, $user));

            return $order;
        });

        return $result;
    }

    public function createForUser(array $payload, User $user, array $files = []): InternalOrder
    {
        unset($payload['attachments']);
        $payload = $this->translatePayload($payload);
        $isSuper = $this->areas->isCompanyAdmin($user);
        $isTi = $this->areas->isTi($user);
        $fromArea = $isSuper && ! empty($payload['area_origen'])
            ? $this->areas->byId((int) $payload['area_origen'])
            : $this->areas->area($user);

        if (! $fromArea || ($isSuper && ! $fromArea->activa)) {
            throw new DomainException('Tu usuario no tiene un área de origen válida.', 'INVALID_ORIGIN_AREA', 422);
        }

        $requestedDestination = strtoupper(trim((string) ($payload['to_area_code'] ?? '')));
        unset($payload['to_area_code']);
        if (! $isTi && $requestedDestination === 'SUPER') {
            throw new DomainException('Solo TI puede escalar solicitudes al administrador de empresa.', 'DESTINATION_NOT_ALLOWED', 422);
        }
        $destinationCode = $requestedDestination ?: ($isTi ? 'SUPER' : 'TI');
        $destination = $this->areas->byCode($destinationCode, $destinationCode !== 'SUPER');
        if (! $destination) {
            throw new DomainException('El área de destino no existe o está inactiva.', 'INVALID_DESTINATION_AREA', 422);
        }
        if ($fromArea->id_area === $destination->id_area) {
            throw new DomainException('La solicitud debe tener un destino diferente al área de origen.', 'SAME_AREA', 422);
        }

        $payload['codigo_pedido'] = $this->orders->nextCode();
        $payload['area_origen'] = $fromArea->id_area;
        $payload['area_destino'] = $destination->id_area;
        $payload['solicitado_por'] = $user->id_usuario;
        $payload['nombre_solicitante'] = $user->nombre_completo;
        $payload['correo_solicitante'] = $user->correo;
        $escalated = $isTi && $destinationCode === 'SUPER';
        $payload['estado'] = $escalated ? 'Escalado' : 'Enviado';
        $payload['creado_en'] = now();
        $payload['actualizado_en'] = now();
        if ($escalated) {
            $payload['fecha_escalamiento'] = now();
            $payload['motivo_escalamiento'] = $payload['descripcion'];
        }
        $items = $payload['detalles'] ?? [];
        unset($payload['detalles']);

        try {
            $order = $this->orders->createWithDetails($payload, $items, $files);
            $this->slack->notify($order, 'creado');
            $this->sla->calculateSlaForOrder($order);

            return $order;
        } catch (QueryException $exception) {
            report($exception);
            throw new DomainException('No se pudo registrar la solicitud.', 'ORDER_SAVE', 422);
        }
    }

    public function getForUser(int $id, User $user): InternalOrder
    {
        $order = $this->orders->findOrder($id);
        if (! $order || ! $this->canViewOrder($order, $user)) {
            throw new DomainException('Solicitud no encontrada.', 'ORDER_NOT_FOUND', 404);
        }
        $order->setAttribute('allowed_transitions', $this->allowedTransitions($order, $user));
        return $order;
    }

    private function translatePayload(array $payload): array
    {
        $map = [
            'from_area_id' => 'area_origen', 'title' => 'titulo', 'description' => 'descripcion',
            'request_type' => 'tipo_solicitud', 'kind' => 'categoria', 'priority' => 'prioridad',
            'due_on' => 'fecha_limite', 'items' => 'detalles',
        ];
        foreach ($map as $english => $spanish) {
            if (array_key_exists($english, $payload)) {
                $payload[$spanish] = $payload[$english];
                unset($payload[$english]);
            }
        }
        if (isset($payload['detalles'])) {
            $payload['detalles'] = array_map(fn (array $item) => [
                'descripcion' => $item['description'],
                'cantidad' => $item['quantity'] ?? null,
                'unidad' => $item['unit'] ?? null,
                'notas' => $item['notes'] ?? null,
            ], $payload['detalles']);
        }

        return $payload;
    }

    public function moveForUser(
        int $id,
        string $status,
        ?string $note,
        array $files,
        array $driveLinks,
        User $actor,
    ): InternalOrder {
        $order = $this->orders->findOrder($id);
        if (! $order) {
            throw new DomainException('Solicitud no encontrada.', 'ORDER_NOT_FOUND', 404);
        }
        if (! in_array($status, $this->allowedTransitions($order, $actor), true)) {
            throw new DomainException(
                "No tienes permiso para pasar la solicitud de {$order->estado} a {$status}.",
                'INVALID_TRANSITION',
                409
            );
        }

        $fromStatus = $order->estado;
        $order->estado = $status;
        $order->actualizado_en = now();
        if ($status === 'EnAtencion') {
            $order->atendido_por = $actor->id_usuario;
        } elseif ($status === 'Escalado') {
            $order->area_destino = $this->areas->byCode('SUPER')?->id_area;
            $order->motivo_escalamiento = $note;
            $order->fecha_escalamiento = now();
        } elseif ($status === 'Atendido') {
            $order->respuesta = $note;
            $order->fecha_atencion = now();
        } elseif ($status === 'Rechazado') {
            $order->respuesta = $note;
        } elseif ($status === 'Cerrado') {
            $order->fecha_cierre = now();
            if ($note) {
                $order->respuesta = $order->respuesta ? ($order->respuesta . "\n\n[Cierre]: " . $note) : $note;
            }
        }

        $updated = $this->orders->saveTransition(
            $order,
            $fromStatus,
            $note,
            $actor->id_usuario,
            $files,
            $driveLinks,
        );
        if ($status === 'Escalado') $this->slack->notify($updated, 'escalado');
        $this->sla->calculateSlaForOrder($updated);
        $updated->unsetRelation('latestSlackNotice');

        return $updated;
    }

    public function downloadAttachmentForUser(int $attachmentId, User $user, bool $download = false): StreamedResponse
    {
        $attachment = $this->orders->findAttachment($attachmentId);
        if (! $attachment || $attachment->origen_archivo !== 'upload') {
            throw new DomainException('Archivo adjunto no encontrado.', 'ATTACHMENT_NOT_FOUND', 404);
        }

        if (! $attachment->order || ! $this->canViewOrder($attachment->order, $user)) {
            throw new DomainException('No tienes acceso a este archivo.', 'ATTACHMENT_FORBIDDEN', 403);
        }

        $disk = $attachment->getRawOriginal('disco');
        $path = $attachment->getRawOriginal('ruta');
        if (! $disk || ! $path || ! Storage::disk($disk)->exists($path)) {
            throw new DomainException('El archivo ya no está disponible.', 'ATTACHMENT_MISSING', 404);
        }

        $mime = $attachment->tipo_archivo ?: 'application/octet-stream';
        $headers = ['Content-Type' => $mime];

        if ($download) {
            return Storage::disk($disk)->download($path, $attachment->nombre_original, $headers);
        }

        return Storage::disk($disk)->response($path, $attachment->nombre_original, $headers);
    }

    private function canViewOrder(InternalOrder $order, User $user): bool
    {
        if ($this->areas->isCompanyAdmin($user)) return true;
        $areaId = $this->areas->area($user)?->id_area;
        if (! $this->areas->isManager($user)) return (int) $order->solicitado_por === (int) $user->id_usuario
            || ($areaId !== null && (int) $order->area_destino === $areaId);
        return $areaId !== null && ((int) $order->area_origen === $areaId || (int) $order->area_destino === $areaId);
    }

    public function allowedTransitions(InternalOrder $order, User $user): array
    {
        if (! $this->canViewOrder($order, $user)) return [];
        if (! $this->areas->isManager($user)) {
            $areaId = $this->areas->area($user)?->id_area;
            if ($areaId !== null && (int) $order->area_destino === $areaId) {
                $actions = match ($order->estado) {
                    'Enviado' => ['EnAtencion', 'Atendido', 'Rechazado'],
                    'EnAtencion' => ['Atendido', 'Rechazado'],
                    default => [],
                };
                if ($this->areas->isTi($user) && in_array($order->estado, ['Enviado', 'EnAtencion'], true)) $actions[] = 'Escalado';
                return $actions;
            }
            return match ($order->estado) {
                'Borrador' => ['Enviado'],
                'Atendido', 'Rechazado' => ['Cerrado'],
                default => [],
            };
        }
        if ($this->areas->isCompanyAdmin($user)) {
            return match ($order->estado) {
                'Borrador' => ['Enviado'],
                'Enviado' => ['EnAtencion', 'Atendido', 'Rechazado'],
                'EnAtencion', 'Escalado' => ['EnAtencion', 'Atendido', 'Rechazado'],
                'Atendido', 'Rechazado' => ['Cerrado'],
                default => [],
            };
        }
        if ($this->areas->isTi($user)) {
            $tiAreaId = $this->areas->area($user)?->id_area;
            if ($tiAreaId && $order->area_origen === $tiAreaId) {
                return in_array($order->estado, ['Atendido', 'Rechazado'], true) ? ['Cerrado'] : [];
            }
            if (! $tiAreaId || $order->area_destino !== $tiAreaId) {
                return [];
            }

            return match ($order->estado) {
                'Enviado' => ['EnAtencion', 'Atendido', 'Rechazado', 'Escalado'],
                'EnAtencion' => ['Atendido', 'Rechazado', 'Escalado'],
                default => [],
            };
        }

        $area = $this->areas->area($user);
        if (! $area || $area->id_area !== $order->area_origen) {
            if (! $area || $area->id_area !== $order->area_destino) {
                return [];
            }

            return match ($order->estado) {
                'Enviado' => ['EnAtencion', 'Atendido', 'Rechazado'],
                'EnAtencion' => ['Atendido', 'Rechazado'],
                default => [],
            };
        }

        return match ($order->estado) {
            'Borrador' => ['Enviado'],
            'Atendido', 'Rechazado' => ['Cerrado'],
            default => [],
        };
    }
}
