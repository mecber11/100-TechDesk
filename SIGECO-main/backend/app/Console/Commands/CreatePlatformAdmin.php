<?php

namespace App\Console\Commands;

use App\Domain\Sec\Role;
use App\Domain\Sec\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class CreatePlatformAdmin extends Command
{
    protected $signature = 'platform:create-admin {email} {--name=Superadministrador de plataforma}';
    protected $description = 'Crea una cuenta independiente de plataforma con contraseña solicitada de forma oculta.';

    public function handle(): int
    {
        $email = (string) $this->argument('email');
        $name = (string) $this->option('name');
        if (Validator::make(['email' => $email, 'name' => $name], ['email' => 'required|email|max:254', 'name' => 'required|string|max:160'])->fails()) {
            $this->error('Correo o nombre inválido.');
            return self::FAILURE;
        }
        if (User::query()->where('correo', $email)->exists()) {
            $this->error('El correo ya existe. Usa una cuenta nueva; no se modificaron cuentas existentes.');
            return self::FAILURE;
        }
        $password = (string) $this->secret('Contraseña (mínimo 8 caracteres)');
        if (mb_strlen($password) < 8 || $password !== (string) $this->secret('Repite la contraseña')) {
            $this->error('La contraseña es demasiado corta o no coincide.');
            return self::FAILURE;
        }
        DB::transaction(function () use ($email, $name, $password) {
            $role = Role::query()->where('nombre', 'Plataforma_Admin')->firstOrFail();
            $user = User::query()->create([
                'correo' => $email, 'nombre_completo' => $name,
                'contrasena' => password_hash($password, PASSWORD_DEFAULT),
                'activo' => true, 'estado' => 'approved', 'cambiar_contrasena' => false,
            ]);
            $user->roles()->attach($role->id_rol);
        });
        $this->info('Cuenta de plataforma creada. Accede a /plataforma.');
        return self::SUCCESS;
    }
}
