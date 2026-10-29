<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sec.usuarios', function (Blueprint $table) {
            $table->string('slack_user_id', 30)->nullable()->unique();
        });
        Schema::create('req.avisos_slack', function (Blueprint $table) {
            $table->bigIncrements('id_aviso');
            $table->foreignId('id_pedido')->constrained('req.pedidos', 'id_pedido')->cascadeOnDelete();
            $table->unsignedBigInteger('id_area_destino');
            $table->string('evento', 40);
            $table->string('estado', 20)->default('pendiente');
            $table->string('slack_destinatario', 30)->nullable();
            $table->string('error', 250)->nullable();
            $table->integer('intentos')->default(0);
            $table->timestamp('reintentar_en')->nullable();
            $table->timestamp('bloqueado_hasta')->nullable();
            $table->timestamp('enviado_en')->nullable();
            $table->timestamp('creado_en')->useCurrent();
            $table->unique(['id_pedido', 'evento']);
            $table->index(['estado', 'reintentar_en']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('req.avisos_slack');
        Schema::table('sec.usuarios', fn (Blueprint $table) => $table->dropColumn('slack_user_id'));
    }
};
