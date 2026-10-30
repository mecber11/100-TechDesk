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
        'fecha_devolucion_estimada' => 'datetime',
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
        'requesting_area_name',
        'destination_area_name',
        'due_status',
    ];

    public function getAssignmentIdAttribute(): ?int
    {
        return $this->id_asignacion ?? null;
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

    public function getRequestingAreaNameAttribute(): ?string
    {
        return $this->requestingArea?->nombre;
    }

    public function getDestinationAreaNameAttribute(): ?string
    {
        return $this->assignedArea?->nombre;
    }

    public function getDueStatusAttribute(): ?string
    {
        if ($this->estado !== 'Activo' || ! $this->fecha_devolucion_estimada) {
            return null;
        }

        $due = \Carbon\Carbon::parse($this->fecha_devolucion_estimada);
        $now = now();

        if ($due->lessThan($now)) {
            return 'vencido';
        }

        // Si faltan 2 horas o menos (<= 120 minutos)
        if ($now->diffInMinutes($due, false) <= 120) {
            return 'por_vencer';
        }

        return 'vigente';
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

    public function requestingArea(): BelongsTo
    {
        return $this->belongsTo(InternalArea::class, 'id_area_solicitante');
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
