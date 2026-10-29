<?php

namespace App\Common\Support;

use App\Domain\Sec\User;

class AreaAccess
{
    public const AREA_DEFINITIONS = [
        'ADM' => ['name' => 'Administración', 'role' => 'Administracion'],
        'VENTAS' => ['name' => 'Ventas', 'role' => 'Ventas'],
        'MKT' => ['name' => 'Marketing', 'role' => 'Marketing'],
        'TI' => ['name' => 'TI', 'role' => 'TI'],
        'RRHH' => ['name' => 'Recursos Humanos', 'role' => 'Recursos_Humanos'],
        'CONT' => ['name' => 'Contabilidad', 'role' => 'Contabilidad'],
        'PSICO' => ['name' => 'Psicología', 'role' => 'Psicologia'],
        'DIS' => ['name' => 'Diseño', 'role' => 'Diseno'],
    ];

    public function roles(User $user): array
    {
        return $user->roles->pluck('nombre')->all();
    }

    public function isSuperAdmin(User $user): bool
    {
        // Nombre histórico utilizado por los servicios operativos.
        return $this->isCompanyAdmin($user);
    }

    public function isCompanyAdmin(User $user): bool
    {
        return count(array_intersect($this->roles($user), ['Administrador_Empresa', 'SuperAdmin', 'Super_Admin'])) > 0;
    }

    public function isPlatformAdmin(User $user): bool
    {
        return in_array('Plataforma_Admin', $this->roles($user), true);
    }

    public function isTi(User $user): bool
    {
        return count(array_intersect($this->roles($user), ['TI_Encargado', 'TI_Equipo'])) > 0;
    }

    public function hasGlobalVisibility(User $user): bool
    {
        return $this->isSuperAdmin($user) || $this->isTi($user);
    }

    public function isManager(User $user): bool
    {
        return $this->isSuperAdmin($user)
            || collect($this->roles($user))->contains(fn (string $role) => str_ends_with($role, '_Encargado'));
    }

    public function areaCodeFromRoles(array $roles): ?string
    {
        foreach (self::AREA_DEFINITIONS as $code => $definition) {
            if (in_array($definition['role'].'_Encargado', $roles, true)
                || in_array($definition['role'].'_Equipo', $roles, true)) {
                return $code;
            }
        }

        return null;
    }

    public function registrationArea(string $value): ?array
    {
        $normalized = mb_strtolower(str_replace([' ', '-'], '_', trim($value)));

        foreach (self::AREA_DEFINITIONS as $code => $definition) {
            $aliases = [
                mb_strtolower($code),
                mb_strtolower($definition['role']),
                mb_strtolower(str_replace('ó', 'o', $definition['name'])),
                mb_strtolower(str_replace(' ', '_', $definition['name'])),
            ];
            if (in_array($normalized, $aliases, true)) {
                return ['code' => $code, ...$definition];
            }
        }

        return null;
    }
}
