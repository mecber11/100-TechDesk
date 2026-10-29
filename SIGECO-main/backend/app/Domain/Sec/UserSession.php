<?php

namespace App\Domain\Sec;

use Illuminate\Database\Eloquent\Model;

class UserSession extends Model
{
    protected $table = 'sec.sesiones_usuario';

    protected $primaryKey = 'id_sesion';

    public $timestamps = false;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected $casts = [
        'inicio' => 'datetime',
        'fin' => 'datetime',
    ];
}
