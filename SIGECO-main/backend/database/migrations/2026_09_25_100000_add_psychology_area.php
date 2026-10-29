<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('org.areas')->updateOrInsert(
            ['codigo' => 'PSICO'],
            [
                'nombre' => 'Psicología',
                'finalidad' => 'Acompañamiento y bienestar de practicantes preprofesionales',
                'orden' => 7,
                'activa' => true,
            ]
        );

        foreach (['Encargado', 'Equipo'] as $level) {
            DB::table('sec.roles')->updateOrInsert(
                ['nombre' => 'Psicologia_'.$level],
                [
                    'descripcion' => $level.' de Psicología',
                    'es_sistema' => false,
                    'activo' => true,
                ]
            );
        }
    }

    public function down(): void
    {
        // Conservar el área, los roles y sus vínculos para no perder datos operativos.
    }
};
