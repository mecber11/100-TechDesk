<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Crear esquema ti si no existe
        DB::statement('CREATE SCHEMA IF NOT EXISTS ti;');

        // 2. Tabla de Activos de TI (Hardware e insumos tecnológicos)
        Schema::create('ti.activos', function (Blueprint $table) {
            $table->bigIncrements('id_activo');
            $table->string('codigo_patrimonial', 50)->unique();
            $table->string('numero_serie', 100)->nullable();
            $table->string('nombre', 180);
            $table->string('tipo', 50); // Laptop, Desktop, Monitor, Periférico, Accesorio de Red, Servidor, Impresora, Otro
            $table->string('marca', 80);
            $table->string('modelo', 100);
            $table->jsonb('especificaciones')->nullable();
            $table->string('estado', 30)->default('Disponible'); // Disponible, Asignado, Mantenimiento, Baja
            $table->string('condicion_fisica', 30)->default('Bueno'); // Nuevo, Bueno, Regular, Malo
            $table->string('ubicacion', 150)->default('Almacén TI');
            $table->date('fecha_adquisicion')->nullable();
            $table->decimal('costo_adquisicion', 12, 2)->nullable();
            $table->integer('vida_util_meses')->default(36);
            $table->text('notas')->nullable();
            $table->integer('creado_por')->nullable();
            $table->timestampTz('creado_en')->useCurrent();
            $table->timestampTz('actualizado_en')->useCurrent();

            $table->foreign('creado_por', 'activos_creado_por_fk')
                ->references('id_usuario')->on('sec.usuarios')
                ->nullOnDelete();
        });

        // 3. Tabla de Asignaciones y Trazabilidad de Hardware (Préstamos y Devoluciones)
        Schema::create('ti.asignaciones_activo', function (Blueprint $table) {
            $table->bigIncrements('id_asignacion');
            $table->unsignedBigInteger('id_activo');
            $table->integer('id_usuario_asignado');
            $table->unsignedBigInteger('id_area_destino')->nullable();
            $table->unsignedBigInteger('id_pedido')->nullable(); // Enlace con ticket de solicitudes si corresponde
            $table->integer('asignado_por')->nullable();
            $table->timestampTz('fecha_asignacion')->useCurrent();
            $table->date('fecha_devolucion_estimada')->nullable();
            $table->timestampTz('fecha_devolucion_real')->nullable();
            $table->string('estado', 30)->default('Activo'); // Activo, Devuelto, Extraviado
            $table->string('condicion_entrega', 100)->default('Operativo');
            $table->string('condicion_devolucion', 100)->nullable();
            $table->text('observaciones_entrega')->nullable();
            $table->text('observaciones_devolucion')->nullable();
            $table->integer('recibido_por')->nullable();
            $table->timestampTz('creado_en')->useCurrent();
            $table->timestampTz('actualizado_en')->useCurrent();

            $table->foreign('id_activo', 'asignaciones_activo_fk')
                ->references('id_activo')->on('ti.activos')
                ->restrictOnDelete();

            $table->foreign('id_usuario_asignado', 'asignaciones_usuario_fk')
                ->references('id_usuario')->on('sec.usuarios')
                ->restrictOnDelete();

            $table->foreign('id_area_destino', 'asignaciones_area_fk')
                ->references('id_area')->on('org.areas')
                ->nullOnDelete();

            $table->foreign('id_pedido', 'asignaciones_pedido_fk')
                ->references('id_pedido')->on('req.pedidos')
                ->nullOnDelete();

            $table->foreign('asignado_por', 'asignaciones_asignado_por_fk')
                ->references('id_usuario')->on('sec.usuarios')
                ->nullOnDelete();

            $table->foreign('recibido_por', 'asignaciones_recibido_por_fk')
                ->references('id_usuario')->on('sec.usuarios')
                ->nullOnDelete();
        });

        // 4. Tabla de Mantenimientos Preventivos y Correctivos (Historial Técnico por Equipo)
        Schema::create('ti.mantenimientos_activo', function (Blueprint $table) {
            $table->bigIncrements('id_mantenimiento');
            $table->unsignedBigInteger('id_activo');
            $table->string('tipo_mantenimiento', 30); // Preventivo, Correctivo
            $table->string('titulo', 200);
            $table->text('descripcion_falla')->nullable();
            $table->text('diagnostico_solucion')->nullable();
            $table->text('piezas_reemplazadas')->nullable();
            $table->decimal('costo', 10, 2)->default(0.00);
            $table->string('tecnico_responsable', 150);
            $table->integer('realizado_por')->nullable();
            $table->string('estado', 30)->default('Programado'); // Programado, EnProceso, Completado, Cancelado
            $table->date('fecha_programada');
            $table->timestampTz('fecha_ejecucion')->nullable();
            $table->date('proximo_mantenimiento_sugerido')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestampTz('creado_en')->useCurrent();
            $table->timestampTz('actualizado_en')->useCurrent();

            $table->foreign('id_activo', 'mantenimientos_activo_fk')
                ->references('id_activo')->on('ti.activos')
                ->cascadeOnDelete();

            $table->foreign('realizado_por', 'mantenimientos_realizado_por_fk')
                ->references('id_usuario')->on('sec.usuarios')
                ->nullOnDelete();
        });

        // 5. Tabla de Políticas de SLA (Acuerdos de Nivel de Servicio)
        Schema::create('ti.politicas_sla', function (Blueprint $table) {
            $table->increments('id_politica');
            $table->string('nombre', 100);
            $table->string('categoria', 50)->nullable(); // Hardware, Software, Red, Soporte, o null (Aplica a todos)
            $table->string('prioridad', 30); // Urgente, Alta, Media, Baja
            $table->decimal('tiempo_primera_respuesta_horas', 6, 2)->default(2.00);
            $table->decimal('tiempo_resolucion_horas', 6, 2)->default(24.00);
            $table->boolean('activo')->default(true);
            $table->text('descripcion')->nullable();
            $table->timestampTz('creado_en')->useCurrent();
        });

        // 6. Tabla de Métricas y Temporizadores SLA por Solicitud
        Schema::create('ti.metricas_sla_pedido', function (Blueprint $table) {
            $table->bigIncrements('id_metrica');
            $table->unsignedBigInteger('id_pedido')->unique();
            $table->unsignedInteger('id_politica')->nullable();
            $table->integer('tiempo_primera_respuesta_minutos')->nullable();
            $table->integer('tiempo_resolucion_minutos')->nullable();
            $table->timestampTz('fecha_limite_sla');
            $table->boolean('cumplio_sla')->nullable();
            $table->string('estado_sla', 30)->default('EnTiempo'); // EnTiempo, EnRiesgo, Vencido, Cumplido, Incumplido
            $table->boolean('alerta_enviada')->default(false);
            $table->timestampTz('calculado_en')->useCurrent();
            $table->timestampTz('actualizado_en')->useCurrent();

            $table->foreign('id_pedido', 'metricas_sla_pedido_fk')
                ->references('id_pedido')->on('req.pedidos')
                ->cascadeOnDelete();

            $table->foreign('id_politica', 'metricas_sla_politica_fk')
                ->references('id_politica')->on('ti.politicas_sla')
                ->nullOnDelete();
        });

        // 7. Insertar políticas iniciales de SLA según estándar corporativo
        DB::table('ti.politicas_sla')->insert([
            [
                'nombre' => 'SLA Urgente - Fallas Críticas y Bloqueantes',
                'categoria' => null,
                'prioridad' => 'Urgente',
                'tiempo_primera_respuesta_horas' => 1.00,
                'tiempo_resolucion_horas' => 4.00,
                'activo' => true,
                'descripcion' => 'Aplica a incidentes de máxima prioridad que interrumpen la operación de una o más áreas.',
                'creado_en' => now(),
            ],
            [
                'nombre' => 'SLA Alta - Solicitudes y Reemplazos de Hardware',
                'categoria' => null,
                'prioridad' => 'Alta',
                'tiempo_primera_respuesta_horas' => 2.00,
                'tiempo_resolucion_horas' => 12.00,
                'activo' => true,
                'descripcion' => 'Aplica a solicitudes de hardware prioritarias o soporte especializado con impacto operativo medio-alto.',
                'creado_en' => now(),
            ],
            [
                'nombre' => 'SLA Media - Soporte General y Préstamos Estándar',
                'categoria' => null,
                'prioridad' => 'Media',
                'tiempo_primera_respuesta_horas' => 4.00,
                'tiempo_resolucion_horas' => 24.00,
                'activo' => true,
                'descripcion' => 'Atención de soporte cotidiano, mantenimiento programado y entrega rutinaria de insumos.',
                'creado_en' => now(),
            ],
            [
                'nombre' => 'SLA Baja - Consultas y Tareas Menores',
                'categoria' => null,
                'prioridad' => 'Baja',
                'tiempo_primera_respuesta_horas' => 8.00,
                'tiempo_resolucion_horas' => 48.00,
                'activo' => true,
                'descripcion' => 'Requerimientos informativos, mejoras no urgentes y actividades sin premura de tiempo.',
                'creado_en' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('ti.metricas_sla_pedido');
        Schema::dropIfExists('ti.politicas_sla');
        Schema::dropIfExists('ti.mantenimientos_activo');
        Schema::dropIfExists('ti.asignaciones_activo');
        Schema::dropIfExists('ti.activos');
        DB::statement('DROP SCHEMA IF EXISTS ti CASCADE;');
    }
};
