<?php

namespace Tests\Unit\TechDesk;

use App\Business\TechDesk\AssetAssignmentService;
use App\Business\TechDesk\AssetMaintenanceService;
use App\Common\Exceptions\DomainException;
use App\Data\Contracts\AssetAssignmentRepositoryInterface;
use App\Data\Contracts\AssetMaintenanceRepositoryInterface;
use App\Data\Contracts\AssetRepositoryInterface;
use App\Domain\TechDesk\Asset;
use App\Domain\TechDesk\AssetAssignment;
use Tests\TestCase;

class AssetAssignmentAndMaintenanceRulesTest extends TestCase
{
    public function test_cannot_assign_unavailable_asset(): void
    {
        $assignmentRepo = $this->createMock(AssetAssignmentRepositoryInterface::class);
        $assetRepo = $this->createMock(AssetRepositoryInterface::class);

        // Activo ya asignado
        $asset = new Asset([
            'id_activo' => 5,
            'codigo_patrimonial' => 'TI-OCCUPIED-01',
            'estado' => 'Asignado',
        ]);

        $assetRepo->method('findById')->with(5)->willReturn($asset);

        $service = new AssetAssignmentService($assignmentRepo, $assetRepo);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('no está disponible (Estado actual: Asignado)');

        $service->assignAsset([
            'id_activo' => 5,
            'id_usuario_asignado' => 10,
        ], 1);
    }

    public function test_cannot_return_already_returned_assignment(): void
    {
        $assignmentRepo = $this->createMock(AssetAssignmentRepositoryInterface::class);
        $assetRepo = $this->createMock(AssetRepositoryInterface::class);

        $assignment = new AssetAssignment([
            'id_asignacion' => 20,
            'id_activo' => 5,
            'estado' => 'Devuelto',
        ]);

        $assignmentRepo->method('findById')->with(20)->willReturn($assignment);

        $service = new AssetAssignmentService($assignmentRepo, $assetRepo);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Esta asignación ya fue registrada como devuelta');

        $service->returnAsset(20, ['condicion_devolucion' => 'Operativo'], 1);
    }

    public function test_maintenance_completion_requires_technician_and_diagnosis(): void
    {
        $maintRepo = $this->createMock(AssetMaintenanceRepositoryInterface::class);
        $assetRepo = $this->createMock(AssetRepositoryInterface::class);

        $asset = new Asset(['id_activo' => 8, 'estado' => 'Mantenimiento']);
        $assetRepo->method('findById')->willReturn($asset);

        $service = new AssetMaintenanceService($maintRepo, $assetRepo);

        // Intento de alta completada sin técnico
        try {
            $service->create([
                'id_activo' => 8,
                'titulo' => 'Mantenimiento Correctivo Pantalla',
                'tipo_mantenimiento' => 'Correctivo',
                'estado' => 'Completado',
                'tecnico_responsable' => '',
                'diagnostico_solucion' => 'Se cambió flex',
            ], 1);
            $this->fail('Debería requerir técnico responsable');
        } catch (DomainException $e) {
            $this->assertEquals('TECHNICIAN_REQUIRED', $e->codeKey);
        }

        // Intento de alta completada sin diagnóstico
        try {
            $service->create([
                'id_activo' => 8,
                'titulo' => 'Mantenimiento Correctivo Pantalla',
                'tipo_mantenimiento' => 'Correctivo',
                'estado' => 'Completado',
                'tecnico_responsable' => 'Ing. Juan Pérez',
                'diagnostico_solucion' => '',
            ], 1);
            $this->fail('Debería requerir diagnóstico y solución');
        } catch (DomainException $e) {
            $this->assertEquals('DIAGNOSIS_REQUIRED', $e->codeKey);
        }
    }
}
