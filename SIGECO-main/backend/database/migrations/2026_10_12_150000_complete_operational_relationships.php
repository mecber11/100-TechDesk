<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $references = [
        ['req.avisos_slack', 'id_area_destino', 'org.areas', 'id_area', 'avisos_slack_area_destino_fk', 'RESTRICT'],
        ['req.pedidos', 'documento_relacionado', 'docs.documentos', 'id_documento', 'pedidos_documento_fk', 'SET NULL'],
        ['req.pedidos', 'atendido_por', 'sec.usuarios', 'id_usuario', 'pedidos_atendido_por_fk', 'SET NULL'],
        ['sec.usuarios', 'creado_por', 'sec.usuarios', 'id_usuario', 'usuarios_creado_por_fk', 'SET NULL'],
    ];

    public function up(): void
    {
        // No corregir referencias huérfanas borrando o modificando datos de negocio.
        foreach ($this->references as [$table, $column, $parent, $key]) {
            $orphans = DB::selectOne("SELECT count(*) AS total FROM {$table} c LEFT JOIN {$parent} p ON p.{$key} = c.{$column} WHERE c.{$column} IS NOT NULL AND p.{$key} IS NULL");
            if ($orphans->total > 0) throw new RuntimeException("Hay referencias huérfanas en {$table}.{$column}; deben revisarse antes de migrar.");
        }
        DB::statement('ALTER TABLE req.pedidos ALTER COLUMN documento_relacionado TYPE bigint');
        foreach ($this->references as [$table, $column, $parent, $key, $name, $delete]) {
            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$name} FOREIGN KEY ({$column}) REFERENCES {$parent}({$key}) ON DELETE {$delete}");
        }
        Schema::table('cfg.historial_configuracion', function (Blueprint $table) {
            $table->smallInteger('id_configuracion')->default(1);
            $table->foreign('id_configuracion', 'historial_configuracion_empresa_fk')->references('id')->on('cfg.configuracion_empresa')->restrictOnDelete();
        });
        Schema::table('sec.intentos_login', function (Blueprint $table) {
            $table->integer('id_usuario')->nullable();
            $table->foreign('id_usuario', 'intentos_login_usuario_fk')->references('id_usuario')->on('sec.usuarios')->nullOnDelete();
        });
        DB::statement('UPDATE sec.intentos_login i SET id_usuario = u.id_usuario FROM sec.usuarios u WHERE i.correo = u.correo');
    }

    public function down(): void
    {
        Schema::table('sec.intentos_login', function (Blueprint $table) {
            $table->dropForeign('intentos_login_usuario_fk');
            $table->dropColumn('id_usuario');
        });
        Schema::table('cfg.historial_configuracion', function (Blueprint $table) {
            $table->dropForeign('historial_configuracion_empresa_fk');
            $table->dropColumn('id_configuracion');
        });
        foreach ($this->references as [$table, $column, $parent, $key, $name]) {
            DB::statement("ALTER TABLE {$table} DROP CONSTRAINT {$name}");
        }
        // Conservar bigint evita pérdida de rango en documentos vinculados.
    }
};
