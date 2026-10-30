<?php

namespace App\Business\TechDesk;

use App\Common\Exceptions\DomainException;
use App\Data\Contracts\AssetRepositoryInterface;
use App\Domain\TechDesk\Asset;
use App\Domain\TechDesk\AssetImage;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class AssetService
{
    public function __construct(
        private readonly AssetRepositoryInterface $assets
    ) {}

    public function list(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        return $this->assets->paginate($filters, $perPage);
    }

    public function getById(int $id): Asset
    {
        $asset = $this->assets->findById($id);
        if (! $asset) {
            throw new DomainException('El activo tecnológico no fue encontrado.', 'ASSET_NOT_FOUND', 404);
        }

        return $asset;
    }

    public function create(array $payload, int $creatorId): Asset
    {
        $code = strtoupper(trim($payload['codigo_patrimonial'] ?? ''));
        if (empty($code)) {
            throw new DomainException('El código patrimonial es obligatorio.', 'INVALID_ASSET_CODE', 422);
        }

        $existing = $this->assets->findByPatrimonialCode($code);
        if ($existing) {
            throw new DomainException("El código patrimonial {$code} ya se encuentra registrado.", 'DUPLICATE_ASSET_CODE', 422);
        }

        // Validación y normalización de identidad física (TD01)
        $identData = $this->validateAndNormalizeIdentifier($payload);

        $payload['codigo_patrimonial'] = $code;
        $payload['creado_por'] = $creatorId;
        $payload['estado'] = $payload['estado'] ?? 'Disponible';
        $payload['condicion_fisica'] = $payload['condicion_fisica'] ?? 'Bueno';
        $payload['vida_util_meses'] = max(1, (int) ($payload['vida_util_meses'] ?? 36));

        // Validación de fecha de adquisición futura
        if (! empty($payload['fecha_adquisicion'])) {
            $acq = \Carbon\Carbon::parse($payload['fecha_adquisicion'], 'America/Lima')->startOfDay();
            $now = now()->setTimezone('America/Lima')->startOfDay();
            if ($acq->gt($now)) {
                throw new DomainException('La fecha de adquisición no puede ser posterior a la fecha actual.', 'INVALID_ACQUISITION_DATE', 422);
            }
        }

        // Validación de costo no negativo
        if (isset($payload['costo_adquisicion']) && $payload['costo_adquisicion'] !== null && $payload['costo_adquisicion'] !== '') {
            $cost = (float) $payload['costo_adquisicion'];
            if ($cost < 0) {
                throw new DomainException('El costo de adquisición no puede ser un valor negativo.', 'INVALID_ACQUISITION_COST', 422);
            }
            $payload['costo_adquisicion'] = $cost;
        } else {
            $payload['costo_adquisicion'] = null;
        }

        $payload = array_merge($payload, $identData);

        return $this->assets->create($payload);
    }

    public function update(int $id, array $payload): Asset
    {
        $asset = $this->getById($id);

        if (! empty($payload['codigo_patrimonial'])) {
            $code = strtoupper(trim($payload['codigo_patrimonial']));
            if ($code !== $asset->codigo_patrimonial) {
                $existing = $this->assets->findByPatrimonialCode($code);
                if ($existing) {
                    throw new DomainException("El código patrimonial {$code} ya pertenece a otro activo.", 'DUPLICATE_ASSET_CODE', 422);
                }
                $payload['codigo_patrimonial'] = $code;
            }
        }

        // Validación de identidad física en actualización
        if (isset($payload['numero_serie']) || isset($payload['identificador_alternativo']) || isset($payload['tipo_identificador_externo'])) {
            $mergedPayload = array_merge([
                'tipo_identificador_externo' => $asset->tipo_identificador_externo ?? 'Serie',
                'numero_serie' => $asset->numero_serie,
                'identificador_alternativo' => $asset->identificador_alternativo,
                'emisor_identificador_externo' => $asset->emisor_identificador_externo,
                'marca' => $payload['marca'] ?? $asset->marca,
            ], $payload);

            $identData = $this->validateAndNormalizeIdentifier($mergedPayload, $asset->id_activo);
            $payload = array_merge($payload, $identData);
        }

        if (isset($payload['costo_adquisicion']) && $payload['costo_adquisicion'] !== null && $payload['costo_adquisicion'] !== '') {
            $cost = (float) $payload['costo_adquisicion'];
            if ($cost < 0) {
                throw new DomainException('El costo de adquisición no puede ser un valor negativo.', 'INVALID_ACQUISITION_COST', 422);
            }
            $payload['costo_adquisicion'] = $cost;
        }

        return $this->assets->update($asset, $payload);
    }

    public function delete(int $id): void
    {
        $asset = $this->getById($id);

        if ($asset->estado === 'Asignado') {
            throw new DomainException('No se puede eliminar un activo que actualmente está asignado a un usuario.', 'CANNOT_DELETE_ASSIGNED_ASSET', 422);
        }

        $this->assets->delete($asset);
    }

    public function getAvailableStock(?string $type = null): Collection
    {
        return $this->assets->getAvailableStock($type);
    }

    public function getKpis(): array
    {
        return $this->assets->getKpiMetrics();
    }

    public function getValuation(array $filters = []): array
    {
        return $this->assets->getValuationSummary($filters);
    }

    public function uploadImage(UploadedFile $file, int $creatorId): AssetImage
    {
        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        $mime = $file->getMimeType();

        if (! in_array($mime, $allowedMimes, true)) {
            throw new DomainException('Formato de imagen no permitido. Solo se aceptan archivos JPEG, PNG y WebP.', 'INVALID_IMAGE_FORMAT', 422);
        }

        // Límite de 5 MB = 5 * 1024 * 1024 bytes = 5242880 bytes
        if ($file->getSize() > 5242880) {
            throw new DomainException('La imagen supera el tamaño máximo permitido de 5 MB.', 'IMAGE_TOO_LARGE', 422);
        }

        $hash = hash_file('sha256', $file->getRealPath());
        $ext = $file->getClientOriginalExtension() ?: 'jpg';
        $filename = "{$hash}.{$ext}";
        $path = $file->storeAs('techdesk_images', $filename, 'local');

        return $this->assets->storeImage([
            'ruta' => $path,
            'mime' => $mime,
            'tamano_bytes' => $file->getSize(),
            'hash_sha256' => $hash,
            'nombre_original' => $file->getClientOriginalName(),
            'creado_por' => $creatorId,
        ]);
    }

    public function getImageFile(int $imageId): array
    {
        $image = $this->assets->findImageById($imageId);
        if (! $image) {
            throw new DomainException('La imagen solicitada no existe.', 'IMAGE_NOT_FOUND', 404);
        }

        $fullPath = Storage::disk('local')->path($image->ruta);
        if (! file_exists($fullPath)) {
            throw new DomainException('El archivo físico de la imagen no fue encontrado.', 'FILE_NOT_FOUND', 404);
        }

        return [
            'path' => $fullPath,
            'mime' => $image->mime,
            'name' => $image->nombre_original,
        ];
    }

    public function listReusableImages(?string $search = null): Collection
    {
        return $this->assets->listReusableImages($search);
    }

    /**
     * Valida y normaliza la identidad física individual de un activo.
     */
    private function validateAndNormalizeIdentifier(array $payload, ?int $currentAssetId = null): array
    {
        $type = trim($payload['tipo_identificador_externo'] ?? 'Serie');
        $allowedTypes = ['Serie', 'ServiceTag', 'IMEI', 'MAC', 'Otro'];
        if (! in_array($type, $allowedTypes, true)) {
            $type = 'Serie';
        }

        $brand = strtoupper(trim($payload['marca'] ?? ''));
        $issuer = trim($payload['emisor_identificador_externo'] ?? '') ?: ($type === 'Serie' ? $brand : 'FABRICANTE');
        $issuer = strtoupper($issuer);

        $rawValue = '';
        if ($type === 'Serie') {
            $rawValue = trim($payload['numero_serie'] ?? '');
        } else {
            $rawValue = trim($payload['identificador_alternativo'] ?? ($payload['numero_serie'] ?? ''));
        }

        // Rechazo de comodines inválidos
        $invalidFillers = ['SIN SERIE', 'SINSERIE', 'N/A', 'NA', '0000', '0', 'NINGUNO', 'NONE', 'PENDIENTE', 'DESCONOCIDO'];
        $cleanTest = strtoupper(preg_replace('/[^A-Z0-9]/', '', $rawValue) ?? '');

        if ($currentAssetId === null && (empty($rawValue) || in_array(strtoupper($rawValue), $invalidFillers, true) || empty($cleanTest))) {
            throw new DomainException('Debe registrar un identificador físico individual verificable (Número de serie, Service Tag, MAC o IMEI válido). No se permiten valores vacíos o comodines genéricos.', 'INVALID_PHYSICAL_IDENTIFIER', 422);
        }

        if (empty($rawValue)) {
            return [
                'tipo_identificador_externo' => $type,
                'numero_serie' => null,
                'identificador_alternativo' => null,
                'emisor_identificador_externo' => $issuer,
                'identificador_normalizado' => null,
            ];
        }

        // Normalización según el tipo
        $normalized = strtoupper($rawValue);
        if ($type === 'MAC') {
            $macClean = strtoupper(preg_replace('/[^a-fA-F0-9]/', '', $rawValue) ?? '');
            if (strlen($macClean) === 12) {
                $normalized = implode(':', str_split($macClean, 2));
            } else {
                throw new DomainException("La dirección MAC {$rawValue} no tiene un formato válido de 12 dígitos hexadecimales.", 'INVALID_MAC_FORMAT', 422);
            }
        } elseif ($type === 'IMEI') {
            $imeiClean = preg_replace('/[^0-9]/', '', $rawValue) ?? '';
            if (strlen($imeiClean) === 15) {
                $normalized = $imeiClean;
            } else {
                throw new DomainException("El código IMEI {$rawValue} debe contener exactamente 15 dígitos numéricos.", 'INVALID_IMEI_FORMAT', 422);
            }
        } else {
            // Serie / ServiceTag: conservar guiones legítimos pero limpiar espacios
            $normalized = strtoupper(trim(preg_replace('/\s+/', '', $rawValue) ?? ''));
        }

        // Comprobación de unicidad en ámbito (tipo, emisor, valor normalizado)
        $existing = $this->assets->findByIdentifier($type, $issuer, $normalized, $currentAssetId);
        if ($existing) {
            throw new DomainException("El identificador físico '{$normalized}' ({$type} de {$issuer}) ya se encuentra asignado a la unidad {$existing->codigo_patrimonial} ({$existing->nombre}). Cada equipo físico debe tener identidad individual.", 'DUPLICATE_PHYSICAL_IDENTIFIER', 422);
        }

        return [
            'tipo_identificador_externo' => $type,
            'numero_serie' => $type === 'Serie' ? $rawValue : null,
            'identificador_alternativo' => $type !== 'Serie' ? $rawValue : null,
            'emisor_identificador_externo' => $issuer,
            'identificador_normalizado' => $normalized,
        ];
    }
}
