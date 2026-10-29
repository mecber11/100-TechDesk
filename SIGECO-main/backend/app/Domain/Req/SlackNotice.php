<?php

namespace App\Domain\Req;

use Illuminate\Database\Eloquent\Model;

class SlackNotice extends Model
{
    protected $table = 'req.avisos_slack';
    protected $primaryKey = 'id_aviso';
    public $timestamps = false;
    protected $guarded = [];
    protected $casts = ['reintentar_en' => 'datetime', 'enviado_en' => 'datetime'];
}
