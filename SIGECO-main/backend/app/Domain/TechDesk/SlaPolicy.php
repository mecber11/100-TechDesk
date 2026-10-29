<?php

namespace App\Domain\TechDesk;

use Illuminate\Database\Eloquent\Model;

class SlaPolicy extends Model
{
    protected $table = 'ti.politicas_sla';

    protected $primaryKey = 'id_politica';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'tiempo_primera_respuesta_horas' => 'decimal:2',
        'tiempo_resolucion_horas' => 'decimal:2',
        'activo' => 'boolean',
        'creado_en' => 'datetime',
    ];

    protected $appends = [
        'policy_id',
    ];

    public function getPolicyIdAttribute(): int
    {
        return $this->id_politica;
    }
}
