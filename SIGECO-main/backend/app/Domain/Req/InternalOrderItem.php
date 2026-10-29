<?php

namespace App\Domain\Req;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InternalOrderItem extends Model
{
    protected $table = 'req.detalles_pedido';

    protected $primaryKey = 'id_detalle';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = ['cantidad' => 'float'];

    protected $appends = ['item_id', 'order_id', 'description', 'quantity', 'unit', 'notes'];

    public function getItemIdAttribute(): mixed
    {
        return $this->id_detalle;
    }

    public function getOrderIdAttribute(): mixed
    {
        return $this->id_pedido;
    }

    public function getDescriptionAttribute(): mixed
    {
        return $this->descripcion;
    }

    public function getQuantityAttribute(): mixed
    {
        return $this->cantidad;
    }

    public function getUnitAttribute(): mixed
    {
        return $this->unidad;
    }

    public function getNotesAttribute(): mixed
    {
        return $this->notas;
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(InternalOrder::class, 'id_pedido');
    }
}
