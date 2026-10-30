<?php

namespace App\Data\Eloquent;

use App\Data\Contracts\AssetRepositoryInterface;
use App\Domain\TechDesk\Asset;
use App\Domain\TechDesk\AssetImage;
use Carbon\Carbon;
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
                'image',
                'creator:id_usuario,nombre_completo,correo',
                'currentAssignment.assignedUser:id_usuario,nombre_completo,correo',
                'currentAssignment.assignedArea:id_area,nombre,codigo',
                'currentAssignment.requestingArea:id_area,nombre,codigo',
            ])
            ->orderByDesc('creado_en');

        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function (Builder $q) use ($term) {
                $q->where('codigo_patrimonial', 'ilike', "%{$term}%")
                    ->orWhere('nombre', 'ilike', "%{$term}%")
                    ->orWhere('marca', 'ilike', "%{$term}%")
                    ->orWhere('modelo', 'ilike', "%{$term}%")
                    ->orWhere('numero_serie', 'ilike', "%{$term}%")
                    ->orWhere('identificador_alternativo', 'ilike', "%{$term}%")
                    ->orWhere('identificador_normalizado', 'ilike', "%{$term}%");
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
                'image',
                'creator:id_usuario,nombre_completo,correo',
                'currentAssignment.assignedUser:id_usuario,nombre_completo,correo',
                'currentAssignment.assignedArea:id_area,nombre,codigo',
                'currentAssignment.requestingArea:id_area,nombre,codigo',
                'assignments.assignedUser:id_usuario,nombre_completo,correo',
                'assignments.assignedArea:id_area,nombre,codigo',
                'assignments.requestingArea:id_area,nombre,codigo',
                'assignments.assignedBy:id_usuario,nombre_completo,correo',
                'assignments.receivedBy:id_usuario,nombre_completo,correo',
                'assignments.order:id_pedido,codigo_pedido,titulo,estado',
                'maintenances.technicianUser:id_usuario,nombre_completo,correo',
            ])
            ->find($id);
    }

    public function findByPatrimonialCode(string $code): ?Asset
    {
        return Asset::query()->where('codigo_patrimonial', $code)->first();
    }

    public function findByIdentifier(string $type, ?string $issuer, string $normalizedValue, ?int $excludeAssetId = null): ?Asset
    {
        $query = Asset::query()
            ->where('tipo_identificador_externo', $type)
            ->where('identificador_normalizado', $normalizedValue);

        if ($issuer !== null) {
            $query->where('emisor_identificador_externo', $issuer);
        }

        if ($excludeAssetId !== null) {
            $query->where('id_activo', '!=', $excludeAssetId);
        }

        return $query->first();
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

        return $asset->fresh(['image', 'creator', 'currentAssignment.assignedUser', 'currentAssignment.assignedArea']);
    }

    public function delete(Asset $asset): void
    {
        $asset->delete();
    }

    public function getAvailableStock(?string $type = null): Collection
    {
        $query = Asset::query()
            ->with(['image'])
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

        $byType = DB::table('ti.activos')
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

    public function getValuationSummary(array $filters = []): array
    {
        $query = Asset::query()
            ->with([
                'image',
                'currentAssignment.assignedArea:id_area,nombre,codigo',
            ]);

        // Estado: si no se especifica, por defecto incluye los operativos ('Disponible', 'Asignado', 'Mantenimiento')
        if (! empty($filters['estado'])) {
            $query->where('estado', $filters['estado']);
        } else {
            $query->whereIn('estado', ['Disponible', 'Asignado', 'Mantenimiento']);
        }

        if (! empty($filters['tipo'])) {
            $query->where('tipo', $filters['tipo']);
        }

        if (! empty($filters['marca'])) {
            $query->where('marca', 'ilike', "%{$filters['marca']}%");
        }

        if (! empty($filters['modelo'])) {
            $query->where('modelo', 'ilike', "%{$filters['modelo']}%");
        }

        if (! empty($filters['adquisicion_desde'])) {
            $query->where('fecha_adquisicion', '>=', $filters['adquisicion_desde']);
        }

        if (! empty($filters['adquisicion_hasta'])) {
            $query->where('fecha_adquisicion', '<=', $filters['adquisicion_hasta']);
        }

        if (! empty($filters['area_id'])) {
            $areaId = (int) $filters['area_id'];
            $query->whereHas('currentAssignment', function (Builder $qa) use ($areaId) {
                $qa->where('id_area_destino', $areaId)->where('estado', 'Activo');
            });
        }

        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function (Builder $q) use ($term) {
                $q->where('codigo_patrimonial', 'ilike', "%{$term}%")
                    ->orWhere('nombre', 'ilike', "%{$term}%")
                    ->orWhere('numero_serie', 'ilike', "%{$term}%")
                    ->orWhere('identificador_alternativo', 'ilike', "%{$term}%");
            });
        }

        $allAssets = $query->orderBy('codigo_patrimonial')->get();

        $asOf = now()->setTimezone('America/Lima');
        $totalAssets = count($allAssets);
        $valuedAssetsCount = 0;
        $pendingAssetsCount = 0;
        $fullyDepreciatedCount = 0;
        $totalAcquisition = 0.00;
        $totalDepreciation = 0.00;
        $totalCurrent = 0.00;

        $byTypeMap = [];
        $byStatusMap = [];
        $byAreaMap = [];
        $pendingDetails = [];
        $assetsList = [];

        foreach ($allAssets as $asset) {
            $depInfo = $asset->depreciation_info;
            $isValued = $depInfo['valorable'] ?? false;

            // Filtro por valoracion_status si fue especificado
            if (! empty($filters['valoracion_status'])) {
                if ($filters['valoracion_status'] === 'completed' && ! $isValued) {
                    continue;
                }
                if ($filters['valoracion_status'] === 'pending' && $isValued) {
                    continue;
                }
            }

            if ($isValued) {
                $valuedAssetsCount++;
                $cost = (float) $asset->costo_adquisicion;
                $dep = (float) $depInfo['depreciacion_acumulada'];
                $cur = (float) $depInfo['valor_actual'];

                if ($cur <= 0.00) {
                    $fullyDepreciatedCount++;
                }

                $totalAcquisition += $cost;
                $totalDepreciation += $dep;
                $totalCurrent += $cur;

                // Desglose por tipo
                $tipoKey = $asset->tipo;
                if (! isset($byTypeMap[$tipoKey])) {
                    $byTypeMap[$tipoKey] = ['tipo' => $tipoKey, 'count' => 0, 'acquisition_value' => 0.0, 'current_value' => 0.0];
                }
                $byTypeMap[$tipoKey]['count']++;
                $byTypeMap[$tipoKey]['acquisition_value'] += $cost;
                $byTypeMap[$tipoKey]['current_value'] += $cur;

                // Desglose por estado
                $estadoKey = $asset->estado;
                if (! isset($byStatusMap[$estadoKey])) {
                    $byStatusMap[$estadoKey] = ['estado' => $estadoKey, 'count' => 0, 'acquisition_value' => 0.0, 'current_value' => 0.0];
                }
                $byStatusMap[$estadoKey]['count']++;
                $byStatusMap[$estadoKey]['acquisition_value'] += $cost;
                $byStatusMap[$estadoKey]['current_value'] += $cur;

                // Desglose por área de custodia (única custodia vigente o Almacén TI)
                $areaName = 'Almacén TI / Sin custodia activa';
                if ($asset->currentAssignment && $asset->currentAssignment->assignedArea) {
                    $areaName = $asset->currentAssignment->assignedArea->nombre;
                } elseif (! empty($asset->ubicacion)) {
                    $areaName = $asset->ubicacion;
                }

                if (! isset($byAreaMap[$areaName])) {
                    $byAreaMap[$areaName] = ['area' => $areaName, 'count' => 0, 'acquisition_value' => 0.0, 'current_value' => 0.0];
                }
                $byAreaMap[$areaName]['count']++;
                $byAreaMap[$areaName]['acquisition_value'] += $cost;
                $byAreaMap[$areaName]['current_value'] += $cur;
            } else {
                $pendingAssetsCount++;
                $pendingDetails[] = [
                    'id_activo' => $asset->id_activo,
                    'codigo_patrimonial' => $asset->codigo_patrimonial,
                    'nombre' => $asset->nombre,
                    'motivo' => $depInfo['motivo_pendiente'] ?? 'Datos de valoración incompletos',
                ];
            }

            $assetsList[] = $asset;
        }

        // Formatear desgloses numéricos a dos decimales
        $byType = array_values(array_map(function ($item) {
            $item['acquisition_value'] = number_format($item['acquisition_value'], 2, '.', '');
            $item['current_value'] = number_format($item['current_value'], 2, '.', '');
            return $item;
        }, $byTypeMap));

        $byStatus = array_values(array_map(function ($item) {
            $item['acquisition_value'] = number_format($item['acquisition_value'], 2, '.', '');
            $item['current_value'] = number_format($item['current_value'], 2, '.', '');
            return $item;
        }, $byStatusMap));

        $byArea = array_values(array_map(function ($item) {
            $item['acquisition_value'] = number_format($item['acquisition_value'], 2, '.', '');
            $item['current_value'] = number_format($item['current_value'], 2, '.', '');
            return $item;
        }, $byAreaMap));

        return [
            'as_of' => $asOf->toIso8601String(),
            'timezone' => 'America/Lima',
            'currency' => 'PEN',
            'method' => 'linear_completed_calendar_months',
            'scope' => 'filtered_operational_assets',
            'total_assets' => $totalAssets,
            'valued_assets' => $valuedAssetsCount,
            'pending_valuation_assets' => $pendingAssetsCount,
            'fully_depreciated_assets' => $fullyDepreciatedCount,
            'acquisition_value' => number_format($totalAcquisition, 2, '.', ''),
            'accumulated_depreciation' => number_format($totalDepreciation, 2, '.', ''),
            'current_value' => number_format($totalCurrent, 2, '.', ''),
            'pending_details' => $pendingDetails,
            'by_type' => $byType,
            'by_status' => $byStatus,
            'by_area' => $byArea,
            'assets' => $assetsList,
        ];
    }

    public function storeImage(array $data): AssetImage
    {
        $data['creado_en'] = now();
        return AssetImage::query()->create($data);
    }

    public function findImageById(int $id): ?AssetImage
    {
        return AssetImage::query()->find($id);
    }

    public function listReusableImages(?string $search = null): Collection
    {
        $query = AssetImage::query()
            ->with(['assets:id_activo,codigo_patrimonial,nombre,marca,modelo,id_imagen'])
            ->orderByDesc('creado_en');

        if ($search) {
            $query->where(function (Builder $q) use ($search) {
                $q->where('nombre_original', 'ilike', "%{$search}%")
                    ->orWhereHas('assets', function (Builder $qa) use ($search) {
                        $qa->where('marca', 'ilike', "%{$search}%")
                            ->orWhere('modelo', 'ilike', "%{$search}%")
                            ->orWhere('nombre', 'ilike', "%{$search}%");
                    });
            });
        }

        return $query->get();
    }
}
