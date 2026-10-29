<?php

namespace Database\Seeders;

use App\Common\Support\AreaAccess;
use App\Domain\Org\InternalArea;
use App\Domain\Sec\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolesAndAreasSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['Administrador_Empresa' => 'Administrador operativo de la empresa', 'Plataforma_Admin' => 'Superadministrador de plataforma: configuración de módulos'] as $name => $description) {
            Role::query()->firstOrCreate(['nombre' => $name], ['descripcion' => $description, 'es_sistema' => true, 'activo' => true]);
        }
        Role::query()->firstOrCreate(['nombre' => 'Super_Admin'], [
            'descripcion' => 'Superadministrador del sistema',
            'es_sistema' => true,
            'activo' => true,
        ]);

        $order = 0;
        foreach (AreaAccess::AREA_DEFINITIONS as $code => $definition) {
            $order++;
            InternalArea::query()->updateOrCreate(['codigo' => $code], [
                'nombre' => $definition['name'],
                'finalidad' => 'Operación y coordinación del área de '.$definition['name'],
                'orden' => $order,
                'activa' => true,
            ]);
            foreach (['Encargado', 'Equipo'] as $level) {
                $name = $definition['role'].'_'.$level;
                Role::query()->firstOrCreate(['nombre' => $name], [
                    'descripcion' => $level.' de '.$definition['name'],
                    'es_sistema' => false,
                    'activo' => true,
                ]);
            }
        }

        InternalArea::query()->updateOrCreate(['codigo' => 'SUPER'], [
            'nombre' => 'Administrador de empresa',
            'finalidad' => 'Escalamiento excepcional desde TI al administrador de empresa',
            'orden' => 99,
            'activa' => false,
        ]);

        DB::table('docs.tipos_documento')->upsert([
            ['codigo' => 'POL', 'nombre' => 'Política'],
            ['codigo' => 'PRO', 'nombre' => 'Procedimiento'],
            ['codigo' => 'INS', 'nombre' => 'Instructivo'],
            ['codigo' => 'REG', 'nombre' => 'Registro'],
            ['codigo' => 'MAN', 'nombre' => 'Manual'],
            ['codigo' => 'FOR', 'nombre' => 'Formato'],
        ], ['codigo'], ['nombre']);
    }
}
