<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('sec.roles')->insertOrIgnore([
            ['nombre' => 'Plataforma_Admin', 'descripcion' => 'Superadministrador de plataforma: configuración de módulos', 'es_sistema' => true, 'activo' => true],
            ['nombre' => 'Administrador_Empresa', 'descripcion' => 'Administrador operativo de la empresa', 'es_sistema' => true, 'activo' => true],
        ]);
        // Los roles históricos conservan sus asignaciones y permisos operativos.
        DB::table('sec.roles')->whereIn('nombre', ['Super_Admin', 'SuperAdmin'])
            ->update(['descripcion' => 'Administrador de empresa (rol histórico compatible)']);
        $companyRole = DB::table('sec.roles')->where('nombre', 'Administrador_Empresa')->value('id_rol');
        $legacyRoleIds = DB::table('sec.roles')->whereIn('nombre', ['Super_Admin', 'SuperAdmin'])->pluck('id_rol');
        foreach (DB::table('sec.usuarios_roles')->whereIn('id_rol', $legacyRoleIds)->pluck('id_usuario')->unique() as $userId) {
            DB::table('sec.usuarios_roles')->insertOrIgnore(['id_usuario' => $userId, 'id_rol' => $companyRole]);
        }
        DB::table('org.areas')->where('codigo', 'SUPER')->update(['nombre' => 'Administrador de empresa']);

        Schema::create('cfg.configuracion_empresa', function (Blueprint $table) {
            $table->smallInteger('id')->primary();
            $table->string('nombre_empresa', 160)->default('100% Ingenieros');
            $table->boolean('ia_habilitada')->default(true);
            $table->boolean('documentos_habilitados')->default(true);
            $table->boolean('slack_habilitado')->default(true);
            $table->timestamp('actualizado_en')->nullable();
        });
        DB::statement('ALTER TABLE cfg.configuracion_empresa ADD CONSTRAINT configuracion_empresa_unica CHECK (id = 1)');
        DB::table('cfg.configuracion_empresa')->insert(['id' => 1]);

        Schema::create('cfg.historial_configuracion', function (Blueprint $table) {
            $table->bigIncrements('id_cambio');
            $table->integer('id_usuario')->nullable();
            $table->foreign('id_usuario')->references('id_usuario')->on('sec.usuarios')->nullOnDelete();
            $table->jsonb('antes');
            $table->jsonb('despues');
            $table->timestamp('creado_en')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cfg.historial_configuracion');
        Schema::dropIfExists('cfg.configuracion_empresa');
        // No borrar roles ni asignaciones creadas después de la migración.
    }
};
