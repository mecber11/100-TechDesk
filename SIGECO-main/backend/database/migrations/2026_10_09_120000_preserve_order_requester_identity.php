<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('req.pedidos', function (Blueprint $table) {
            $table->text('nombre_solicitante')->nullable();
            $table->text('correo_solicitante')->nullable();
        });
        DB::statement('UPDATE req.pedidos AS p SET nombre_solicitante = u.nombre_completo,
            correo_solicitante = u.correo FROM sec.usuarios AS u WHERE u.id_usuario = p.solicitado_por');
    }

    public function down(): void
    {
        Schema::table('req.pedidos', function (Blueprint $table) {
            $table->dropColumn(['nombre_solicitante', 'correo_solicitante']);
        });
    }
};
