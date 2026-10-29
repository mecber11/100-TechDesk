<?php

namespace App\Business\Platform;

use App\Common\Exceptions\DomainException;
use App\Common\Support\AreaAccess;
use App\Data\Eloquent\PlatformConfigurationRepository;
use App\Domain\Sec\User;

class PlatformConfigurationService
{
    public const MODULES = ['ia' => 'ia_habilitada', 'documentos' => 'documentos_habilitados', 'slack' => 'slack_habilitado'];

    public function __construct(private readonly PlatformConfigurationRepository $configuration) {}

    public function current(): array
    {
        return $this->configuration->current();
    }

    public function modules(): array
    {
        $current = $this->current();
        $modules = [];
        foreach (self::MODULES as $name => $column) {
            $modules[$name] = (bool) ($current[$column] ?? false);
        }
        return $modules;
    }

    public function enabled(string $module): bool
    {
        return $this->modules()[$module] ?? false;
    }

    public function update(array $values, User $actor): array
    {
        if (! app(AreaAccess::class)->isPlatformAdmin($actor)) {
            throw new DomainException('Solo el superadministrador de plataforma puede configurar módulos.', 'PLATFORM_FORBIDDEN', 403);
        }
        return $this->configuration->update($values, $actor->id_usuario);
    }
}
