<?php

namespace App\Business\Auth;

use App\Business\Areas\AreaContextService;
use App\Common\Exceptions\DomainException;
use App\Data\Contracts\AuthRepositoryInterface;
use App\Domain\Sec\User;
use Illuminate\Support\Str;

class AuthService
{
    public function __construct(
        private readonly AuthRepositoryInterface $auth,
        private readonly AreaContextService $areas,
    ) {}

    public function login(string $email, string $password, ?string $ip = null, ?string $ua = null): array
    {
        $user = $this->auth->findByEmail($email);
        $valid = $user && password_verify($password, $user->contrasena);
        $this->auth->recordAttempt($email, (bool) $valid, $ip);

        if (! $valid || ! $user->activo) {
            throw new DomainException('Credenciales inválidas.', 'INVALID_CREDENTIALS', 401);
        }
        if (($user->estado ?? 'approved') !== 'approved') {
            throw new DomainException('Tu cuenta aún está pendiente de aprobación o ha sido rechazada.', 'ACCOUNT_NOT_APPROVED', 403);
        }

        $user->ultimo_ingreso = now();
        $this->auth->saveUser($user);
        $this->auth->createSession($user, (string) Str::uuid(), $ip, $ua);
        $plainToken = Str::random(64);
        $this->auth->storeToken($user, $plainToken);

        return [
            'token' => $plainToken,
            'token_type' => 'Bearer',
            'user' => $this->profile($user),
        ];
    }

    public function register(array $data): void
    {
        $definition = $this->areas->registrationArea($data['area']);
        if (! $definition) {
            throw new DomainException('El área seleccionada no es válida.', 'INVALID_AREA', 422);
        }
        $area = $this->areas->byCode($definition['code'], true);
        if (! $area) {
            throw new DomainException('El área seleccionada no está disponible.', 'AREA_NOT_AVAILABLE', 422);
        }

        $this->auth->createPendingUser([
            'nombre_completo' => $data['name'],
            'correo' => $data['email'],
            'slack_user_id' => $data['slack_user_id'],
            'contrasena' => password_hash($data['password'], PASSWORD_DEFAULT),
            'estado' => 'pending',
            'area_solicitada' => $definition['code'],
            'id_area' => $area->id_area,
            'activo' => true,
            'cambiar_contrasena' => false,
        ], $definition['role'].'_Equipo');
    }

    public function authenticateToken(?string $token): ?User
    {
        if (! $token) {
            return null;
        }

        $user = $this->auth->findByToken($token);

        return $user && $user->activo && ($user->estado ?? 'approved') === 'approved' ? $user : null;
    }

    public function logout(?string $token): void
    {
        if ($token) {
            $this->auth->revokeToken($token);
        }
    }

    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        if (! password_verify($currentPassword, $user->contrasena)) {
            throw new DomainException('La contraseña actual no es correcta.', 'INVALID_CURRENT_PASSWORD', 422);
        }
        if (password_verify($newPassword, $user->contrasena)) {
            throw new DomainException('La nueva contraseña debe ser diferente.', 'PASSWORD_NOT_CHANGED', 422);
        }

        $user->contrasena = password_hash($newPassword, PASSWORD_DEFAULT);
        $user->cambiar_contrasena = false;
        $this->auth->saveUser($user);
        $this->auth->revokeAllTokens($user);
    }

    public function profile(User $user): array
    {
        $user = $this->auth->loadProfile($user);
        $isManager = $this->areas->isManager($user);

        return [
            'id' => $user->id_usuario,
            'email' => $user->correo,
            'slack_user_id' => $user->slack_user_id,
            'name' => $user->nombre_completo,
            'full_name' => $user->nombre_completo,
            'theme' => $user->tema_preferido,
            'must_change_password' => $user->cambiar_contrasena,
            'roles' => $user->roles->pluck('nombre')->map(fn ($role) => in_array($role, ['Super_Admin', 'SuperAdmin'], true) ? 'Administrador_Empresa' : $role)->unique()->values(),
            'modules' => app(\App\Business\Platform\PlatformConfigurationService::class)->modules(),
            'is_manager' => $isManager,
            'is_lead' => $isManager,
            'area' => $user->area ? [
                'id' => $user->area->id_area,
                'code' => $user->area->codigo,
                'name' => $user->area->nombre,
            ] : null,
            'status' => $user->estado ?? 'approved',
        ];
    }
}
