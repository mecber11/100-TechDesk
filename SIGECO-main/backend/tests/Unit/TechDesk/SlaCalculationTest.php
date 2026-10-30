<?php

namespace Tests\Unit\TechDesk;

use App\Business\TechDesk\SlaService;
use App\Data\Contracts\SlaRepositoryInterface;
use App\Domain\TechDesk\OrderSla;
use App\Domain\TechDesk\SlaPolicy;
use Carbon\Carbon;
use Tests\TestCase;

class SlaCalculationTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_sla_section_13_3_fixture_milestones_and_fractional_hours(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-29 13:00:00', 'America/Lima'));

        $repo = $this->createMock(SlaRepositoryInterface::class);

        // Política con 1.5 horas de primera respuesta y 3.0 horas de resolución
        $policy = new SlaPolicy([
            'id_politica' => 1,
            'nombre' => 'SLA Soporte Crítico',
            'prioridad' => 'Alta',
            'tiempo_primera_respuesta_horas' => 1.5, // 90 minutos
            'tiempo_resolucion_horas' => 3.0,        // 180 minutos
            'activo' => true,
        ]);

        $repo->method('findMatchingPolicy')->willReturn($policy);
        $repo->method('saveOrderSla')->willReturnCallback(function ($data) {
            return new OrderSla($data);
        });

        $service = new SlaService($repo);

        // Caso del fixture 13.3:
        // Creación 09:00, Primera atención 09:30, Resolución 11:00, Cierre administrativo 12:00
        $order = (object) [
            'id_pedido' => 450,
            'prioridad' => 'Alta',
            'categoria' => 'Hardware',
            'estado' => 'Atendido',
            'creado_en' => '2026-10-29 09:00:00',
            'fecha_atencion' => '2026-10-29 11:00:00', // Momento en que se resolvió
            'fecha_cierre' => '2026-10-29 12:00:00',   // Cierre posterior
        ];

        $metric = $service->calculateSlaForOrder($order);

        // Resolución exacta: 09:00 a 11:00 = 120 minutos (2 horas)
        $this->assertEquals(120, $metric->tiempo_resolucion_minutos);
        // Debe cumplir el SLA de 3.0 horas (180 min)
        $this->assertTrue($metric->cumplio_sla);
        $this->assertEquals('Cumplido', $metric->estado_sla);

        // Verificar que el deadline usó las 3.0 horas (180 min) desde 09:00 -> 12:00
        $this->assertEquals('2026-10-29 12:00:00', $metric->fecha_limite_sla->format('Y-m-d H:i:s'));
    }

    public function test_fractional_sla_policy_preserves_exact_minutes(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-29 10:00:00', 'America/Lima'));

        $repo = $this->createMock(SlaRepositoryInterface::class);

        // Política de 1.5 horas (90 minutos)
        $policy = new SlaPolicy([
            'id_politica' => 2,
            'prioridad' => 'Urgente',
            'tiempo_primera_respuesta_horas' => 0.5, // 30 minutos
            'tiempo_resolucion_horas' => 1.5,        // 90 minutos
            'activo' => true,
        ]);

        $repo->method('findMatchingPolicy')->willReturn($policy);
        $repo->method('saveOrderSla')->willReturnCallback(function ($data) {
            return new OrderSla($data);
        });

        $service = new SlaService($repo);

        $order = (object) [
            'id_pedido' => 500,
            'prioridad' => 'Urgente',
            'estado' => 'Enviado',
            'creado_en' => '2026-10-29 09:00:00',
        ];

        $metric = $service->calculateSlaForOrder($order);

        // Fecha límite exacta: 09:00 + 90 minutos = 10:30:00
        $this->assertEquals('2026-10-29 10:30:00', $metric->fecha_limite_sla->format('Y-m-d H:i:s'));
    }

    public function test_alert_created_and_not_duplicated(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-29 14:00:00', 'America/Lima'));

        $repo = $this->createMock(SlaRepositoryInterface::class);

        $policy = new SlaPolicy([
            'id_politica' => 3,
            'prioridad' => 'Media',
            'tiempo_primera_respuesta_horas' => 2.0,
            'tiempo_resolucion_horas' => 4.0, // límite: 09:00 + 4h = 13:00 -> a las 14:00 está Vencido
            'activo' => true,
        ]);

        $repo->method('findMatchingPolicy')->willReturn($policy);
        $repo->method('saveOrderSla')->willReturnCallback(function ($data) {
            return new OrderSla($data);
        });

        // Simular que aún no existe alerta para este pedido y tipo
        $repo->expects($this->once())
            ->method('findNotificationByOrderAndType')
            ->with(700, 'sla_vencido')
            ->willReturn(null);

        // Debe crear la alerta una sola vez
        $repo->expects($this->once())
            ->method('createNotification')
            ->with($this->callback(function ($data) {
                return $data['id_pedido'] === 700 && $data['tipo'] === 'sla_vencido';
            }))
            ->willReturn((object) ['id_notificacion' => 1]);

        $service = new SlaService($repo);

        $order = (object) [
            'id_pedido' => 700,
            'codigo_pedido' => 'PED-TI-700',
            'prioridad' => 'Media',
            'estado' => 'EnAtencion',
            'creado_en' => '2026-10-29 09:00:00',
        ];

        $metric = $service->calculateSlaForOrder($order);
        $this->assertEquals('Vencido', $metric->estado_sla);
        $this->assertTrue($metric->alerta_enviada);
    }
}
