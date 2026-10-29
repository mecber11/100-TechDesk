<?php

namespace App\Data\Eloquent;

use App\Domain\Req\InternalOrder;
use App\Domain\Req\SlackNotice;
use App\Domain\Sec\User;
use Illuminate\Support\Collection;

class SlackNoticeRepository
{
    public function enqueue(InternalOrder $order, string $event): SlackNotice
    {
        return SlackNotice::query()->firstOrCreate(['id_pedido' => $order->id_pedido, 'evento' => $event], [
            'id_area_destino' => $order->area_destino,
        ]);
    }

    public function pending(): Collection
    {
        return SlackNotice::query()->where('estado', 'pendiente')
            ->where(fn ($q) => $q->whereNull('reintentar_en')->orWhere('reintentar_en', '<=', now()))
            ->orderBy('id_aviso')->limit(100)->get();
    }

    public function claim(int $id): ?SlackNotice
    {
        $claimed = SlackNotice::query()->whereKey($id)->where('estado', 'pendiente')
            ->where(fn ($q) => $q->whereNull('bloqueado_hasta')->orWhere('bloqueado_hasta', '<', now()))
            ->update(['bloqueado_hasta' => now()->addMinute()]);
        return $claimed ? SlackNotice::query()->find($id) : null;
    }

    public function order(int $id): ?InternalOrder
    {
        return InternalOrder::query()->with(['fromArea', 'toArea'])->find($id);
    }

    public function leads(InternalOrder $order): Collection
    {
        $users = User::query()->where('activo', true)->where('estado', 'approved');
        if ($order->toArea?->codigo === 'SUPER') {
            $users->whereHas('roles', fn ($q) => $q->whereIn('nombre', ['Administrador_Empresa', 'SuperAdmin', 'Super_Admin']))
                ->whereDoesntHave('roles', fn ($q) => $q->where('nombre', 'Plataforma_Admin'));
        } else {
            $users->where('id_area', $order->area_destino)
                ->whereHas('roles', fn ($q) => $q->where('nombre', 'like', '%\_Encargado'));
        }
        return $users->get();
    }

    public function finish(SlackNotice $notice, string $state, ?string $error = null, ?string $recipient = null, int $delay = 300): void
    {
        $notice->fill([
            'estado' => $state, 'error' => $error, 'slack_destinatario' => $recipient,
            'intentos' => $notice->intentos + 1, 'bloqueado_hasta' => null,
            'reintentar_en' => $state === 'pendiente' ? now()->addSeconds($delay) : null,
            'enviado_en' => $state === 'enviado' ? now() : null,
        ])->save();
    }
}
