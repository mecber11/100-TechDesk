<?php

namespace App\Business\Notifications;

use App\Data\Eloquent\SlackNoticeRepository;
use App\Domain\Req\InternalOrder;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class SlackTicketService
{
    public function __construct(private readonly SlackNoticeRepository $notices) {}

    public function notify(InternalOrder $order, string $event): void
    {
        if (! app(\App\Business\Platform\PlatformConfigurationService::class)->enabled('slack')) return;
        try {
            $notice = $this->notices->enqueue($order, $event);
            $this->deliver($notice->id_aviso);
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    public function retryPending(): int
    {
        if (! app(\App\Business\Platform\PlatformConfigurationService::class)->enabled('slack')) return 0;
        $sent = 0;
        foreach ($this->notices->pending() as $notice) {
            if ($this->deliver($notice->id_aviso)) $sent++;
        }
        return $sent;
    }

    public function deliver(int $id): bool
    {
        if (! app(\App\Business\Platform\PlatformConfigurationService::class)->enabled('slack')) return false;
        $notice = $this->notices->claim($id);
        if (! $notice) return false;
        $recipient = null;
        $delay = 300;
        try {
            $order = $this->notices->order($notice->id_pedido);
            if (! $order || (int) $order->area_destino !== (int) $notice->id_area_destino || ! in_array($order->estado, ['Enviado', 'Escalado', 'EnAtencion'], true)) {
                $this->notices->finish($notice, 'cancelado');
                return false;
            }
            $token = config('services.slack.notifications.bot_user_oauth_token');
            if (! $token) throw new RuntimeException('Slack no está configurado.');
            $leads = $this->notices->leads($order);
            if ($leads->count() !== 1) throw new RuntimeException('El destino debe tener exactamente un encargado activo.');
            $recipient = $leads->first()->slack_user_id;
            if (! $recipient) throw new RuntimeException('El encargado no tiene ID de Slack registrado.');
            $client = Http::withToken($token)->asJson()
                ->withOptions(['verify' => config('services.slack.ca_bundle') ?: true])
                ->connectTimeout(3)->timeout(8);
            $opened = $client->post('https://slack.com/api/conversations.open', ['users' => $recipient]);
            if ($opened->status() === 429) $delay = max(60, (int) $opened->header('Retry-After'));
            if (! $opened->successful() || ! $opened->json('ok') || ! $opened->json('channel.id')) {
                throw new RuntimeException('Slack: '.($opened->json('error') ?: 'No se pudo abrir el mensaje privado.'));
            }
            $text = "SIGECO · ".($notice->evento === 'creado' ? 'Nueva solicitud' : 'Solicitud redirigida')."\n"
                .$order->codigo_pedido." · ".$order->titulo."\n"
                .'De: '.$order->fromArea?->nombre.' → Para: '.$order->toArea?->nombre."\n"
                .'Solicitante: '.$order->requested_by_name.' ('.$order->requested_by_email.")\n"
                .'Prioridad: '.$order->prioridad."\n"
                .rtrim((string) config('services.slack.app_url'), '/').'/pedidos?ticket='.$order->id_pedido;
            $sent = $client->post('https://slack.com/api/chat.postMessage', [
                'channel' => $opened->json('channel.id'), 'text' => $text,
                'mrkdwn' => false, 'unfurl_links' => false, 'unfurl_media' => false,
            ]);
            if ($sent->status() === 429) $delay = max(60, (int) $sent->header('Retry-After'));
            if (! $sent->successful() || ! $sent->json('ok')) {
                throw new RuntimeException('Slack: '.($sent->json('error') ?: 'No se pudo enviar el aviso.'));
            }
            $this->notices->finish($notice, 'enviado', null, $recipient);
            return true;
        } catch (Throwable $exception) {
            $error = $exception instanceof RuntimeException ? $exception->getMessage() : 'Error de conexión con Slack.';
            $this->notices->finish($notice, 'pendiente', mb_substr($error, 0, 250), $recipient, $delay);
            return false;
        }
    }
}
