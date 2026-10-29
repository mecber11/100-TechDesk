<?php

namespace App\Business\Ops;

use App\Business\Areas\AreaContextService;
use App\Common\Exceptions\DomainException;
use App\Data\Contracts\OpsDashboardRepositoryInterface;
use App\Domain\Sec\User;

class OpsDashboardService
{
    public function __construct(
        private readonly AreaContextService $areas,
        private readonly OpsDashboardRepositoryInterface $dashboard,
    ) {}

    public function snapshot(User $user, ?string $areaCode = null, bool $personal = false): array
    {
        $manager = $this->areas->isManager($user);
        if (! $manager && $areaCode) throw new DomainException('El panel de área está reservado a su encargado.', 'AREA_DASHBOARD_FORBIDDEN', 403);
        $personal = $personal || ! $manager;
        $global = ! $personal && $this->areas->isCompanyAdmin($user);
        $selectedArea = $global && $areaCode ? $this->areas->byCode($areaCode, true) : null;
        $scopeArea = $global ? $selectedArea : $this->areas->area($user);
        if (! $personal && ! $global && ! $scopeArea) {
            throw new DomainException('Tu usuario no tiene un área asignada.', 'AREA_NOT_ASSIGNED', 403);
        }
        $data = $this->dashboard->snapshot($personal ? null : $scopeArea?->id_area, $personal ? $user->id_usuario : null);

        return [
            'scope' => [
                'mode' => $personal ? 'personal' : ($scopeArea ? 'area' : 'global'),
                'area' => $scopeArea ? [
                    'id' => $scopeArea->id_area,
                    'code' => $scopeArea->codigo,
                    'name' => $scopeArea->nombre,
                ] : null,
                'can_filter_areas' => $global,
                'available_areas' => $global ? $this->areas->active() : [],
            ],
            'kpis' => [
                ['code' => 'TOTAL', 'name' => 'Solicitudes vinculadas', 'value' => $data['total'], 'unit' => 'count'],
                ['code' => 'OPEN', 'name' => 'Pendientes de solución', 'value' => $data['open'], 'unit' => 'count'],
                ['code' => 'RESOLVED', 'name' => 'Atendidas y cerradas', 'value' => $data['resolved'], 'unit' => 'count'],
                ['code' => 'URGENT', 'name' => 'Urgentes abiertas', 'value' => $data['urgent'], 'unit' => 'count'],
                ['code' => 'COMPLETION', 'name' => 'Nivel de atención', 'value' => $data['completion'], 'unit' => 'percent'],
            ],
            'orders_by_status' => $data['orders_by_status'],
            'orders_by_category' => $data['orders_by_category'],
            'monthly_activity' => $data['monthly_activity'],
            'area_performance' => $global && ! $scopeArea ? $this->dashboard->areaPerformance() : [],
            'recent_orders' => $data['recent_orders'],
        ];
    }
}
