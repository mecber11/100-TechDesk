<?php

namespace App\Domain\TechDesk;

use App\Domain\Sec\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetMaintenance extends Model
{
    protected $table = 'ti.mantenimientos_activo';

    protected $primaryKey = 'id_mantenimiento';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'costo' => 'decimal:2',
        'fecha_programada' => 'date',
        'fecha_ejecucion' => 'datetime',
        'proximo_mantenimiento_sugerido' => 'date',
        'creado_en' => 'datetime',
        'actualizado_en' => 'datetime',
    ];

    protected $appends = [
        'maintenance_id',
        'asset_code',
        'asset_name',
    ];

    public function getMaintenanceIdAttribute(): int
    {
        return $this->id_mantenimiento;
    }

    public function getAssetCodeAttribute(): ?string
    {
        return $this->asset?->codigo_patrimonial;
    }

    public function getAssetNameAttribute(): ?string
    {
        return $this->asset?->nombre;
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class, 'id_activo');
    }

    public function technicianUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'realizado_por');
    }
}
