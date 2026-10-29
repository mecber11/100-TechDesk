<?php

namespace App\Console\Commands;

use App\Data\Contracts\TeamRepositoryInterface;
use Illuminate\Console\Command;

class CleanupSuspendedUsers extends Command
{
    protected $signature = 'team:cleanup-suspended';
    protected $description = 'Elimina automáticamente a los usuarios suspendidos que superaron los 60 días (2 meses)';

    public function handle(TeamRepositoryInterface $teams): int
    {
        $count = $teams->purgeExpiredSuspendedUsers();
        $this->info("Se eliminaron {$count} usuarios suspendidos con más de 60 días.");

        return self::SUCCESS;
    }
}
