<?php

namespace App\Domain\TechDesk;

use App\Domain\Req\Order;
use App\Domain\Sec\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TechDeskNotification extends Model
{
    protected $table = 'ti.notificaciones_techdesk';

    protected $primaryKey = 'id_notificacion';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'leido' => 'boolean',
        'creado_en' => 'datetime',
        'actualizado_en' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'id_pedido');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'destinatario_id');
    }
}

