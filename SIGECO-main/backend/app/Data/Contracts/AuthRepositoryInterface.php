<?php

namespace App\Data\Contracts;

use App\Domain\Sec\User;

interface AuthRepositoryInterface
{
    public function findByEmail(string $email): ?User;

    public function findByToken(string $plainToken): ?User;

    public function recordAttempt(string $email, bool $succeeded, ?string $ip): void;

    public function saveUser(User $user): User;

    public function createSession(User $user, string $sessionId, ?string $ip, ?string $userAgent): void;

    public function storeToken(User $user, string $plainToken): void;

    public function revokeToken(string $plainToken): void;

    public function revokeAllTokens(User $user): void;

    public function loadProfile(User $user): User;

    public function createPendingUser(array $payload, string $roleName): User;
}
