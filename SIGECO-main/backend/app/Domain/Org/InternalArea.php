<?php

namespace App\Domain\Org;

use App\Domain\Docs\Document;
use App\Domain\Req\InternalOrder;
use App\Domain\Sec\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InternalArea extends Model
{
    protected $table = 'org.areas';

    protected $primaryKey = 'id_area';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = ['activa' => 'bool'];

    protected $appends = ['area_id', 'code', 'name', 'purpose', 'sort_order', 'is_active'];

    public function getAreaIdAttribute(): mixed
    {
        return $this->id_area;
    }

    public function getCodeAttribute(): mixed
    {
        return $this->codigo;
    }

    public function getNameAttribute(): mixed
    {
        return $this->nombre;
    }

    public function getPurposeAttribute(): mixed
    {
        return $this->finalidad;
    }

    public function getSortOrderAttribute(): mixed
    {
        return $this->orden;
    }

    public function getIsActiveAttribute(): mixed
    {
        return $this->activa;
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'org.miembros_area', 'id_area', 'id_usuario')
            ->withPivot('es_encargado');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class, 'id_area_propietaria');
    }

    public function outgoingOrders(): HasMany
    {
        return $this->hasMany(InternalOrder::class, 'area_origen');
    }

    public function incomingOrders(): HasMany
    {
        return $this->hasMany(InternalOrder::class, 'area_destino');
    }
}
