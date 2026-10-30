<?php

namespace App\Domain\TechDesk;

use App\Domain\Sec\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssetImage extends Model
{
    protected $table = 'ti.imagenes_activo';

    protected $primaryKey = 'id_imagen';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'tamano_bytes' => 'integer',
        'creado_en' => 'datetime',
    ];

    protected $appends = [
        'image_id',
        'url',
    ];

    public function getImageIdAttribute(): int
    {
        return $this->id_imagen;
    }

    public function getUrlAttribute(): string
    {
        return url("/api/v1/techdesk/asset-images/{$this->id_imagen}/file");
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creado_por');
    }

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class, 'id_imagen');
    }
}

