<?php

namespace App\Domain\Req;

use App\Domain\Sec\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InternalOrderAttachment extends Model
{
    protected $table = 'req.adjuntos_pedido';

    protected $primaryKey = 'id_adjunto';

    public $timestamps = false;

    protected $guarded = [];

    protected $hidden = ['disco', 'ruta'];

    protected $appends = [
        'attachment_id', 'order_id', 'history_id', 'uploaded_by_user_id', 'source',
        'original_name', 'mime_type', 'size_bytes', 'external_url', 'created_at', 'download_url',
    ];

    protected $casts = [
        'tamano_bytes' => 'integer',
        'creado_en' => 'datetime',
    ];

    public function getAttachmentIdAttribute(): mixed
    {
        return $this->id_adjunto;
    }

    public function getOrderIdAttribute(): mixed
    {
        return $this->id_pedido;
    }

    public function getHistoryIdAttribute(): mixed
    {
        return $this->id_historial;
    }

    public function getUploadedByUserIdAttribute(): mixed
    {
        return $this->cargado_por;
    }

    public function getSourceAttribute(): mixed
    {
        return $this->origen_archivo;
    }

    public function getOriginalNameAttribute(): mixed
    {
        return $this->nombre_original;
    }

    public function getMimeTypeAttribute(): mixed
    {
        return $this->tipo_archivo;
    }

    public function getSizeBytesAttribute(): mixed
    {
        return $this->tamano_bytes;
    }

    public function getExternalUrlAttribute(): mixed
    {
        return $this->enlace_externo;
    }

    public function getCreatedAtAttribute(): mixed
    {
        return $this->creado_en;
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(InternalOrder::class, 'id_pedido');
    }

    public function history(): BelongsTo
    {
        return $this->belongsTo(InternalOrderHistory::class, 'id_historial');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cargado_por');
    }

    public function getDownloadUrlAttribute(): ?string
    {
        return $this->origen_archivo === 'upload'
            ? "/api/v1/internal-orders/attachments/{$this->id_adjunto}"
            : $this->enlace_externo;
    }
}
