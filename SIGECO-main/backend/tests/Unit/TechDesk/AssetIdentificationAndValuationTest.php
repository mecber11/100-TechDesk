<?php

namespace Tests\Unit\TechDesk;

use App\Business\TechDesk\AssetService;
use App\Common\Exceptions\DomainException;
use App\Data\Contracts\AssetRepositoryInterface;
use App\Domain\TechDesk\Asset;
use Carbon\Carbon;
use Tests\TestCase;

class AssetIdentificationAndValuationTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_normalization_and_rejection_of_invalid_fillers(): void
    {
        $repo = $this->createMock(AssetRepositoryInterface::class);
        $service = new AssetService($repo);

        $invalidFillers = ['', '   ', 'SIN SERIE', 'N/A', '0000', '0', 'ninguno', 'pendiente'];

        foreach ($invalidFillers as $filler) {
            try {
                $service->create([
                    'codigo_patrimonial' => 'TI-TEST-001',
                    'numero_serie' => $filler,
                    'nombre' => 'Laptop Prueba',
                    'tipo' => 'Laptop',
                    'marca' => 'HP',
                    'modelo' => 'EliteBook',
                ], 1);
                $this->fail("Debería haber rechazado el relleno inválido: '{$filler}'");
            } catch (DomainException $e) {
                $this->assertEquals('INVALID_PHYSICAL_IDENTIFIER', $e->codeKey);
            }
        }
    }

    public function test_two_different_issuers_can_have_same_serial_legitimately(): void
    {
        $repo = $this->createMock(AssetRepositoryInterface::class);

        $repo->expects($this->exactly(2))
            ->method('findByPatrimonialCode')
            ->willReturn(null);

        $repo->expects($this->exactly(2))
            ->method('findByIdentifier')
            ->willReturn(null);

        $createdA = new Asset(['id_activo' => 1, 'codigo_patrimonial' => 'TI-HP-001']);
        $createdB = new Asset(['id_activo' => 2, 'codigo_patrimonial' => 'TI-DELL-002']);

        $repo->expects($this->exactly(2))
            ->method('create')
            ->willReturnOnConsecutiveCalls($createdA, $createdB);

        $service = new AssetService($repo);

        $assetHp = $service->create([
            'codigo_patrimonial' => 'TI-HP-001',
            'numero_serie' => 'SN-COMMON-999',
            'nombre' => 'Laptop HP',
            'tipo' => 'Laptop',
            'marca' => 'HP',
            'modelo' => 'ProBook',
        ], 1);

        $assetDell = $service->create([
            'codigo_patrimonial' => 'TI-DELL-002',
            'numero_serie' => 'SN-COMMON-999',
            'nombre' => 'Laptop Dell',
            'tipo' => 'Laptop',
            'marca' => 'Dell',
            'modelo' => 'Latitude',
        ], 1);

        $this->assertEquals(1, $assetHp->id_activo);
        $this->assertEquals(2, $assetDell->id_activo);
    }

    public function test_rejects_duplicate_serial_for_same_issuer(): void
    {
        $repo = $this->createMock(AssetRepositoryInterface::class);

        $repo->method('findByPatrimonialCode')->willReturn(null);

        $existingAsset = new Asset([
            'id_activo' => 10,
            'codigo_patrimonial' => 'TI-HP-001',
            'nombre' => 'Laptop HP Existente',
        ]);

        $repo->method('findByIdentifier')
            ->with('Serie', 'HP', 'SN-DUPLICATE-001')
            ->willReturn($existingAsset);

        $service = new AssetService($repo);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage("El identificador físico 'SN-DUPLICATE-001' (Serie de HP) ya se encuentra asignado");

        $service->create([
            'codigo_patrimonial' => 'TI-HP-002',
            'numero_serie' => 'SN-DUPLICATE-001',
            'nombre' => 'Segunda Laptop HP',
            'tipo' => 'Laptop',
            'marca' => 'HP',
            'modelo' => 'EliteBook',
        ], 1);
    }

    public function test_mac_and_imei_formats_are_normalized(): void
    {
        $repo = $this->createMock(AssetRepositoryInterface::class);
        $repo->method('findByPatrimonialCode')->willReturn(null);
        $repo->method('findByIdentifier')->willReturn(null);

        $capturedPayload = null;
        $repo->method('create')->willReturnCallback(function ($data) use (&$capturedPayload) {
            $capturedPayload = $data;
            return new Asset($data);
        });

        $service = new AssetService($repo);

        // Test MAC
        $service->create([
            'codigo_patrimonial' => 'TI-SW-001',
            'tipo_identificador_externo' => 'MAC',
            'identificador_alternativo' => '001a2b3c4d5e',
            'emisor_identificador_externo' => 'CISCO',
            'nombre' => 'Switch Cisco Catalyst',
            'tipo' => 'Accesorio de Red',
            'marca' => 'Cisco',
            'modelo' => 'Catalyst 2960',
        ], 1);

        $this->assertEquals('00:1A:2B:3C:4D:5E', $capturedPayload['identificador_normalizado']);

        // Test IMEI
        $service->create([
            'codigo_patrimonial' => 'TI-TEL-001',
            'tipo_identificador_externo' => 'IMEI',
            'identificador_alternativo' => '35-175605-152399-9',
            'emisor_identificador_externo' => 'SAMSUNG',
            'nombre' => 'Smartphone Corporativo',
            'tipo' => 'Otro',
            'marca' => 'Samsung',
            'modelo' => 'Galaxy A54',
        ], 1);

        $this->assertEquals('351756051523999', $capturedPayload['identificador_normalizado']);
    }

    public function test_valuation_fixture_section_13_exact_pennies(): void
    {
        // Congelar reloj en 29 de octubre de 2026, America/Lima
        Carbon::setTestNow(Carbon::parse('2026-10-29 12:00:00', 'America/Lima'));

        // Laptop HP A
        $assetA = new Asset([
            'id_activo' => 1,
            'codigo_patrimonial' => 'TI-HP-A',
            'nombre' => 'Laptop HP A',
            'costo_adquisicion' => '4800.00',
            'fecha_adquisicion' => '2025-10-29',
            'vida_util_meses' => 48,
            'estado' => 'Disponible',
        ]);

        $infoA = $assetA->depreciation_info;
        $this->assertTrue($infoA['valorable']);
        $this->assertEquals(12, $infoA['meses_uso']);
        $this->assertEquals(1200.00, $infoA['depreciacion_acumulada']);
        $this->assertEquals(3600.00, $infoA['valor_actual']);

        // Laptop HP B
        $assetB = new Asset([
            'id_activo' => 2,
            'codigo_patrimonial' => 'TI-HP-B',
            'nombre' => 'Laptop HP B',
            'costo_adquisicion' => '2400.00',
            'fecha_adquisicion' => '2026-04-29',
            'vida_util_meses' => 24,
            'estado' => 'Disponible',
        ]);

        $infoB = $assetB->depreciation_info;
        $this->assertTrue($infoB['valorable']);
        $this->assertEquals(6, $infoB['meses_uso']);
        $this->assertEquals(600.00, $infoB['depreciacion_acumulada']);
        $this->assertEquals(1800.00, $infoB['valor_actual']);

        // Total inicial de las 2 unidades
        $totalActual = $infoA['valor_actual'] + $infoB['valor_actual'];
        $this->assertEquals(5400.00, $totalActual);

        // Añadir Laptop C adquirida el mismo día por S/ 1000.00
        $assetC = new Asset([
            'id_activo' => 3,
            'codigo_patrimonial' => 'TI-HP-C',
            'nombre' => 'Laptop HP C',
            'costo_adquisicion' => '1000.00',
            'fecha_adquisicion' => '2026-10-29',
            'vida_util_meses' => 36,
            'estado' => 'Disponible',
        ]);

        $infoC = $assetC->depreciation_info;
        $this->assertEquals(0, $infoC['meses_uso']);
        $this->assertEquals(0.00, $infoC['depreciacion_acumulada']);
        $this->assertEquals(1000.00, $infoC['valor_actual']);

        // Total con C: S/ 6400.00
        $totalConC = $totalActual + $infoC['valor_actual'];
        $this->assertEquals(6400.00, $totalConC);

        // Dar de baja B: el patrimonio operativo queda en S/ 4600.00
        $totalSinB = $infoA['valor_actual'] + $infoC['valor_actual'];
        $this->assertEquals(4600.00, $totalSinB);
    }

    public function test_calendar_month_anniversary_and_february_adjustment(): void
    {
        // 31 de enero a 28 de febrero en año no bisiesto completa 1 mes exacto
        Carbon::setTestNow(Carbon::parse('2025-02-28 12:00:00', 'America/Lima'));

        $assetFeb28 = new Asset([
            'costo_adquisicion' => '1200.00',
            'fecha_adquisicion' => '2025-01-31',
            'vida_util_meses' => 12,
        ]);
        $this->assertEquals(1, $assetFeb28->depreciation_info['meses_uso']);

        // 31 de enero a 27 de febrero NO ha completado el mes
        Carbon::setTestNow(Carbon::parse('2025-02-27 12:00:00', 'America/Lima'));
        $assetFeb27 = new Asset([
            'costo_adquisicion' => '1200.00',
            'fecha_adquisicion' => '2025-01-31',
            'vida_util_meses' => 12,
        ]);
        $this->assertEquals(0, $assetFeb27->depreciation_info['meses_uso']);
    }

    public function test_missing_or_future_data_is_classified_as_pending_valuation(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-29 12:00:00', 'America/Lima'));

        $assetMissingCost = new Asset([
            'costo_adquisicion' => null,
            'fecha_adquisicion' => '2025-01-01',
            'vida_util_meses' => 36,
        ]);
        $this->assertFalse($assetMissingCost->depreciation_info['valorable']);
        $this->assertEquals('Costo de adquisición no registrado', $assetMissingCost->depreciation_info['motivo_pendiente']);

        $assetFutureDate = new Asset([
            'costo_adquisicion' => '3000.00',
            'fecha_adquisicion' => '2027-01-01',
            'vida_util_meses' => 36,
        ]);
        $this->assertFalse($assetFutureDate->depreciation_info['valorable']);
        $this->assertEquals('Fecha de adquisición futura', $assetFutureDate->depreciation_info['motivo_pendiente']);
    }
}
