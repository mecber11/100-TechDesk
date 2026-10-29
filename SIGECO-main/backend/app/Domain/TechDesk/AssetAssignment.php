<?php

namespace App\Domain\TechDesk;

use App\Domain\Org\InternalArea;
use App\Domain\Req\InternalOrder;
use App\Domain\Sec\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetAssignment extends Model
{
    protected $table = 'ti.asignaciones_activo';

    protected $primaryKey = 'id_asignacion';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'fecha_asignacion' => 'datetime',
        'fecha_devolucion_estimada' => 'date',
        'fecha_devolucion_real' => 'datetime',
        'creado_en' => 'datetime',
        'actualizado_en' => 'datetime',
    ];

    protected $appends = [
        'assignment_id',
        'assigned_user_name',
        'assigned_user_email',
        'asset_code',
        'asset_name',
    ];

    public function getAssignmentIdAttribute(): int
    {
        return $this->id_asignacion;
    }

    public function getAssignedUserNameAttribute(): ?string
    {
        return $this->assignedUser?->nombre_completo;
    }

    public function getAssignedUserEmailAttribute(): ?string
    {
        return $this->assignedUser?->correo;
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

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_usuario_asignado');
    }

    public function assignedArea(): BelongsTo
    {
        return $this->belongsTo(InternalArea::class, 'id_area_destino');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(InternalOrder::class, 'id_pedido');
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'asignado_por');
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recibido_por');
    }
}
