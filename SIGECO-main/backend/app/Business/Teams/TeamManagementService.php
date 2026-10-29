<?php

namespace App\Business\Teams;

use App\Business\Areas\AreaContextService;
use App\Common\Exceptions\DomainException;
use App\Data\Contracts\TeamRepositoryInterface;
use App\Domain\Sec\User;

class TeamManagementService
{
    public function __construct(
        private readonly TeamRepositoryInterface $teams,
        private readonly AreaContextService $areas,
    ) {}

    public function members(User $actor, ?string $areaCode = null): array
    {
        $areaId = null;
        if ($this->areas->isCompanyAdmin($actor)) {
            if ($areaCode) {
                $area = $this->areas->byCode($areaCode);
                $areaId = $area?->id_area;
            }
        } else {
            $areaId = $this->managedAreaId($actor);
        }

        return $this->teams->members($areaId)->map(function (User $member) {
            $daysLeft = null;
            $canReactivate = true;
            if ($member->estado === 'suspended' && $member->suspendido_en) {
                $cutoff = $member->suspendido_en->copy()->addDays(60);
                $diff = (int) now()->diffInDays($cutoff, false);
                $daysLeft = max(0, $diff);
                $canReactivate = $diff >= 0;
            }

            return [
                'id' => $member->id_usuario,
                'name' => $member->nombre_completo,
                'email' => $member->correo,
                'slack_user_id' => $member->slack_user_id,
                'status' => $member->estado,
                'requested_area' => $member->area_solicitada,
                'area' => $member->area?->nombre,
                'is_lead' => $member->roles->contains(fn ($role) => str_ends_with($role->nombre, '_Encargado')),
                'suspended_at' => $member->suspendido_en?->toIso8601String(),
                'days_left_to_reactivate' => $daysLeft,
                'can_reactivate' => $canReactivate,
                'created_at' => $member->creado_en,
            ];
        })->all();
    }

    public function pending(User $actor): array
    {
        $areaId = $this->managedAreaId($actor);

        return $this->teams->members($areaId, 'pending')->map(fn (User $member) => [
            'id' => $member->id_usuario,
            'name' => $member->nombre_completo,
            'email' => $member->correo,
            'requested_area' => $member->area_solicitada,
            'area' => $member->area?->nombre,
            'created_at' => $member->creado_en,
        ])->all();
    }

    public function changeStatus(User $actor, int $targetId, string $status): string
    {
        $target = $this->teams->findWithArea($targetId);
        if (! $target) {
            throw new DomainException('Usuario no encontrado.', 'USER_NOT_FOUND', 404);
        }
        $this->assertCompanyAccount($target);
        $targetArea = $target->area ?? ($target->area_solicitada ? $this->areas->byCode($target->area_solicitada) : null);
        if (! $targetArea && ! $this->areas->isCompanyAdmin($actor)) {
            throw new DomainException('El usuario no tiene un área válida asignada.', 'INVALID_TEAM_AREA', 422);
        }
        if ($targetArea && ! $this->areas->canManageArea($actor, $targetArea)) {
            throw new DomainException('No puedes gestionar usuarios de otra área.', 'FORBIDDEN_TEAM', 403);
        }
        if ($actor->id_usuario === $targetId) {
            throw new DomainException('No puedes modificar tu propio estado.', 'CANNOT_MODIFY_SELF', 422);
        }

        // Si se intenta reactivar a un integrante suspendido, validar ventana de 60 días
        if ($status === 'approved' && $target->estado === 'suspended') {
            if ($target->suspendido_en && $target->suspendido_en->copy()->addDays(60)->isPast()) {
                $this->teams->removeMember($target);
                throw new DomainException('El plazo de 60 días para reactivar ha vencido. El integrante fue eliminado automáticamente.', 'REACTIVATION_EXPIRED', 422);
            }
        }

        $this->teams->changeStatus($target, $status);

        return match ($status) {
            'approved' => 'Integrante habilitado en el equipo.',
            'suspended' => 'Integrante suspendido del equipo.',
            default => 'Solicitud rechazada.',
        };
    }

