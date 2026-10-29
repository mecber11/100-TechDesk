<?php

namespace App\Domain\Docs;

use App\Domain\Org\InternalArea;
use App\Domain\Sec\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Document extends Model
{
    protected $table = 'docs.documentos';

    protected $primaryKey = 'id_documento';

    public $timestamps = false;

    protected $guarded = [];

    protected $appends = [
        'document_id', 'code', 'title', 'doc_type_id', 'owner_area_id', 'status',
        'summary', 'body_text', 'file_url', 'current_version', 'effective_on',
        'expires_on', 'created_by_user_id', 'created_at', 'updated_at',
    ];

    protected $casts = [
        'vigente_desde' => 'date',
        'vigente_hasta' => 'date',
        'creado_en' => 'datetime',
        'actualizado_en' => 'datetime',
    ];

    public function getDocumentIdAttribute(): mixed
    {
        return $this->id_documento;
    }

    public function getCodeAttribute(): mixed
    {
        return $this->codigo;
    }

    public function getTitleAttribute(): mixed
    {
        return $this->titulo;
    }

    public function getDocTypeIdAttribute(): mixed
    {
        return $this->id_tipo_documento;
    }

    public function getOwnerAreaIdAttribute(): mixed
    {
        return $this->id_area_propietaria;
    }

    public function getStatusAttribute(): mixed
    {
        return $this->estado;
    }

    public function getSummaryAttribute(): mixed
    {
        return $this->resumen;
    }

    public function getBodyTextAttribute(): mixed
    {
        return $this->contenido;
    }

    public function getFileUrlAttribute(): mixed
    {
        if ($this->enlace_archivo && str_starts_with($this->enlace_archivo, 'documents/')) {
            return '/api/v1/documents/'.$this->id_documento.'/file';
        }
        return $this->enlace_archivo;
    }

    public function getCurrentVersionAttribute(): mixed
    {
        return $this->version_actual;
    }

    public function getEffectiveOnAttribute(): mixed
    {
        return $this->vigente_desde;
    }

    public function getExpiresOnAttribute(): mixed
    {
        return $this->vigente_hasta;
    }

    public function getCreatedByUserIdAttribute(): mixed
    {
        return $this->creado_por;
    }

    public function getCreatedAtAttribute(): mixed
    {
        return $this->creado_en;
    }

    public function getUpdatedAtAttribute(): mixed
    {
        return $this->actualizado_en;
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(DocType::class, 'id_tipo_documento');
    }

    public function ownerArea(): BelongsTo
    {
        return $this->belongsTo(InternalArea::class, 'id_area_propietaria');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(DocumentVersion::class, 'id_documento')->orderByDesc('numero_version');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creado_por');
    }
}
