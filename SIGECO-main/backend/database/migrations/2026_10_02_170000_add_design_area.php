<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('org.areas')->updateOrInsert(
            ['codigo' => 'DIS'],
            [
                'nombre' => 'Diseño',
                'finalidad' => 'Creación de imágenes, diseño de imágenes, modificación de imágenes, portadas, fotos del curso y material gráfico',
                'orden' => 8,
                'activa' => true,
            ]
        );

        foreach (['Encargado', 'Equipo'] as $level) {
            DB::table('sec.roles')->updateOrInsert(
                ['nombre' => 'Diseno_'.$level],
                [
                    'descripcion' => $level.' de Diseño',
                    'es_sistema' => false,
                    'activo' => true,
                ]
            );
        }

        // Crear rol base 'Diseno' si no existe
        DB::table('sec.roles')->updateOrInsert(
            ['nombre' => 'Diseno'],
            [
                'descripcion' => 'Rol operativo de Diseño',
                'es_sistema' => false,
                'activo' => true,
            ]
        );

        // Crear el usuario Encargado de Diseño si aún no existe
        $area = DB::table('org.areas')->where('codigo', 'DIS')->first();
        $role = DB::table('sec.roles')->where('nombre', 'Diseno_Encargado')->first();

        if ($area && $role) {
            $user = DB::table('sec.usuarios')->where('correo', 'diseno@ingenieros.edu.pe')->first();
            if (! $user) {
                // Reutilizamos el hash estándar o generamos uno seguro
                $passwordHash = '$2y$10$dw1XKq5k9mY9dP2W5ZfLye70xgGK.2EI4J6taSFTutx8vpnxWplPK';
                $userId = DB::table('sec.usuarios')->insertGetId([
                    'nombre_completo' => 'Encargado de Diseño',
                    'correo' => 'diseno@ingenieros.edu.pe',
                    'contrasena' => $passwordHash,
                    'estado' => 'approved',
                    'area_solicitada' => 'DIS',
                    'id_area' => $area->id_area,
                    'activo' => true,
                    'cambiar_contrasena' => false,
                    'creado_en' => now(),
                ], 'id_usuario');

                DB::table('sec.usuarios_roles')->updateOrInsert(
                    ['id_usuario' => $userId, 'id_rol' => $role->id_rol],
                    ['asignado_en' => now()]
                );

                DB::table('org.miembros_area')->updateOrInsert(
                    ['id_area' => $area->id_area, 'id_usuario' => $userId],
                    ['es_encargado' => true, 'ingresado_en' => now()]
                );
            }
        }
    }

    public function down(): void
    {
        // Conservar el área, los roles y sus vínculos para no perder datos operativos.
    }
};
