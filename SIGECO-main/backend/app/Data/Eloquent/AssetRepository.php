<?php

namespace App\Data\Eloquent;

use App\Data\Contracts\AssetRepositoryInterface;
use App\Domain\TechDesk\Asset;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AssetRepository implements AssetRepositoryInterface
{
    public function paginate(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = Asset::query()
            ->with([
                'creator:id_usuario,nombre_completo,correo',
                'currentAssignment.assignedUser:id_usuario,nombre_completo,correo',
                'currentAssignment.assignedArea:id_area,nombre,codigo',
            ])
            ->orderByDesc('creado_en');

        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function (Builder $q) use ($term) {
                $q->where('codigo_patrimonial', 'ilike', "%{$term}%")
                    ->orWhere('nombre', 'ilike', "%{$term}%")
                    ->orWhere('marca', 'ilike', "%{$term}%")
                    ->orWhere('modelo', 'ilike', "%{$term}%")
                    ->orWhere('numero_serie', 'ilike', "%{$term}%");
            });
        }

        if (! empty($filters['tipo'])) {
            $query->where('tipo', $filters['tipo']);
        }

        if (! empty($filters['estado'])) {
            $query->where('estado', $filters['estado']);
        }

        if (! empty($filters['condicion'])) {
            $query->where('condicion_fisica', $filters['condicion']);
        }

        return $query->paginate(min($perPage, 100));
    }

    public function findById(int $id): ?Asset
    {
        return Asset::query()
            ->with([
                'creator:id_usuario,nombre_completo,correo',
                'currentAssignment.assignedUser:id_usuario,nombre_completo,correo',
                'currentAssignment.assignedArea:id_area,nombre,codigo',
                'assignments.assignedUser:id_usuario,nombre_completo,correo',
                'assignments.assignedArea:id_area,nombre,codigo',
                'maintenances',
            ])
            ->find($id);
    }

    public function findByPatrimonialCode(string $code): ?Asset
    {
        return Asset::query()->where('codigo_patrimonial', $code)->first();
    }

    public function create(array $data): Asset
    {
        $data['creado_en'] = now();
        $data['actualizado_en'] = now();

        return Asset::query()->create($data);
    }

    public function update(Asset $asset, array $data): Asset
    {
        $data['actualizado_en'] = now();
        $asset->update($data);

        return $asset->fresh(['creator', 'currentAssignment.assignedUser']);
    }

    public function delete(Asset $asset): void
    {
        $asset->delete();
    }

    public function getAvailableStock(?string $type = null): Collection
    {
        $query = Asset::query()
            ->where('estado', 'Disponible')
            ->orderBy('nombre');

        if ($type) {
            $query->where('tipo', $type);
        }

        return $query->get();
    }

    public function getKpiMetrics(): array
    {
        $total = Asset::query()->count();
        $disponibles = Asset::query()->where('estado', 'Disponible')->count();
        $asignados = Asset::query()->where('estado', 'Asignado')->count();
        $mantenimiento = Asset::query()->where('estado', 'Mantenimiento')->count();
        $baja = Asset::query()->where('estado', 'Baja')->count();

        $byType = Asset::query()
            ->select('tipo', DB::raw('count(*) as total'))
            ->groupBy('tipo')
            ->orderByDesc('total')
            ->get()
            ->toArray();

        return [
            'total_activos' => $total,
            'disponibles' => $disponibles,
            'asignados' => $asignados,
            'en_mantenimiento' => $mantenimiento,
            'de_baja' => $baja,
            'distribucion_tipo' => $byType,
        ];
    }
}
