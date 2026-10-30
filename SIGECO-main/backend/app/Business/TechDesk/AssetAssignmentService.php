<?php

namespace App\Business\TechDesk;

use App\Common\Exceptions\DomainException;
use App\Data\Contracts\AssetAssignmentRepositoryInterface;
use App\Data\Contracts\AssetRepositoryInterface;
use App\Domain\TechDesk\AssetAssignment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class AssetAssignmentService
{
    public function __construct(
        private readonly AssetAssignmentRepositoryInterface $assignments,
        private readonly AssetRepositoryInterface $assets
    ) {}

    public function list(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        return $this->assignments->paginate($filters, $perPage);
    }

    public function getSummary(array $filters): array
    {
        return $this->assignments->getSummary($filters);
    }

    public function getLookups(): array
    {
        return $this->assignments->getLookups();
    }

    public function exportCsv(array $filters): string
    {
        $records = $this->assignments->getAllFiltered($filters);

        $output = fopen('php://temp', 'r+');

        // Encabezados descriptivos
        fputcsv($output, [
            'ID Asignacion',
            'Codigo Patrimonial',
            'Numero de Serie / Identificador',
            'Tipo Identificador',
            'Equipo / Nombre',
            'Marca',
            'Modelo',
            'Area Solicitante',
            'Area de Destino',
            'Colaborador Asignado',
            'Correo Colaborador',
            'Fecha Asignacion',
            'Fecha Devolucion Estimada',
            'Fecha Devolucion Real',
            'Estado Prestamo',
            'Condicion Entrega',
            'Condicion Devolucion',
            'ID Pedido Vinculado',
            'Observaciones Entrega',
            'Observaciones Devolucion',
        ]);

        foreach ($records as $item) {
            $asset = $item->asset;
            $ident = $asset ? ($asset->numero_serie ?: $asset->identificador_alternativo ?: 'Sin serie') : '';

            // Sanitización contra inyección de fórmulas en hojas de cálculo
            $sanitize = function (?string $val): string {
                if ($val === null) return '';
                if (in_array(substr($val, 0, 1), ['=', '+', '-', '@'], true)) {
                    return "'" . $val;
                }
                return $val;
            };

            fputcsv($output, [
                $item->id_asignacion,
                $sanitize($asset?->codigo_patrimonial ?? ''),
                $sanitize($ident),
                $sanitize($asset?->tipo_identificador_externo ?? 'Serie'),
                $sanitize($asset?->nombre ?? ''),
                $sanitize($asset?->marca ?? ''),
                $sanitize($asset?->modelo ?? ''),
                $sanitize($item->requestingArea?->nombre ?? 'Área solicitante no informada'),
                $sanitize($item->assignedArea?->nombre ?? 'Sin área asignada'),
                $sanitize($item->assignedUser?->nombre_completo ?? ''),
                $sanitize($item->assignedUser?->correo ?? ''),
                $item->fecha_asignacion ? $item->fecha_asignacion->toIso8601String() : '',
                $item->fecha_devolucion_estimada ? $item->fecha_devolucion_estimada->format('Y-m-d') : '',
                $item->fecha_devolucion_real ? $item->fecha_devolucion_real->toIso8601String() : '',
                $item->estado,
                $sanitize($item->condicion_entrega),
                $sanitize($item->condicion_devolucion),
                $item->id_pedido ?? '',
                $sanitize($item->observaciones_entrega),
                $sanitize($item->observaciones_devolucion),
            ]);
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        return $csv ?: '';
    }

    public function getById(int $id): AssetAssignment
    {
        $assignment = $this->assignments->findById($id);
        if (! $assignment) {
            throw new DomainException('La asignación de activo no fue encontrada.', 'ASSIGNMENT_NOT_FOUND', 404);
        }

        return $assignment;
    }

    public function assignAsset(array $payload, int $assignedByUserId): AssetAssignment
    {
        $assetId = (int) ($payload['id_activo'] ?? 0);
        $asset = $this->assets->findById($assetId);

        if (! $asset) {
            throw new DomainException('El activo seleccionado no existe.', 'ASSET_NOT_FOUND', 404);
        }

        if ($asset->estado !== 'Disponible') {
            throw new DomainException("El activo {$asset->codigo_patrimonial} no está disponible (Estado actual: {$asset->estado}).", 'ASSET_NOT_AVAILABLE', 422);
        }

        $userId = (int) ($payload['id_usuario_asignado'] ?? 0);
        if ($userId <= 0) {
            throw new DomainException('Debe seleccionar el colaborador destinatario de la asignación.', 'USER_REQUIRED', 422);
        }

        $payload['asignado_por'] = $assignedByUserId;
        $payload['estado'] = 'Activo';

        return $this->assignments->createAssignment($payload);
    }

    public function returnAsset(int $id, array $returnData, int $receivedByUserId): AssetAssignment
    {
        $assignment = $this->getById($id);

        if ($assignment->estado === 'Devuelto') {
            throw new DomainException('Esta asignación ya fue registrada como devuelta anteriormente.', 'ALREADY_RETURNED', 422);
        }

        $returnData['recibido_por'] = $receivedByUserId;

        return $this->assignments->returnAssignment($assignment, $returnData);
    }

    public function getMyAssignedAssets(int $userId): Collection
    {
        return $this->assignments->activeAssignmentsForUser($userId);
    }

    public function getAssetHistory(int $assetId): Collection
    {
        return $this->assignments->historyForAsset($assetId);
    }
}
