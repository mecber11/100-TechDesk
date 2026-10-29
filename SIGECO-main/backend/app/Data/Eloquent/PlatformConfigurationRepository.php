<?php

namespace App\Data\Eloquent;

use Illuminate\Support\Facades\DB;

class PlatformConfigurationRepository
{
    public function current(): array
    {
        return (array) DB::table('cfg.configuracion_empresa')->where('id', 1)->first();
    }

    public function update(array $values, int $actorId): array
    {
        return DB::transaction(function () use ($values, $actorId) {
            $before = (array) DB::table('cfg.configuracion_empresa')->where('id', 1)->lockForUpdate()->first();
            DB::table('cfg.configuracion_empresa')->where('id', 1)->update([...$values, 'actualizado_en' => now()]);
            $after = $this->current();
            DB::table('cfg.historial_configuracion')->insert([
                'id_usuario' => $actorId,
                'antes' => json_encode($before, JSON_THROW_ON_ERROR),
                'despues' => json_encode($after, JSON_THROW_ON_ERROR),
            ]);
            return $after;
        });
    }
}
