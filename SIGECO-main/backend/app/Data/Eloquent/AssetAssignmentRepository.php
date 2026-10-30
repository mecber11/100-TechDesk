<?php

namespace App\Data\Eloquent;

use App\Common\Exceptions\DomainException;
use App\Data\Contracts\AssetAssignmentRepositoryInterface;
use App\Domain\Org\InternalArea;
use App\Domain\Req\InternalOrder;
use App\Domain\Sec\User;
use App\Domain\TechDesk\Asset;
use App\Domain\TechDesk\AssetAssignment;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AssetAssignmentRepository implements AssetAssignmentRepositoryInterface
{
    private function applyFilters(Builder $query, array $filters): Builder
    {
        $today = now()->setTimezone('America/Lima')->toDateString();

        if (! empty($filters['status'])) {
            $query->where('estado', $filters['status']);
        }

        if (! empty($filters['user_id'])) {
            $query->where('id_usuario_asignado', (int) $filters['user_id']);
        }

        if (! empty($filters['asset_id'])) {
            $query->where('id_activo', (int) $filters['asset_id']);
        }

        if (! empty($filters['requesting_area_id'])) {
            $query->where('id_area_solicitante', (int) $filters['requesting_area_id']);
        }

        if (! empty($filters['destination_area_id'])) {
            $query->where('id_area_destino', (int) $filters['destination_area_id']);
        }

        if (! empty($filters['order_id'])) {
            $query->where('id_pedido', (int) $filters['order_id']);
        }

        if (! empty($filters['assigned_by'])) {
            $query->where('asignado_por', (int) $filters['assigned_by']);
        }

        if (! empty($filters['received_by'])) {
            $query->where('recibido_por', (int) $filters['received_by']);
        }

        // Rango de fecha de asignación inclusivo por día local
        if (! empty($filters['assigned_from'])) {
            $from = Carbon::parse($filters['assigned_from'], 'America/Lima')->startOfDay();
            $query->where('fecha_asignacion', '>=', $from);
        }

        if (! empty($filters['assigned_to'])) {
            $to = Carbon::parse($filters['assigned_to'], 'America/Lima')->addDay()->startOfDay();
            $query->where('fecha_asignacion', '<', $to);
        }

        // Devolución prevista
        if (! empty($filters['due_from'])) {
            $query->where('fecha_devolucion_estimada', '>=', $filters['due_from']);
        }

        if (! empty($filters['due_to'])) {
            $query->where('fecha_devolucion_estimada', '<=', $filters['due_to']);
        }

        // Devolución real
        if (! empty($filters['returned_from'])) {
            $from = Carbon::parse($filters['returned_from'], 'America/Lima')->startOfDay();
            $query->whereNotNull('fecha_devolucion_real')->where('fecha_devolucion_real', '>=', $from);
        }

        if (! empty($filters['returned_to'])) {
            $to = Carbon::parse($filters['returned_to'], 'America/Lima')->addDay()->startOfDay();
            $query->whereNotNull('fecha_devolucion_real')->where('fecha_devolucion_real', '<', $to);
        }

        // Tipo de activo
        if (! empty($filters['asset_type'])) {
            $assetType = $filters['asset_type'];
            $query->whereHas('asset', function (Builder $qa) use ($assetType) {
                $qa->where('tipo', $assetType);
            });
        }

        // Filtro por estado de vencimiento (excluye devueltos del conteo de vencidos)
        if (! empty($filters['due_status'])) {
            $dueStatus = $filters['due_status'];
            $now = now();
            $inTwoHours = now()->addHours(2);

            if ($dueStatus === 'overdue' || $dueStatus === 'vencido') {
                $query->where('estado', 'Activo')
                    ->whereNotNull('fecha_devolucion_estimada')
                    ->where('fecha_devolucion_estimada', '<', $now);
            } elseif ($dueStatus === 'due_soon' || $dueStatus === 'por_vencer') {
                $query->where('estado', 'Activo')
                    ->whereNotNull('fecha_devolucion_estimada')
                    ->where('fecha_devolucion_estimada', '>=', $now)
                    ->where('fecha_devolucion_estimada', '<=', $inTwoHours);
            } elseif ($dueStatus === 'on_track' || $dueStatus === 'vigente') {
                $query->where('estado', 'Activo')
                    ->whereNotNull('fecha_devolucion_estimada')
                    ->where('fecha_devolucion_estimada', '>', $inTwoHours);
            } elseif ($dueStatus === 'no_due_date' || $dueStatus === 'permanente') {
                $query->where('estado', 'Activo')
                    ->whereNull('fecha_devolucion_estimada');
            }
        }

        // Búsqueda textual
        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function (Builder $q) use ($term) {
                $q->whereHas('asset', function (Builder $qa) use ($term) {
                    $qa->where('codigo_patrimonial', 'ilike', "%{$term}%")
                        ->orWhere('nombre', 'ilike', "%{$term}%")
                        ->orWhere('marca', 'ilike', "%{$term}%")
                        ->orWhere('modelo', 'ilike', "%{$term}%")
                        ->orWhere('numero_serie', 'ilike', "%{$term}%")
                        ->orWhere('identificador_alternativo', 'ilike', "%{$term}%");
                })->orWhereHas('assignedUser', function (Builder $qu) use ($term) {
                    $qu->where('nombre_completo', 'ilike', "%{$term}%")
                        ->orWhere('correo', 'ilike', "%{$term}%");
                });
            });
        }

        return $query;
    }

    public function paginate(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = AssetAssignment::query()
            ->with([
                'asset.image',
                'assignedUser:id_usuario,nombre_completo,correo',
                'assignedArea:id_area,nombre,codigo',
                'requestingArea:id_area,nombre,codigo',
                'assignedBy:id_usuario,nombre_completo,correo',
                'receivedBy:id_usuario,nombre_completo,correo',
                'order:id_pedido,codigo_pedido,titulo,estado',
            ]);

        $this->applyFilters($query, $filters);

        // Ordenamiento seguro
        $orderCol = $filters['order_by'] ?? 'fecha_asignacion';
        $direction = strtolower($filters['order_dir'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        $allowedColumns = ['fecha_asignacion', 'fecha_devolucion_estimada', 'fecha_devolucion_real', 'id_asignacion'];
        if (! in_array($orderCol, $allowedColumns, true)) {
            $orderCol = 'fecha_asignacion';
        }

        $query->orderBy($orderCol, $direction)->orderBy('id_asignacion', 'desc');

        return $query->paginate(min($perPage, 100));
    }

    public function findById(int $id): ?AssetAssignment
    {
        return AssetAssignment::query()
            ->with([
                'asset.image',
                'assignedUser:id_usuario,nombre_completo,correo',
                'assignedArea:id_area,nombre,codigo',
                'requestingArea:id_area,nombre,codigo',
                'assignedBy:id_usuario,nombre_completo,correo',
                'receivedBy:id_usuario,nombre_completo,correo',
                'order:id_pedido,codigo_pedido,titulo,estado',
            ])
            ->find($id);
    }

    public function createAssignment(array $data): AssetAssignment
    {
        return DB::transaction(function () use ($data) {
            $assetId = (int) $data['id_activo'];

            // Bloquear la fila del activo para garantizar consistencia en concurrencia
            $asset = Asset::query()->where('id_activo', $assetId)->lockForUpdate()->first();

            if (! $asset) {
                throw new DomainException('El activo seleccionado no existe.', 'ASSET_NOT_FOUND', 404);
            }

            if ($asset->estado !== 'Disponible') {
                throw new DomainException("El activo {$asset->codigo_patrimonial} no está disponible (Estado actual: {$asset->estado}).", 'ASSET_NOT_AVAILABLE', 422);
            }

            // Verificar si ya existe una asignación activa previa del mismo activo
            $activeAssignment = AssetAssignment::query()
                ->where('id_activo', $assetId)
                ->where('estado', 'Activo')
                ->first();

            if ($activeAssignment) {
                throw new DomainException("El activo {$asset->codigo_patrimonial} ya cuenta con un préstamo activo vigente.", 'DUPLICATE_ACTIVE_ASSIGNMENT', 422);
            }

            $data['creado_en'] = now();
            $data['actualizado_en'] = now();
            if (empty($data['fecha_asignacion'])) {
                $data['fecha_asignacion'] = now();
            }

            $assignment = AssetAssignment::query()->create($data);

            // Actualizar estado del activo a 'Asignado'
            $asset->update([
                'estado' => 'Asignado',
                'actualizado_en' => now(),
            ]);

            return $assignment->fresh([
                'asset.image',
                'assignedUser',
                'assignedArea',
                'requestingArea',
            ]);
        });
    }

    public function returnAssignment(AssetAssignment $assignment, array $returnData): AssetAssignment
    {
        return DB::transaction(function () use ($assignment, $returnData) {
            // Recargar con bloqueo para evitar doble devolución concurrente
            $locked = AssetAssignment::query()->where('id_asignacion', $assignment->id_asignacion)->lockForUpdate()->first();

            if (! $locked || $locked->estado === 'Devuelto') {
                throw new DomainException('Esta asignación ya fue registrada como devuelta anteriormente.', 'ALREADY_RETURNED', 422);
            }

            $locked->update([
                'estado' => 'Devuelto',
                'fecha_devolucion_real' => now(),
                'condicion_devolucion' => $returnData['condicion_devolucion'] ?? 'Operativo',
                'observaciones_devolucion' => $returnData['observaciones_devolucion'] ?? null,
                'recibido_por' => $returnData['recibido_por'] ?? null,
                'actualizado_en' => now(),
            ]);

            // Determinar nuevo estado del activo
            $condicion = $returnData['condicion_devolucion'] ?? 'Operativo';
            $esDanado = in_array($condicion, ['Malo', 'Dañado', 'Averiado'], true);
            $nuevoEstado = $esDanado ? 'Mantenimiento' : 'Disponible';
            $condicionFisica = $esDanado ? 'Malo' : ($condicion === 'Operativo' ? 'Bueno' : $condicion);

            Asset::query()->where('id_activo', $locked->id_activo)->update([
                'estado' => $nuevoEstado,
                'condicion_fisica' => $condicionFisica,
                'actualizado_en' => now(),
            ]);

            return $locked->fresh(['asset.image', 'assignedUser', 'receivedBy', 'assignedArea', 'requestingArea']);
        });
    }

    public function activeAssignmentsForUser(int $userId): Collection
    {
        return AssetAssignment::query()
            ->with(['asset.image'])
            ->where('id_usuario_asignado', $userId)
            ->where('estado', 'Activo')
            ->orderByDesc('fecha_asignacion')
            ->get();
    }

    public function historyForAsset(int $assetId): Collection
    {
        return AssetAssignment::query()
            ->with([
                'assignedUser:id_usuario,nombre_completo,correo',
                'assignedArea:id_area,nombre,codigo',
                'requestingArea:id_area,nombre,codigo',
                'assignedBy:id_usuario,nombre_completo,correo',
                'receivedBy:id_usuario,nombre_completo,correo',
            ])
            ->where('id_activo', $assetId)
            ->orderByDesc('fecha_asignacion')
            ->get();
    }

    public function getSummary(array $filters): array
    {
        $now = now();
        $inTwoHours = now()->addHours(2);

        $query = AssetAssignment::query();
        $this->applyFilters($query, $filters);

        $totalFiltrado = (clone $query)->count();
        $activos = (clone $query)->where('estado', 'Activo')->count();
        $devueltos = (clone $query)->where('estado', 'Devuelto')->count();
        $activosVencidos = (clone $query)
            ->where('estado', 'Activo')
            ->whereNotNull('fecha_devolucion_estimada')
            ->where('fecha_devolucion_estimada', '<', $now)
            ->count();

        $porVencer = (clone $query)
            ->where('estado', 'Activo')
            ->whereNotNull('fecha_devolucion_estimada')
            ->where('fecha_devolucion_estimada', '>=', $now)
            ->where('fecha_devolucion_estimada', '<=', $inTwoHours)
            ->count();

        return [
            'total' => $totalFiltrado,
            'total_filtrado' => $totalFiltrado,
            'activos' => $activos,
            'devueltos' => $devueltos,
            'activos_vencidos' => $activosVencidos,
            'vencidos' => $activosVencidos,
            'por_vencer' => $porVencer,
        ];
    }

    public function getAllFiltered(array $filters): Collection
    {
        $query = AssetAssignment::query()
            ->with([
                'asset',
                'assignedUser:id_usuario,nombre_completo,correo',
                'assignedArea:id_area,nombre,codigo',
                'requestingArea:id_area,nombre,codigo',
                'assignedBy:id_usuario,nombre_completo,correo',
                'receivedBy:id_usuario,nombre_completo,correo',
                'order:id_pedido,codigo_pedido,titulo',
            ]);

        $this->applyFilters($query, $filters);

        return $query->orderByDesc('fecha_asignacion')->get();
    }

    public function getLookups(): array
    {
        $team = User::query()
            ->where('activo', true)
            ->select('id_usuario', 'nombre_completo as nombre', 'correo')
            ->orderBy('nombre_completo')
            ->get();

        $areas = InternalArea::query()
            ->where('activa', true)
            ->select('id_area', 'nombre', 'codigo')
            ->orderBy('orden')
            ->get();

        $stock = Asset::query()
            ->with(['image'])
            ->where('estado', 'Disponible')
            ->orderBy('codigo_patrimonial')
            ->get();

        $orders = InternalOrder::query()
            ->whereNotIn('estado', ['Cerrado', 'Cancelado', 'Rechazado'])
            ->select('id_pedido', 'codigo_pedido', 'titulo')
            ->orderByDesc('id_pedido')
            ->take(50)
            ->get();

        return [
            'team' => $team,
            'users' => $team,
            'areas' => $areas,
            'stock' => $stock,
            'orders' => $orders,
        ];
    }
}
