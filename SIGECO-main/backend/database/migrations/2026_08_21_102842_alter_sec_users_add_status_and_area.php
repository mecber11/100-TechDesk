<?php

use App\Domain\Sec\Role;
use App\Domain\Sec\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sec.users', function (Blueprint $table) {
            $table->string('status')->default('pending');
            $table->string('requested_area')->nullable();
        });

        $roles = [
            'Ventas_Encargado', 'Ventas_Equipo',
            'Marketing_Encargado', 'Marketing_Equipo',
            'TI_Encargado', 'TI_Equipo',
            'Administracion_Encargado', 'Administracion_Equipo',
            'Recursos_Humanos_Encargado', 'Recursos_Humanos_Equipo',
            'Contabilidad_Encargado', 'Contabilidad_Equipo',
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role], [
                'description' => 'Rol de '.str_replace('_', ' ', $role),
                'is_system' => false,
                'is_active' => true,
            ]);
        }

        // Seed test Encargados
        $areas = [
            'SuperAdmin' => 'admin@ingenieros.edu.pe',
            'Ventas_Encargado' => 'ventas@ingenieros.edu.pe',
            'Marketing_Encargado' => 'marketing@ingenieros.edu.pe',
            'TI_Encargado' => 'ti@ingenieros.edu.pe',
            'Administracion_Encargado' => 'admin_area@ingenieros.edu.pe',
            'Recursos_Humanos_Encargado' => 'rrhh@ingenieros.edu.pe',
            'Contabilidad_Encargado' => 'contabilidad@ingenieros.edu.pe',
        ];

        foreach ($areas as $roleName => $email) {
            $user = User::where('email', $email)->first();
            if (! $user) {
                $user = User::create([
                    'email' => $email,
                    'full_name' => 'Encargado de '.explode('_', $roleName)[0],
                    'password_hash' => password_hash(Str::random(40), PASSWORD_DEFAULT),
                    'is_active' => true,
                    'must_change_password' => true,
                    'status' => 'approved',
                ]);
            } else {
                $user->status = 'approved';
                $user->save();
            }

            $role = Role::where('name', $roleName)->first();
            if ($role) {
                if (! $user->roles()->where('sec.roles.role_id', $role->role_id)->exists()) {
                    $user->roles()->attach($role->role_id);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sec.users', function (Blueprint $table) {
            $table->dropColumn(['status', 'requested_area']);
        });
    }
};
