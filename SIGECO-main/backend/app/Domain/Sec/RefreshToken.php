<?php

namespace App\Domain\Sec;

use Illuminate\Database\Eloquent\Model;

class RefreshToken extends Model
{
    protected $table = 'sec.tokens_acceso';

    protected $primaryKey = 'id_token';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'expira_en' => 'datetime',
        'revocado_en' => 'datetime',
        'creado_en' => 'datetime',
    ];
}
