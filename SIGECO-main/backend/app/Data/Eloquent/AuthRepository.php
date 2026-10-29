<?php

namespace App\Data\Eloquent;

use App\Data\Contracts\AuthRepositoryInterface;
use App\Domain\Sec\LoginAttempt;
use App\Domain\Sec\RefreshToken;
use App\Domain\Sec\Role;
use App\Domain\Sec\User;
use App\Domain\Sec\UserSession;
use Illuminate\Support\Facades\DB;

class AuthRepository implements AuthRepositoryInterface
{
    public function findByEmail(string $email): ?User
    {
        return User::query()->where('correo', $email)->first();
    }

    public function findByToken(string $plainToken): ?User
    {
        $token = RefreshToken::query()
            ->where('hash_token', hash('sha256', $plainToken))
            ->whereNull('revocado_en')
            ->where('expira_en', '>', now())
            ->first();

        return $token
            ? User::query()->with(['roles', 'area'])->find($token->id_usuario)
            : null;
    }

    public function recordAttempt(string $email, bool $succeeded, ?string $ip): void
    {
        LoginAttempt::query()->create([
            'id_usuario' => User::query()->where('correo', $email)->value('id_usuario'),
            'correo' => $email,
            'exitoso' => $succeeded,
            'direccion_ip' => $ip,
            'realizado_en' => now(),
        ]);
    }

    public function saveUser(User $user): User
    {
        $user->save();

        return $user;
    }

    public function createSession(User $user, string $sessionId, ?string $ip, ?string $userAgent): void
    {
        (new UserSession([
            'id_sesion' => $sessionId,
            'id_usuario' => $user->id_usuario,
            'direccion_ip' => $ip,
            'agente_usuario' => $userAgent,
        ]))->save();
    }

    public function storeToken(User $user, string $plainToken): void
    {
        RefreshToken::query()->create([
            'id_usuario' => $user->id_usuario,
            'hash_token' => hash('sha256', $plainToken),
            'expira_en' => now()->addHours(8),
        ]);
    }

    public function revokeToken(string $plainToken): void
    {
        RefreshToken::query()->where('hash_token', hash('sha256', $plainToken))
            ->whereNull('revocado_en')->update(['revocado_en' => now()]);
    }

    public function revokeAllTokens(User $user): void
    {
        RefreshToken::query()
            ->where('id_usuario', $user->id_usuario)
            ->whereNull('revocado_en')
            ->update(['revocado_en' => now()]);
    }

    public function loadProfile(User $user): User
    {
        return $user->load(['roles', 'area']);
    }

    public function createPendingUser(array $payload, string $roleName): User
    {
        return DB::transaction(function () use ($payload, $roleName) {
            $user = User::query()->create($payload);
            $role = Role::query()->where('nombre', $roleName)->first();
            if ($role) {
                $user->roles()->attach($role->id_rol);
            }

            return $user;
        });
    }
}
