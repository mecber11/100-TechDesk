<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabla de Imágenes de Activos (reutilizables entre activos idénticos)
        if (! Schema::hasTable('ti.imagenes_activo')) {
            Schema::create('ti.imagenes_activo', function (Blueprint $table) {
                $table->bigIncrements('id_imagen');
                $table->string('ruta', 255);
                $table->string('mime', 100)->default('image/jpeg');
                $table->unsignedBigInteger('tamano_bytes')->default(0);
                $table->string('hash_sha256', 64)->nullable()->index();
                $table->string('nombre_original', 255)->nullable();
                $table->integer('creado_por')->nullable();
                $table->timestampTz('creado_en')->useCurrent();

                $table->foreign('creado_por', 'imagenes_creado_por_fk')
                    ->references('id_usuario')->on('sec.usuarios')
                    ->nullOnDelete();
            });
        }

        // 2. Nuevos campos de identificación individual y referencia de imagen en ti.activos
        Schema::table('ti.activos', function (Blueprint $table) {
            if (! Schema::hasColumn('ti.activos', 'id_imagen')) {
                $table->unsignedBigInteger('id_imagen')->nullable()->after('modelo');
                $table->foreign('id_imagen', 'activos_imagen_fk')
                    ->references('id_imagen')->on('ti.imagenes_activo')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('ti.activos', 'tipo_identificador_externo')) {
                $table->string('tipo_identificador_externo', 50)->default('Serie')->after('numero_serie');
            }

            if (! Schema::hasColumn('ti.activos', 'identificador_alternativo')) {
                $table->string('identificador_alternativo', 100)->nullable()->after('tipo_identificador_externo');
            }

            if (! Schema::hasColumn('ti.activos', 'emisor_identificador_externo')) {
                $table->string('emisor_identificador_externo', 100)->nullable()->after('identificador_alternativo');
            }

            if (! Schema::hasColumn('ti.activos', 'identificador_normalizado')) {
                $table->string('identificador_normalizado', 120)->nullable()->after('emisor_identificador_externo');
                $table->index(['tipo_identificador_externo', 'emisor_identificador_externo', 'identificador_normalizado'], 'activos_identificador_externo_idx');
            }
        });

        // 3. Área solicitante e índices de consulta en ti.asignaciones_activo
        Schema::table('ti.asignaciones_activo', function (Blueprint $table) {
            if (! Schema::hasColumn('ti.asignaciones_activo', 'id_area_solicitante')) {
                $table->unsignedBigInteger('id_area_solicitante')->nullable()->after('id_area_destino');
                $table->foreign('id_area_solicitante', 'asignaciones_area_solicitante_fk')
                    ->references('id_area')->on('org.areas')
                    ->nullOnDelete();
            }

            // Permitir horas exactas en fecha_devolucion_estimada para préstamos por horas
            DB::statement('ALTER TABLE ti.asignaciones_activo ALTER COLUMN fecha_devolucion_estimada TYPE timestamp with time zone USING fecha_devolucion_estimada::timestamp with time zone');

            // Índices para optimizar filtros combinados
            $table->index('fecha_asignacion', 'asignaciones_fecha_asignacion_idx');
            $table->index('fecha_devolucion_estimada', 'asignaciones_fecha_dev_est_idx');
            $table->index('fecha_devolucion_real', 'asignaciones_fecha_dev_real_idx');
            $table->index('estado', 'asignaciones_estado_idx');
        });

        // 4. Tabla de Notificaciones Internas de TechDesk (Bandeja SLA y Mantenimiento)
        if (! Schema::hasTable('ti.notificaciones_techdesk')) {
            Schema::create('ti.notificaciones_techdesk', function (Blueprint $table) {
                $table->bigIncrements('id_notificacion');
                $table->unsignedBigInteger('id_pedido')->nullable();
                $table->string('tipo', 50); // sla_riesgo, sla_vencido, mantenimiento, info
                $table->string('titulo', 200);
                $table->text('mensaje');
                $table->integer('destinatario_id')->nullable();
                $table->boolean('leido')->default(false);
                $table->timestampTz('creado_en')->useCurrent();
                $table->timestampTz('actualizado_en')->useCurrent();

                $table->foreign('id_pedido', 'notificaciones_pedido_fk')
                    ->references('id_pedido')->on('req.pedidos')
                    ->nullOnDelete();

                $table->foreign('destinatario_id', 'notificaciones_destinatario_fk')
                    ->references('id_usuario')->on('sec.usuarios')
                    ->nullOnDelete();

                $table->index(['destinatario_id', 'leido'], 'notificaciones_destinatario_leido_idx');
            });
        }

        // Restricción única condicional en PostgreSQL para evitar dos préstamos activos del mismo equipo
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS asignaciones_un_prestamo_activo_idx ON ti.asignaciones_activo (id_activo) WHERE estado = \'Activo\';');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS activos_ident_externo_unique_idx ON ti.activos (tipo_identificador_externo, emisor_identificador_externo, identificador_normalizado) WHERE identificador_normalizado IS NOT NULL;');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS notificaciones_pedido_tipo_unique_idx ON ti.notificaciones_techdesk (id_pedido, tipo) WHERE id_pedido IS NOT NULL;');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS ti.notificaciones_pedido_tipo_unique_idx;');
            DB::statement('DROP INDEX IF EXISTS ti.activos_ident_externo_unique_idx;');
            DB::statement('DROP INDEX IF EXISTS ti.asignaciones_un_prestamo_activo_idx;');
        }

        Schema::dropIfExists('ti.notificaciones_techdesk');

        Schema::table('ti.asignaciones_activo', function (Blueprint $table) {
            $table->dropIndex('asignaciones_fecha_asignacion_idx');
            $table->dropIndex('asignaciones_fecha_dev_est_idx');
            $table->dropIndex('asignaciones_fecha_dev_real_idx');
            $table->dropIndex('asignaciones_estado_idx');

            if (Schema::hasColumn('ti.asignaciones_activo', 'id_area_solicitante')) {
                $table->dropForeign('asignaciones_area_solicitante_fk');
                $table->dropColumn('id_area_solicitante');
            }
        });

        Schema::table('ti.activos', function (Blueprint $table) {
            $table->dropIndex('activos_identificador_externo_idx');
            if (Schema::hasColumn('ti.activos', 'id_imagen')) {
                $table->dropForeign('activos_imagen_fk');
                $table->dropColumn('id_imagen');
            }
            if (Schema::hasColumn('ti.activos', 'identificador_normalizado')) {
                $table->dropColumn('identificador_normalizado');
            }
            if (Schema::hasColumn('ti.activos', 'emisor_identificador_externo')) {
                $table->dropColumn('emisor_identificador_externo');
            }
            if (Schema::hasColumn('ti.activos', 'identificador_alternativo')) {
                $table->dropColumn('identificador_alternativo');
            }
            if (Schema::hasColumn('ti.activos', 'tipo_identificador_externo')) {
                $table->dropColumn('tipo_identificador_externo');
            }
        });

        Schema::dropIfExists('ti.imagenes_activo');
    }
};

