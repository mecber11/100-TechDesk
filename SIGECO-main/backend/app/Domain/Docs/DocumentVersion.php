<?php

namespace App\Domain\Docs;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentVersion extends Model
{
    protected $table = 'docs.versiones_documento';

    protected $primaryKey = 'id_version';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = ['creado_en' => 'datetime'];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class, 'id_documento');
    }
}
