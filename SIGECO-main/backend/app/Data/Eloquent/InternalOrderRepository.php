<?php

namespace App\Data\Eloquent;

use App\Data\Contracts\InternalOrderRepositoryInterface;
use App\Domain\Req\InternalOrder;
use App\Domain\Req\InternalOrderAttachment;
use App\Domain\Req\InternalOrderHistory;
use App\Domain\Req\InternalOrderItem;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class InternalOrderRepository extends EloquentRepository implements InternalOrderRepositoryInterface
{
    protected string $model = InternalOrder::class;

    protected array $search = ['codigo_pedido', 'titulo', 'descripcion'];

    protected array $with = ['fromArea', 'toArea', 'relatedDocument', 'items'];

    protected string $orderBy = 'creado_en';

    protected string $orderDir = 'desc';

    public function nextCode(): string
    {
        return DB::selectOne('SELECT req.fn_generate_order_code() AS codigo')->codigo;
    }

    public function paginateVisible(
        ?int $areaId,
        bool $global,
        ?string $status,
        int $perPage,
        ?string $day = null,
        ?string $month = null,
        ?int $year = null,
        ?int $requesterId = null,
    ): LengthAwarePaginator
    {
        $query = InternalOrder::query()
            ->with([
                'fromArea',
                'latestSlackNotice',
                'slaMetric',
                'toArea',
                'requestedBy:id_usuario,nombre_completo,correo',
                'items',
                'history.changedBy:id_usuario,nombre_completo,correo',
                'attachments.uploader:id_usuario,nombre_completo,correo',
            ])
            ->orderByDesc('creado_en');

        if ($requesterId !== null) {
            $query->where(fn ($visible) => $visible->where('solicitado_por', $requesterId)->orWhere('area_destino', $areaId ?? 0));
        } elseif (! $global) {
            $query->where(function ($visible) use ($areaId) {
                $visible->where('area_origen', $areaId ?? 0)
                    ->orWhere('area_destino', $areaId ?? 0);
            });
        }
        if ($status) {
            $query->where('estado', $status);
        }
        if ($day) {
            $query->whereDate('creado_en', $day);
        } elseif ($month) {
            [$selectedYear, $selectedMonth] = array_map('intval', explode('-', $month));
            $query->whereYear('creado_en', $selectedYear)->whereMonth('creado_en', $selectedMonth);
        } elseif ($year) {
            $query->whereYear('creado_en', $year);
        }

        return $query->paginate(min($perPage, 100));
    }

    public function findOrder(int $id): ?InternalOrder
    {
        return InternalOrder::query()->with([
            'fromArea', 'toArea', 'latestSlackNotice', 'slaMetric', 'requestedBy:id_usuario,nombre_completo,correo',
            'items', 'history.changedBy:id_usuario,nombre_completo,correo', 'attachments.uploader:id_usuario,nombre_completo,correo',
        ])->find($id);
    }

    public function withLockedOrder(int $id, callable $callback): mixed
    {
        return DB::transaction(fn () => $callback(
            InternalOrder::query()->lockForUpdate()->find($id)
        ));
    }

    public function findAttachment(int $id): ?InternalOrderAttachment
    {
        return InternalOrderAttachment::query()->with('order')->find($id);
    }

    public function createWithDetails(array $payload, array $items, array $files = []): InternalOrder
    {
        $storedPaths = [];

        try {
            return DB::transaction(function () use ($payload, $items, $files, &$storedPaths) {
            $order = InternalOrder::query()->create($payload);
            foreach ($items as $item) {
                if (empty($item['descripcion'])) {
                    continue;
                }
                InternalOrderItem::query()->create([
                    'id_pedido' => $order->getKey(),
                    'descripcion' => $item['descripcion'],
                    'cantidad' => $item['cantidad'] ?? 1,
                    'unidad' => $item['unidad'] ?? 'und',
                    'notas' => $item['notas'] ?? null,
                ]);
            }
            $history = InternalOrderHistory::query()->create([
                'id_pedido' => $order->getKey(),
                'estado' => $order->estado,
                'estado_anterior' => null,
                'estado_nuevo' => $order->estado,
                'observacion' => 'Solicitud registrada',
                'modificado_por' => $order->solicitado_por,
                'modificado_en' => now(),
            ]);

                $this->storeUploads($order, $history, $order->solicitado_por, $files, $storedPaths);

                return $order->load(['fromArea', 'toArea', 'items', 'history.changedBy:id_usuario,nombre_completo,correo', 'attachments.uploader:id_usuario,nombre_completo,correo', 'requestedBy:id_usuario,nombre_completo,correo']);
            });
        } catch (Throwable $exception) {
            $this->deleteStoredPaths($storedPaths);
            throw $exception;
        }
    }

    public function saveTransition(
        InternalOrder $order,
        string $fromStatus,
        ?string $note,
        int $actorId,
        array $files = [],
        array $driveLinks = [],
    ): InternalOrder {
        $storedPaths = [];

        try {
            return DB::transaction(function () use ($order, $fromStatus, $note, $actorId, $files, $driveLinks, &$storedPaths) {
            $order->save();
            $history = InternalOrderHistory::query()->create([
                'id_pedido' => $order->id_pedido,
                'estado' => $order->estado,
                'estado_anterior' => $fromStatus,
                'estado_nuevo' => $order->estado,
                'observacion' => $note,
                'modificado_por' => $actorId,
                'modificado_en' => now(),
            ]);

                $this->storeUploads($order, $history, $actorId, $files, $storedPaths);

            foreach ($driveLinks as $position => $url) {
                InternalOrderAttachment::query()->create([
                    'id_pedido' => $order->id_pedido,
                    'id_historial' => $history->id_historial,
                    'cargado_por' => $actorId,
                    'origen_archivo' => 'google_drive',
                    'nombre_original' => 'Google Drive '.($position + 1),
                    'tipo_archivo' => 'application/vnd.google-apps.file',
                    'enlace_externo' => $url,
                ]);
            }

                return $order->fresh([
                'fromArea',
                'toArea',
                'items',
                'history.changedBy:id_usuario,nombre_completo,correo',
                'attachments.uploader:id_usuario,nombre_completo,correo',
                'requestedBy:id_usuario,nombre_completo,correo',
                ]);
            });
        } catch (Throwable $exception) {
            $this->deleteStoredPaths($storedPaths);
            throw $exception;
        }
    }

    private function storeUploads(
        InternalOrder $order,
        InternalOrderHistory $history,
        int $actorId,
        array $files,
        array &$storedPaths,
    ): void {
        foreach ($files as $file) {
            $extension = strtolower($file->getClientOriginalExtension());
            $storedName = (string) Str::uuid().($extension ? ".{$extension}" : '');
            $path = $file->storeAs("pedidos/{$order->id_pedido}", $storedName, 'local');
            if (! $path) {
                throw new RuntimeException('No se pudo almacenar el archivo adjunto.');
            }
            $storedPaths[] = $path;

            InternalOrderAttachment::query()->create([
                'id_pedido' => $order->id_pedido,
                'id_historial' => $history->id_historial,
                'cargado_por' => $actorId,
                'origen_archivo' => 'upload',
                'nombre_original' => $file->getClientOriginalName(),
                'tipo_archivo' => $file->getMimeType(),
                'tamano_bytes' => $file->getSize(),
                'disco' => 'local',
                'ruta' => $path,
                'creado_en' => now(),
            ]);
        }
    }

    private function deleteStoredPaths(array $paths): void
    {
        foreach ($paths as $path) {
            Storage::disk('local')->delete($path);
        }
    }
}
