<?php

namespace App\Business\Lookups;

use App\Business\Areas\AreaContextService;
use App\Data\Contracts\LookupRepositoryInterface;

class LookupService
{
    public function __construct(
        private readonly AreaContextService $areas,
        private readonly LookupRepositoryInterface $lookups,
    ) {}

    public function all(): array
    {
        return [
            'areas' => $this->areas->active(),
            'doc_types' => $this->lookups->documentTypes(),
            'documents' => app(\App\Business\Platform\PlatformConfigurationService::class)->enabled('documentos') ? $this->lookups->activeDocuments() : [],
            'request_types' => ['Pedido', 'Ticket'],
            'order_kinds' => ['Documentación', 'Equipo', 'Software', 'Acceso', 'Incidente', 'Servicio', 'Otro'],
            'priorities' => ['Baja', 'Media', 'Alta', 'Urgente'],
            'order_statuses' => ['Borrador', 'Enviado', 'EnAtencion', 'Escalado', 'Atendido', 'Rechazado', 'Cerrado'],
            'doc_statuses' => ['Borrador', 'Vigente', 'Obsoleto'],
        ];
    }
}
