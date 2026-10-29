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
        'depreciation_info',
    ];

    public function getAssetIdAttribute(): int
    {
        return $this->id_activo;
    }

    public function getPatrimonialCodeAttribute(): string
    {
        return $this->codigo_patrimonial;
    }

    public function getSerialNumberAttribute(): ?string
    {
        return $this->numero_serie;
    }

    public function getNameAttribute(): string
    {
        return $this->nombre;
    }

    public function getTypeAttribute(): string
    {
        return $this->tipo;
    }

    public function getBrandAttribute(): string
    {
        return $this->marca;
    }

    public function getModelAttribute(): string
    {
        return $this->modelo;
    }

    public function getStatusAttribute(): string
    {
        return $this->estado;
    }

    public function getPhysicalConditionAttribute(): string
    {
        return $this->condicion_fisica;
    }

    public function getLocationAttribute(): ?string
    {
        return $this->ubicacion;
    }

    public function getDepreciationInfoAttribute(): array
    {
        $costo = (float) ($this->costo_adquisicion ?? 0);
        $vidaMeses = max(1, (int) ($this->vida_util_meses ?? 36));

        if (! $this->fecha_adquisicion || $costo <= 0) {
            return [
                'meses_uso' => 0,
                'porcentaje_depreciacion' => 0,
                'valor_actual' => $costo,
                'vida_util_restante_meses' => $vidaMeses,
            ];
        }

        $mesesUso = Carbon::parse($this->fecha_adquisicion)->diffInMonths(now());
        $depreciacionMensual = $costo / $vidaMeses;
        $depreciacionAcumulada = min($costo, $mesesUso * $depreciacionMensual);
        $valorActual = max(0, $costo - $depreciacionAcumulada);
        $porcentaje = min(100, round(($depreciacionAcumulada / $costo) * 100, 1));

        return [
            'meses_uso' => $mesesUso,
            'porcentaje_depreciacion' => $porcentaje,
            'valor_actual' => round($valorActual, 2),
            'vida_util_restante_meses' => max(0, $vidaMeses - $mesesUso),
        ];
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
