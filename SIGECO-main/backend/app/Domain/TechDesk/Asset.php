<?php

namespace App\Domain\TechDesk;

use App\Domain\Sec\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Asset extends Model
{
    protected $table = 'ti.activos';

    protected $primaryKey = 'id_activo';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'especificaciones' => 'array',
        'costo_adquisicion' => 'decimal:2',
        'vida_util_meses' => 'integer',
        'fecha_adquisicion' => 'date',
        'creado_en' => 'datetime',
        'actualizado_en' => 'datetime',
    ];

    protected $appends = [
        'asset_id',
        'patrimonial_code',
        'serial_number',
        'name',
        'type',
        'brand',
        'model',
        'status',
        'physical_condition',
        'location',
        'image_url',
        'foto_url',
        'depreciation_info',
    ];

    public function getAssetIdAttribute(): ?int
    {
        return $this->id_activo ?? null;
    }

    public function getPatrimonialCodeAttribute(): ?string
    {
        return $this->codigo_patrimonial ?? null;
    }

    public function getSerialNumberAttribute(): ?string
    {
        return $this->numero_serie ?? null;
    }

    public function getNameAttribute(): ?string
    {
        return $this->nombre ?? null;
    }

    public function getTypeAttribute(): ?string
    {
        return $this->tipo ?? null;
    }

    public function getBrandAttribute(): ?string
    {
        return $this->marca ?? null;
    }

    public function getModelAttribute(): ?string
    {
        return $this->modelo ?? null;
    }

    public function getStatusAttribute(): ?string
    {
        return $this->estado ?? null;
    }

    public function getPhysicalConditionAttribute(): ?string
    {
        return $this->condicion_fisica ?? null;
    }

    public function getLocationAttribute(): ?string
    {
        return $this->ubicacion ?? null;
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image?->url ?? null;
    }

    public function getFotoUrlAttribute(): ?string
    {
        return $this->image?->url ?? null;
    }

    public function getDepreciationInfoAttribute(): array
    {
        $costoRaw = $this->costo_adquisicion;
        $vidaMeses = max(1, (int) ($this->vida_util_meses ?? 36));

        if ($costoRaw === null || ! $this->fecha_adquisicion) {
            return [
                'valorable' => false,
                'motivo_pendiente' => $costoRaw === null ? 'Costo de adquisición no registrado' : 'Fecha de adquisición no registrada',
                'meses_uso' => 0,
                'porcentaje_depreciacion' => 0,
                'depreciacion_acumulada' => 0.00,
                'valor_actual' => $costoRaw !== null ? (float) $costoRaw : 0.00,
                'vida_util_restante_meses' => $vidaMeses,
            ];
        }

        $costo = (float) $costoRaw;
        if ($costo < 0) {
            return [
                'valorable' => false,
                'motivo_pendiente' => 'Costo de adquisición inválido',
                'meses_uso' => 0,
                'porcentaje_depreciacion' => 0,
                'depreciacion_acumulada' => 0.00,
                'valor_actual' => 0.00,
                'vida_util_restante_meses' => $vidaMeses,
            ];
        }

        $now = now()->setTimezone('America/Lima');
        $acq = Carbon::parse($this->fecha_adquisicion, 'America/Lima');

        if ($now->lessThan($acq)) {
            return [
                'valorable' => false,
                'motivo_pendiente' => 'Fecha de adquisición futura',
                'meses_uso' => 0,
                'porcentaje_depreciacion' => 0,
                'depreciacion_acumulada' => 0.00,
                'valor_actual' => $costo,
                'vida_util_restante_meses' => $vidaMeses,
            ];
        }

        // Aniversarios mensuales de calendario con ajuste a último día de mes
        $yDiff = $now->year - $acq->year;
        $mDiff = $now->month - $acq->month;
        $totalMonths = ($yDiff * 12) + $mDiff;
        $effectiveDay = min($acq->day, $now->daysInMonth);
        if ($now->day < $effectiveDay) {
            $totalMonths--;
        }
        $mesesCompletos = max(0, $totalMonths);
        $mesesUso = min($vidaMeses, $mesesCompletos);

        $depreciacionAcumulada = round(($costo * $mesesUso) / $vidaMeses, 2);
        $valorActual = max(0.0, round($costo - $depreciacionAcumulada, 2));
        $porcentaje = $costo > 0 ? min(100.0, round(($depreciacionAcumulada / $costo) * 100, 2)) : 0;

        return [
            'valorable' => true,
            'motivo_pendiente' => null,
            'meses_uso' => $mesesCompletos,
            'meses_depreciados' => $mesesUso,
            'porcentaje_depreciacion' => $porcentaje,
            'depreciacion_acumulada' => $depreciacionAcumulada,
            'valor_actual' => $valorActual,
            'vida_util_restante_meses' => max(0, $vidaMeses - $mesesCompletos),
        ];
    }

    public function image(): BelongsTo
    {
        return $this->belongsTo(AssetImage::class, 'id_imagen');
    }

    public function imagen(): BelongsTo
    {
        return $this->belongsTo(AssetImage::class, 'id_imagen');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creado_por');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(AssetAssignment::class, 'id_activo')->orderByDesc('fecha_asignacion');
    }

    public function currentAssignment(): HasOne
    {
        return $this->hasOne(AssetAssignment::class, 'id_activo')
            ->where('estado', 'Activo')
            ->latestOfMany('id_asignacion');
    }

    public function maintenances(): HasMany
    {
        return $this->hasMany(AssetMaintenance::class, 'id_activo')->orderByDesc('fecha_programada');
    }
}
