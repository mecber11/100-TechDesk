<?php

namespace App\Domain\Req;

use App\Domain\Docs\Document;
use App\Domain\Org\InternalArea;
use App\Domain\Sec\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class InternalOrder extends Model
{
    protected $table = 'req.pedidos';

    protected $primaryKey = 'id_pedido';

    public $timestamps = false;

    protected $guarded = [];

    protected $appends = [
        'order_id', 'order_code', 'from_area_id', 'to_area_id', 'requested_by_user_id',
        'assigned_to_user_id', 'related_document_id', 'request_type', 'title', 'description',
        'kind', 'priority', 'status', 'due_on', 'response_note', 'escalation_reason',
        'escalated_at', 'resolved_at', 'closed_at', 'created_at', 'updated_at',
        'requested_by_name', 'requested_by_email',
        'slack_status',
        'sla_status',
        'sla_deadline',
    ];

    public const STATUSES = ['Borrador', 'Enviado', 'EnAtencion', 'Escalado', 'Atendido', 'Rechazado', 'Cerrado'];

    protected $casts = [
        'fecha_limite' => 'date',
        'creado_en' => 'datetime',
        'actualizado_en' => 'datetime',
        'fecha_escalamiento' => 'datetime',
        'fecha_atencion' => 'datetime',
        'fecha_cierre' => 'datetime',
    ];

    public function getOrderIdAttribute(): mixed
    {
        return $this->id_pedido;
    }

    public function getOrderCodeAttribute(): mixed
    {
        return $this->codigo_pedido;
    }

    public function getFromAreaIdAttribute(): mixed
    {
        return $this->area_origen;
    }

    public function getToAreaIdAttribute(): mixed
    {
        return $this->area_destino;
    }

    public function getRequestedByUserIdAttribute(): mixed
    {
        return $this->solicitado_por;
    }

    public function getRequestedByNameAttribute(): mixed
    {
        return $this->nombre_solicitante ?? $this->requestedBy?->nombre_completo;
    }

    public function getRequestedByEmailAttribute(): mixed
    {
        return $this->correo_solicitante ?? $this->requestedBy?->correo;
    }

    public function getSlackStatusAttribute(): ?string
    {
        return $this->latestSlackNotice?->estado;
    }

    public function latestSlackNotice(): HasOne
    {
        return $this->hasOne(SlackNotice::class, 'id_pedido')->latestOfMany('id_aviso');
    }

    public function getAssignedToUserIdAttribute(): mixed
    {
        return $this->atendido_por;
    }

    public function getRelatedDocumentIdAttribute(): mixed
    {
        return $this->documento_relacionado;
    }

    public function getRequestTypeAttribute(): mixed
    {
        return $this->tipo_solicitud;
    }

    public function getTitleAttribute(): mixed
    {
        return $this->titulo;
    }

    public function getDescriptionAttribute(): mixed
    {
        return $this->descripcion;
    }

    public function getKindAttribute(): mixed
    {
        return $this->categoria;
    }

    public function getPriorityAttribute(): mixed
    {
        return $this->prioridad;
    }

    public function getStatusAttribute(): mixed
    {
        return $this->estado;
    }

    public function getDueOnAttribute(): mixed
    {
        return $this->fecha_limite;
    }

    public function getResponseNoteAttribute(): mixed
    {
        return $this->respuesta;
    }

    public function getEscalationReasonAttribute(): mixed
    {
        return $this->motivo_escalamiento;
    }

    public function getEscalatedAtAttribute(): mixed
    {
        return $this->fecha_escalamiento;
    }

    public function getResolvedAtAttribute(): mixed
    {
        return $this->fecha_atencion;
    }

    public function getClosedAtAttribute(): mixed
    {
        return $this->fecha_cierre;
    }

    public function getCreatedAtAttribute(): mixed
    {
        return $this->creado_en;
    }

    public function getUpdatedAtAttribute(): mixed
    {
        return $this->actualizado_en;
    }

    public function fromArea(): BelongsTo
    {
        return $this->belongsTo(InternalArea::class, 'area_origen');
    }

    public function toArea(): BelongsTo
    {
        return $this->belongsTo(InternalArea::class, 'area_destino');
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'solicitado_por');
    }

    public function relatedDocument(): BelongsTo
    {
        return $this->belongsTo(Document::class, 'documento_relacionado');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InternalOrderItem::class, 'id_pedido');
    }

    public function history(): HasMany
    {
        return $this->hasMany(InternalOrderHistory::class, 'id_pedido')->orderByDesc('modificado_en');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(InternalOrderAttachment::class, 'id_pedido')->orderByDesc('creado_en');
    }

    public function slaMetric(): HasOne
    {
        return $this->hasOne(\App\Domain\TechDesk\OrderSla::class, 'id_pedido');
    }

    public function getSlaStatusAttribute(): ?string
    {
        return $this->slaMetric?->estado_sla;
    }

    public function getSlaDeadlineAttribute(): ?string
    {
        return $this->slaMetric?->fecha_limite_sla?->toISOString();
    }
}
