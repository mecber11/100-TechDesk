<?php

namespace App\Data\Eloquent;

use App\Data\Contracts\AssetAssignmentRepositoryInterface;
use App\Domain\TechDesk\Asset;
use App\Domain\TechDesk\AssetAssignment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AssetAssignmentRepository implements AssetAssignmentRepositoryInterface
{
    public function paginate(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = AssetAssignment::query()
            ->with([
                'asset',
                'assignedUser:id_usuario,nombre_completo,correo',
                'assignedArea:id_area,nombre,codigo',
                'assignedBy:id_usuario,nombre_completo,correo',
                'receivedBy:id_usuario,nombre_completo,correo',
                'order:id_pedido,codigo_pedido,titulo,estado',
            ])
            ->orderByDesc('fecha_asignacion');

        if (! empty($filters['status'])) {
            $query->where('estado', $filters['status']);
        }

        if (! empty($filters['user_id'])) {
            $query->where('id_usuario_asignado', $filters['user_id']);
        }

        if (! empty($filters['asset_id'])) {
            $query->where('id_activo', $filters['asset_id']);
        }

        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function (Builder $q) use ($term) {
                $q->whereHas('asset', function (Builder $qa) use ($term) {
                    $qa->where('codigo_patrimonial', 'ilike', "%{$term}%")
                        ->orWhere('nombre', 'ilike', "%{$term}%");
                })->orWhereHas('assignedUser', function (Builder $qu) use ($term) {
                    $qu->where('nombre_completo', 'ilike', "%{$term}%")
                        ->orWhere('correo', 'ilike', "%{$term}%");
                });
            });
        }

        return $query->paginate(min($perPage, 100));
    }

    public function findById(int $id): ?AssetAssignment
    {
        return AssetAssignment::query()
            ->with([
                'asset',
                'assignedUser:id_usuario,nombre_completo,correo',
                'assignedArea:id_area,nombre,codigo',
                'assignedBy:id_usuario,nombre_completo,correo',
                'receivedBy:id_usuario,nombre_completo,correo',
                'order:id_pedido,codigo_pedido,titulo,estado',
            ])
            ->find($id);
    }

    public function createAssignment(array $data): AssetAssignment
    {
        return DB::transaction(function () use ($data) {
            $data['creado_en'] = now();
            $data['actualizado_en'] = now();
            if (empty($data['fecha_asignacion'])) {
                $data['fecha_asignacion'] = now();
            }

            $assignment = AssetAssignment::query()->create($data);

            // Actualizar estado del activo a 'Asignado'
            Asset::query()->where('id_activo', $data['id_activo'])->update([
                'estado' => 'Asignado',
                'actualizado_en' => now(),
            ]);

            return $assignment->fresh([
                'asset',
                'assignedUser',
                'assignedArea',
            ]);
        });
    }

    public function returnAssignment(AssetAssignment $assignment, array $returnData): AssetAssignment
    {
        return DB::transaction(function () use ($assignment, $returnData) {
            $assignment->update([
                'estado' => 'Devuelto',
                'fecha_devolucion_real' => now(),
                'condicion_devolucion' => $returnData['condicion_devolucion'] ?? 'Operativo',
                'observaciones_devolucion' => $returnData['observaciones_devolucion'] ?? null,
                'recibido_por' => $returnData['recibido_por'] ?? null,
                'actualizado_en' => now(),
            ]);

            // Determinar nuevo estado del activo (si se devolvió dañado/regular -> mantenimiento)
            $condicion = $returnData['condicion_devolucion'] ?? 'Operativo';
            $nuevoEstado = in_array($condicion, ['Malo', 'Dañado', 'Averiado'], true)
                ? 'Mantenimiento'
                : 'Disponible';

            Asset::query()->where('id_activo', $assignment->id_activo)->update([
                'estado' => $nuevoEstado,
                'condicion_fisica' => $condicion === 'Operativo' ? 'Bueno' : $condicion,
                'actualizado_en' => now(),
            ]);

            return $assignment->fresh(['asset', 'assignedUser', 'receivedBy']);
        });
    }

    public function activeAssignmentsForUser(int $userId): Collection
    {
        return AssetAssignment::query()
            ->with(['asset'])
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
                'assignedBy:id_usuario,nombre_completo,correo',
                'receivedBy:id_usuario,nombre_completo,correo',
            ])
            ->where('id_activo', $assetId)
            ->orderByDesc('fecha_asignacion')
            ->get();
    }
}
