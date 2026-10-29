<?php

namespace Database\Seeders;

use App\Domain\Org\InternalArea;
use App\Domain\Sec\Role;
use App\Domain\Sec\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RolesAndAreasSeeder::class);

        $seedPassword = (string) env('SIGECO_SEED_PASSWORD', '');
        if ($seedPassword === '') {
            $this->command?->info('Usuarios de demostración omitidos. Define SIGECO_SEED_PASSWORD solo en un entorno controlado.');

            return;
        }
        if (mb_strlen($seedPassword) < 8) {
            throw new \RuntimeException('SIGECO_SEED_PASSWORD debe tener al menos 8 caracteres.');
        }

        $accounts = [
            ['role' => 'Administrador_Empresa', 'email' => 'admin@ingenieros.edu.pe', 'area' => null],
            ['role' => 'Ventas_Encargado', 'email' => 'ventas@ingenieros.edu.pe', 'area' => 'VENTAS'],
            ['role' => 'Marketing_Encargado', 'email' => 'marketing@ingenieros.edu.pe', 'area' => 'MKT'],
            ['role' => 'TI_Encargado', 'email' => 'ti@ingenieros.edu.pe', 'area' => 'TI'],
            ['role' => 'Administracion_Encargado', 'email' => 'admin_area@ingenieros.edu.pe', 'area' => 'ADM'],
            ['role' => 'Recursos_Humanos_Encargado', 'email' => 'rrhh@ingenieros.edu.pe', 'area' => 'RRHH'],
            ['role' => 'Contabilidad_Encargado', 'email' => 'contabilidad@ingenieros.edu.pe', 'area' => 'CONT'],
            ['role' => 'Psicologia_Encargado', 'email' => 'psicologia@ingenieros.edu.pe', 'area' => 'PSICO'],
            ['role' => 'Diseno_Encargado', 'email' => 'diseno@ingenieros.edu.pe', 'area' => 'DIS'],
        ];

        foreach ($accounts as $account) {
            $area = $account['area'] ? InternalArea::query()->where('codigo', $account['area'])->first() : null;
            $user = User::query()->firstOrCreate(['correo' => $account['email']], [
                'nombre_completo' => $account['area']
                    ? 'Encargado de '.$area?->nombre
                    : 'Administrador de empresa',
                'contrasena' => password_hash($seedPassword, PASSWORD_DEFAULT),
                'estado' => 'approved',
                'area_solicitada' => $account['area'],
                'id_area' => $area?->id_area,
                'activo' => true,
                'cambiar_contrasena' => ! app()->environment('testing'),
            ]);

            $role = Role::query()->where('nombre', $account['role'])->first();
            if ($role && ! $user->roles()->where('sec.roles.id_rol', $role->id_rol)->exists()) {
                $user->roles()->attach($role->id_rol);
            }

            if ($area) {
                DB::table('org.miembros_area')->updateOrInsert(
                    ['id_area' => $area->id_area, 'id_usuario' => $user->id_usuario],
                    ['es_encargado' => str_ends_with($account['role'], '_Encargado'), 'ingresado_en' => now()]
                );
            }
        }
    }
}
