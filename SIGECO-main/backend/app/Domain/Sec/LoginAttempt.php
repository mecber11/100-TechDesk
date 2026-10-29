<?php

namespace App\Domain\Sec;

use Illuminate\Database\Eloquent\Model;

class LoginAttempt extends Model
{
    protected $table = 'sec.intentos_login';

    protected $primaryKey = 'id_intento';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'exitoso' => 'bool',
        'realizado_en' => 'datetime',
    ];
}
