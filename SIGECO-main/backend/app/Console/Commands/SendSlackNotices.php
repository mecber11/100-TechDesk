<?php

namespace App\Console\Commands;

use App\Business\Notifications\SlackTicketService;
use Illuminate\Console\Command;

class SendSlackNotices extends Command
{
    protected $signature = 'slack:send-pending';
    protected $description = 'Reintenta avisos privados pendientes para el encargado del destino.';
    public function handle(SlackTicketService $slack): int
    {
        $this->info('Avisos enviados: '.$slack->retryPending());
        return self::SUCCESS;
    }
}
