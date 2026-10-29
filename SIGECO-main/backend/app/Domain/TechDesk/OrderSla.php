<?php

namespace App\Domain\TechDesk;

use App\Domain\Req\InternalOrder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderSla extends Model
{
    protected $table = 'ti.metricas_sla_pedido';

    protected $primaryKey = 'id_metrica';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'tiempo_primera_respuesta_minutos' => 'integer',
        'tiempo_resolucion_minutos' => 'integer',
        'fecha_limite_sla' => 'datetime',
        'cumplio_sla' => 'boolean',
        'alerta_enviada' => 'boolean',
        'calculado_en' => 'datetime',
        'actualizado_en' => 'datetime',
    ];

    protected $appends = [
        'metric_id',
        'status_sla',
        'is_breached',
    ];

    public function getMetricIdAttribute(): int
    {
        return $this->id_metrica;
    }

    public function getStatusSlaAttribute(): string
    {
        return $this->estado_sla;
    }

    public function getIsBreachedAttribute(): bool
    {
        return $this->estado_sla === 'Vencido' || $this->cumplio_sla === false;
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(InternalOrder::class, 'id_pedido');
    }

    public function policy(): BelongsTo
    {
        return $this->belongsTo(SlaPolicy::class, 'id_politica');
    }
}
