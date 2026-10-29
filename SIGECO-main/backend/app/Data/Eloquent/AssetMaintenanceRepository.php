<?php

namespace App\Data\Eloquent;

use App\Data\Contracts\AssetMaintenanceRepositoryInterface;
use App\Domain\TechDesk\Asset;
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
                'asset',
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
            $query->where('id_activo', $filters['asset_id']);
        }

        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function (Builder $q) use ($term) {
                $q->where('titulo', 'ilike', "%{$term}%")
                    ->orWhere('tecnico_responsable', 'ilike', "%{$term}%")
                    ->orWhere('descripcion_falla', 'ilike', "%{$term}%")
                    ->orWhereHas('asset', function (Builder $qa) use ($term) {
                        $qa->where('codigo_patrimonial', 'ilike', "%{$term}%")
                            ->orWhere('nombre', 'ilike', "%{$term}%");
                    });
            });
        }

        return $query->paginate(min($perPage, 100));
    }

    public function findById(int $id): ?AssetMaintenance
    {
        return AssetMaintenance::query()
            ->with(['asset', 'technicianUser'])
            ->find($id);
    }

    public function create(array $data): AssetMaintenance
    {
        return DB::transaction(function () use ($data) {
            $data['creado_en'] = now();
            $data['actualizado_en'] = now();

            $maintenance = AssetMaintenance::query()->create($data);

            if (($data['estado'] ?? '') === 'EnProceso') {
                Asset::query()->where('id_activo', $data['id_activo'])->update([
                    'estado' => 'Mantenimiento',
                    'actualizado_en' => now(),
                ]);
            }

            return $maintenance->fresh(['asset']);
        });
    }

    public function update(AssetMaintenance $maintenance, array $data): AssetMaintenance
    {
        return DB::transaction(function () use ($maintenance, $data) {
            $data['actualizado_en'] = now();
            if (($data['estado'] ?? '') === 'Completado' && ! isset($data['fecha_ejecucion'])) {
                $data['fecha_ejecucion'] = now();
            }

            $maintenance->update($data);

            // Si se completó el mantenimiento y el activo estaba en mantenimiento, restaurar a 'Disponible'
            if (($data['estado'] ?? '') === 'Completado') {
                $activo = Asset::query()->find($maintenance->id_activo);
                if ($activo && $activo->estado === 'Mantenimiento') {
                    $activo->update([
                        'estado' => 'Disponible',
                        'condicion_fisica' => 'Bueno',
                        'actualizado_en' => now(),
                    ]);
                }
            }

            return $maintenance->fresh(['asset', 'technicianUser']);
        });
    }

    public function delete(AssetMaintenance $maintenance): void
    {
        $maintenance->delete();
    }

    public function listByAsset(int $assetId): Collection
    {
        return AssetMaintenance::query()
            ->where('id_activo', $assetId)
            ->orderByDesc('fecha_programada')
            ->get();
    }
}
