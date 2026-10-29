<?php

namespace App\Domain\Docs;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocType extends Model
{
    protected $table = 'docs.tipos_documento';

    protected $primaryKey = 'id_tipo_documento';

    public $timestamps = false;

    protected $guarded = [];

    protected $appends = ['doc_type_id', 'code', 'name'];

    public function getDocTypeIdAttribute(): mixed
    {
        return $this->id_tipo_documento;
    }

    public function getCodeAttribute(): mixed
    {
        return $this->codigo;
    }

    public function getNameAttribute(): mixed
    {
        return $this->nombre;
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class, 'id_tipo_documento');
    }
}
