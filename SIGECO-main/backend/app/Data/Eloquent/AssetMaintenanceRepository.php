<?php

namespace App\Data\Eloquent;

use App\Common\Exceptions\DomainException;
use App\Data\Contracts\AssetMaintenanceRepositoryInterface;
use App\Domain\TechDesk\Asset;
use App\Domain\TechDesk\AssetAssignment;
use App\Domain\TechDesk\AssetMaintenance;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AssetMaintenanceRepository implements AssetMaintenanceRepositoryInterface
{
    public function paginate(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = AssetMaintenance::query()
            ->with([
                'asset.image',
                'technicianUser:id_usuario,nombre_completo,correo',
            ])
            ->orderByDesc('fecha_programada');

        if (! empty($filters['status'])) {
            $query->where('estado', $filters['status']);
        }

        if (! empty($filters['tipo'])) {
            $query->where('tipo_mantenimiento', $filters['tipo']);
        }

        if (! empty($filters['asset_id'])) {
            $query->where('id_activo', (int) $filters['asset_id']);
        }

        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function (Builder $q) use ($term) {
                $q->where('titulo', 'ilike', "%{$term}%")
                    ->orWhere('tecnico_responsable', 'ilike', "%{$term}%")
                    ->orWhere('descripcion_falla', 'ilike', "%{$term}%")
                    ->orWhere('diagnostico_solucion', 'ilike', "%{$term}%")
                    ->orWhereHas('asset', function (Builder $qa) use ($term) {
                        $qa->where('codigo_patrimonial', 'ilike', "%{$term}%")
                            ->orWhere('nombre', 'ilike', "%{$term}%")
                            ->orWhere('numero_serie', 'ilike', "%{$term}%");
                    });
            });
        }

        return $query->paginate(min($perPage, 100));
    }

    public function findById(int $id): ?AssetMaintenance
    {
        return AssetMaintenance::query()
            ->with(['asset.image', 'technicianUser'])
            ->find($id);
    }

    public function create(array $data): AssetMaintenance
    {
        return DB::transaction(function () use ($data) {
            $assetId = (int) $data['id_activo'];
            $asset = Asset::query()->where('id_activo', $assetId)->lockForUpdate()->first();

            if (! $asset) {
                throw new DomainException('El activo seleccionado no existe.', 'ASSET_NOT_FOUND', 404);
            }

            $targetState = $data['estado'] ?? 'Programado';

            if ($targetState === 'EnProceso') {
                if ($asset->estado === 'Asignado') {
                    throw new DomainException("El equipo {$asset->codigo_patrimonial} se encuentra prestado actualmente. Debe registrarse su devolución antes de iniciar el mantenimiento.", 'CANNOT_MAINTAIN_ASSIGNED_ASSET', 422);
                }

                // Inmovilizar equipo en mantenimiento
                $asset->update([
                    'estado' => 'Mantenimiento',
                    'actualizado_en' => now(),
                ]);
            }

            if ($targetState === 'Completado' && empty($data['fecha_ejecucion'])) {
                $data['fecha_ejecucion'] = now();
            }

            $data['creado_en'] = now();
            $data['actualizado_en'] = now();

            $maintenance = AssetMaintenance::query()->create($data);

            return $maintenance->fresh(['asset.image', 'technicianUser']);
        });
    }

    public function update(AssetMaintenance $maintenance, array $data): AssetMaintenance
    {
        return DB::transaction(function () use ($maintenance, $data) {
            $targetState = $data['estado'] ?? $maintenance->estado;
            $assetId = $maintenance->id_activo;
            $asset = Asset::query()->where('id_activo', $assetId)->lockForUpdate()->first();

            if (! $asset) {
                throw new DomainException('El activo asociado no existe.', 'ASSET_NOT_FOUND', 404);
            }

            // Impedir cambiar de activo una vez iniciado o concluido
            if (isset($data['id_activo']) && (int) $data['id_activo'] !== $assetId && in_array($maintenance->estado, ['EnProceso', 'Completado'], true)) {
                throw new DomainException('No se puede cambiar el activo de una intervención ya iniciada o concluida.', 'CANNOT_CHANGE_MAINTENANCE_ASSET', 422);
            }

            // Transición hacia EnProceso
            if ($targetState === 'EnProceso' && $maintenance->estado !== 'EnProceso') {
                if ($asset->estado === 'Asignado') {
                    throw new DomainException("El equipo {$asset->codigo_patrimonial} se encuentra asignado. Registre su devolución antes de iniciar el trabajo técnico.", 'CANNOT_MAINTAIN_ASSIGNED_ASSET', 422);
                }

                $asset->update([
                    'estado' => 'Mantenimiento',
                    'actualizado_en' => now(),
                ]);
            }

            // Transición hacia Completado
            if ($targetState === 'Completado') {
                if (empty($data['fecha_ejecucion']) && empty($maintenance->fecha_ejecucion)) {
                    $data['fecha_ejecucion'] = now();
                }

                // Verificar que no queden otras intervenciones EnProceso para este mismo activo
                $otherActive = AssetMaintenance::query()
                    ->where('id_activo', $assetId)
                    ->where('id_mantenimiento', '!=', $maintenance->id_mantenimiento)
                    ->where('estado', 'EnProceso')
                    ->exists();

                // Verificar que el equipo no tenga un préstamo activo vigente
                $activeAssignment = AssetAssignment::query()
                    ->where('id_activo', $assetId)
                    ->where('estado', 'Activo')
                    ->exists();

                if (! $otherActive && ! $activeAssignment && $asset->estado === 'Mantenimiento') {
                    $asset->update([
                        'estado' => 'Disponible',
                        'condicion_fisica' => 'Bueno',
                        'actualizado_en' => now(),
                    ]);
                }
            }

            // Transición hacia Cancelado
            if ($targetState === 'Cancelado' && $maintenance->estado === 'EnProceso') {
                $otherActive = AssetMaintenance::query()
                    ->where('id_activo', $assetId)
                    ->where('id_mantenimiento', '!=', $maintenance->id_mantenimiento)
                    ->where('estado', 'EnProceso')
                    ->exists();

                $activeAssignment = AssetAssignment::query()
                    ->where('id_activo', $assetId)
                    ->where('estado', 'Activo')
                    ->exists();

                if (! $otherActive && ! $activeAssignment && $asset->estado === 'Mantenimiento') {
                    $asset->update([
                        'estado' => 'Disponible',
                        'actualizado_en' => now(),
                    ]);
                }
            }

            $data['actualizado_en'] = now();
            $maintenance->update($data);

            return $maintenance->fresh(['asset.image', 'technicianUser']);
        });
    }

    public function delete(AssetMaintenance $maintenance): void
    {
        if ($maintenance->estado === 'Completado') {
            throw new DomainException('No se puede eliminar físicamente un registro de mantenimiento completado. El historial técnico debe conservarse.', 'CANNOT_DELETE_COMPLETED_MAINTENANCE', 422);
        }

        $maintenance->delete();
    }

    public function listByAsset(int $assetId): Collection
    {
        return AssetMaintenance::query()
            ->with(['technicianUser:id_usuario,nombre_completo,correo'])
            ->where('id_activo', $assetId)
            ->orderByDesc('fecha_programada')
            ->get();
    }
}