    public function removeMember(User $actor, int $targetId): string
    {
        $target = $this->teams->findWithArea($targetId);
        if (! $target) {
            throw new DomainException('Usuario no encontrado.', 'USER_NOT_FOUND', 404);
        }
        $this->assertCompanyAccount($target);
        $targetArea = $target->area ?? ($target->area_solicitada ? $this->areas->byCode($target->area_solicitada) : null);
        if (! $targetArea && ! $this->areas->isCompanyAdmin($actor)) {
            throw new DomainException('El usuario no tiene un área válida asignada.', 'INVALID_TEAM_AREA', 422);
        }
        if ($targetArea && ! $this->areas->canManageArea($actor, $targetArea)) {
            throw new DomainException('No puedes gestionar usuarios de otra área.', 'FORBIDDEN_TEAM', 403);
        }
        if ($actor->id_usuario === $targetId) {
            throw new DomainException('No puedes eliminarte a ti mismo de tu equipo.', 'CANNOT_REMOVE_SELF', 422);
        }

        $this->teams->removeMember($target);

        return 'Integrante eliminado del equipo con éxito.';
    }

    public function createMember(User $actor, array $payload): array
    {
        if (! $this->areas->isCompanyAdmin($actor)) {
            throw new DomainException('Solo el administrador general puede crear nuevos usuarios y encargados de área.', 'FORBIDDEN_ACTION', 403);
        }

        $name = trim($payload['name'] ?? '');
        $email = mb_strtolower(trim($payload['email'] ?? ''));
        $password = (string) ($payload['password'] ?? '');
        $areaInput = (string) ($payload['area'] ?? '');
        $isLead = ! empty($payload['is_lead']) || ($payload['role_type'] ?? '') === 'lead';

        if (mb_strlen($name) < 2) {
            throw new DomainException('El nombre completo es requerido y debe tener al menos 2 caracteres.', 'INVALID_NAME', 422);
        }
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new DomainException('El formato del correo electrónico no es válido.', 'INVALID_EMAIL', 422);
        }
        if (mb_strlen($password) < 8) {
            throw new DomainException('La contraseña debe tener al menos 8 caracteres.', 'INVALID_PASSWORD', 422);
        }
        $existing = $this->teams->findByEmail($email);
        if ($existing) {
            if ($existing->estado === 'rejected' || ! $existing->activo) {
                $this->teams->removeMember($existing);
            } else {
                throw new DomainException('El correo electrónico ya se encuentra registrado.', 'EMAIL_ALREADY_EXISTS', 422);
            }
        }

        $definition = $this->areas->registrationArea($areaInput);
        if (! $definition) {
            throw new DomainException('El área seleccionada no es válida.', 'INVALID_AREA', 422);
        }
        $area = $this->areas->byCode($definition['code'], true);
        if (! $area) {
            throw new DomainException('El área seleccionada no está disponible.', 'AREA_NOT_AVAILABLE', 422);
        }

        $roleName = $definition['role'].($isLead ? '_Encargado' : '_Equipo');

        $user = $this->teams->createUser([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'slack_user_id' => $payload['slack_user_id'],
        ], $area->id_area, $definition['code'], $roleName, $isLead);

        $cargo = $isLead ? "Encargado de {$area->nombre}" : "Integrante de {$area->nombre}";

        return [
            'message' => "Usuario {$user->nombre_completo} creado exitosamente como {$cargo}.",
            'user_id' => $user->id_usuario,
        ];
    }

    private function managedAreaId(User $actor): ?int
    {
        if (! $this->areas->isManager($actor)) {
            throw new DomainException('No tienes permisos para gestionar equipos.', 'FORBIDDEN_TEAM', 403);
        }
        if ($this->areas->isCompanyAdmin($actor)) {
            return null;
        }

        $area = $this->areas->area($actor);
        if (! $area) {
            $miembroAreaId = $this->teams->findManagedAreaId($actor->id_usuario);
            if ($miembroAreaId) {
                return $miembroAreaId;
            }
            throw new DomainException('Tu usuario no tiene un área asignada.', 'AREA_NOT_ASSIGNED', 403);
        }

        return $area->id_area;
    }

    public function updateSlack(User $actor, int $targetId, string $slackId): void
    {
        $target = $this->teams->findWithArea($targetId);
        if (! $target) throw new DomainException('Usuario no encontrado.', 'USER_NOT_FOUND', 404);
        $this->assertCompanyAccount($target);
        if ($actor->id_usuario !== $targetId && ! $this->areas->isCompanyAdmin($actor)
            && (! $target->area || ! $this->areas->canManageArea($actor, $target->area))) {
            throw new DomainException('No puedes editar Slack de este usuario.', 'FORBIDDEN_TEAM', 403);
        }
        $this->teams->saveSlack($target, $slackId);
    }

    private function assertCompanyAccount(User $target): void
    {
        if (app(\App\Common\Support\AreaAccess::class)->isPlatformAdmin($target)) {
            throw new DomainException('La empresa no puede modificar cuentas de plataforma.', 'PLATFORM_ACCOUNT_PROTECTED', 403);
        }
    }
}
