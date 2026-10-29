<?php

namespace App\Business\Users;

use App\Business\Crud\CrudService;
use App\Data\Contracts\AuthRepositoryInterface;
use App\Data\Eloquent\UserRepository;
use App\Domain\Sec\User;
use Illuminate\Database\Eloquent\Model;

class UserService extends CrudService
{
    public function __construct(
        UserRepository $repo,
        private readonly AuthRepositoryInterface $auth,
    ) {
        parent::__construct($repo);
    }

    public function create(array $payload): Model
    {
        if (! empty($payload['password'])) {
            $payload['contrasena'] = password_hash($payload['password'], PASSWORD_DEFAULT);
            unset($payload['password']);
        }

        return parent::create($this->translate($payload));
    }

    public function update(int|string $id, array $payload): Model
    {
        $this->assertCompanyAccount($id);
        $passwordChanged = ! empty($payload['password']);
        if ($passwordChanged) {
            $payload['contrasena'] = password_hash($payload['password'], PASSWORD_DEFAULT);
            unset($payload['password']);
        }

        return $this->repo->transaction(function () use ($id, $payload, $passwordChanged) {
            $user = parent::update($id, $this->translate($payload));
            if ($passwordChanged && $user instanceof User) {
                $this->auth->revokeAllTokens($user);
            }

            return $user;
        });
    }

    private function translate(array $payload): array
    {
        foreach (['email' => 'correo', 'full_name' => 'nombre_completo'] as $api => $column) {
            if (array_key_exists($api, $payload)) {
                $payload[$column] = $payload[$api];
                unset($payload[$api]);
            }
        }

        return $payload;
    }

    public function delete(int|string $id): void
    {
        $this->assertCompanyAccount($id);
        parent::delete($id);
    }

    private function assertCompanyAccount(int|string $id): void
    {
        $target = $this->repo->find($id);
        if ($target instanceof User && app(\App\Common\Support\AreaAccess::class)->isPlatformAdmin($target)) {
            throw new \App\Common\Exceptions\DomainException('La empresa no puede modificar cuentas de plataforma.', 'PLATFORM_ACCOUNT_PROTECTED', 403);
        }
    }
}
