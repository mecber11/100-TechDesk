<?php

namespace App\Data\Eloquent;

use App\Data\Contracts\TeamRepositoryInterface;
use App\Domain\Sec\Role;
use App\Domain\Sec\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TeamRepository implements TeamRepositoryInterface
{
    public function members(?int $areaId, ?string $status = null): Collection
    {
        // Purga automática de usuarios suspendidos con más de 60 días
        $this->purgeExpiredSuspendedUsers();

        $query = User::query()
            ->whereDoesntHave('roles', fn ($query) => $query->where('nombre', 'Plataforma_Admin'))
            ->with(['area:id_area,codigo,nombre', 'roles:id_rol,nombre'])
            ->orderBy('nombre_completo');
        if ($areaId !== null) {
            $query->where('id_area', $areaId);
        }
        if ($status !== null) {
            $query->where('estado', $status);
        } else {
            $query->whereNotIn('estado', ['rejected']);
        }

        return $query->get();
    }

    public function findWithArea(int $id): ?User
    {
        return User::query()->with('area')->find($id);
    }

    public function changeStatus(User $user, string $status): void
    {
        DB::transaction(function () use ($user, $status) {
            $user->estado = $status;
            if ($status === 'approved') {
                $user->activo = true;
                $user->suspendido_en = null;
                $user->save();
                DB::table('org.miembros_area')->updateOrInsert(
                    ['id_area' => $user->id_area, 'id_usuario' => $user->id_usuario],
                    ['es_encargado' => false, 'ingresado_en' => now()]
                );
            } elseif ($status === 'suspended') {
                $user->activo = false;
                $user->suspendido_en = now();
                $user->save();
            } else {
                $user->activo = false;
                $user->suspendido_en = null;
                $user->save();
                DB::table('org.miembros_area')->where('id_area', $user->id_area)->where('id_usuario', $user->id_usuario)->delete();
            }
        });
    }

    public function saveSlack(User $user, string $slackId): void
    {
        $user->slack_user_id = $slackId;
        $user->save();
    }

    public function removeMember(User $user): void
    {
        DB::transaction(function () use ($user) {
            DB::table('org.miembros_area')
                ->where('id_usuario', $user->id_usuario)
                ->delete();

            DB::table('sec.tokens_acceso')->where('id_usuario', $user->id_usuario)->delete();
            DB::table('sec.sesiones_usuario')->where('id_usuario', $user->id_usuario)->delete();

            $user->roles()->detach();
            $user->delete();
        });
    }

    public function purgeExpiredSuspendedUsers(): int
    {
        $cutoff = now()->subDays(60);
        $expiredUsers = User::query()
            ->where('estado', 'suspended')
            ->whereNotNull('suspendido_en')
            ->where('suspendido_en', '<=', $cutoff)
            ->get();

        $count = 0;
        foreach ($expiredUsers as $user) {
            $this->removeMember($user);
            $count++;
        }

        return $count;
    }

    public function findManagedAreaId(int $userId): ?int
    {
        $id = DB::table('org.miembros_area')
            ->where('id_usuario', $userId)
            ->where('es_encargado', true)
            ->value('id_area');

        return $id !== null ? (int) $id : null;
    }

    public function emailExists(string $email): bool
    {
        return User::query()->where('correo', $email)->exists();
    }

    public function findByEmail(string $email): ?User
    {
        return User::query()->where('correo', $email)->first();
    }

    public function createUser(array $userData, int $areaId, string $areaCode, string $roleName, bool $isLead): User
    {
        return DB::transaction(function () use ($userData, $areaId, $areaCode, $roleName, $isLead) {
            $user = new User();
            $user->nombre_completo = $userData['name'];
            $user->correo = $userData['email'];
            $user->slack_user_id = $userData['slack_user_id'];
            $user->contrasena = password_hash($userData['password'], PASSWORD_DEFAULT);
            $user->estado = 'approved';
            $user->activo = true;
            $user->id_area = $areaId;
            $user->area_solicitada = $areaCode;
            $user->cambiar_contrasena = false;
            $user->creado_en = now();
            $user->save();

            $role = Role::query()->where('nombre', $roleName)->first();
            if ($role) {
                $user->roles()->attach($role->id_rol);
            }

            DB::table('org.miembros_area')->updateOrInsert(
                ['id_area' => $areaId, 'id_usuario' => $user->id_usuario],
                ['es_encargado' => $isLead, 'ingresado_en' => now()]
            );

            return $user;
        });
    }
}
