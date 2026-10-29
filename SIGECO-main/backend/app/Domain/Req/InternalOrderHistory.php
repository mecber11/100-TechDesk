<?php

namespace App\Domain\Req;

use App\Domain\Sec\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InternalOrderHistory extends Model
{
    protected $table = 'req.historial_pedido';

    protected $primaryKey = 'id_historial';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = ['modificado_en' => 'datetime'];

    protected $appends = ['history_id', 'order_id', 'from_status', 'to_status', 'status', 'note', 'changed_at'];

    public function getHistoryIdAttribute(): mixed
    {
        return $this->id_historial;
    }

    public function getOrderIdAttribute(): mixed
    {
        return $this->id_pedido;
    }

    public function getFromStatusAttribute(): mixed
    {
        return $this->estado_anterior;
    }

    public function getToStatusAttribute(): mixed
    {
        return $this->estado_nuevo;
    }

    public function getStatusAttribute(): mixed
    {
        return $this->estado;
    }

    public function getNoteAttribute(): mixed
    {
        return $this->observacion;
    }

    public function getChangedAtAttribute(): mixed
    {
        return $this->modificado_en;
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'modificado_por');
    }
}
