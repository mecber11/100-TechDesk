<?php

namespace Tests\Feature;

use App\Domain\Org\InternalArea;
use App\Domain\Sec\Role;
use App\Domain\Sec\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AreaControlFlowTest extends TestCase
{
    use DatabaseTransactions;

    public function test_ti_can_send_orders_to_areas_that_handle_them_and_ti_closes(): void
    {
        Storage::fake('local');
        $ti = $this->loginAs('ti@ingenieros.edu.pe');
        $ventas = $this->loginAs('ventas@ingenieros.edu.pe');
        $marketing = $this->loginAs('marketing@ingenieros.edu.pe');

        $id = $this->withToken($ti)->postJson('/api/v1/internal-orders', [
            'title' => 'Validar acceso del equipo de Ventas',
            'description' => 'TI solicita al área confirmar los accesos necesarios.',
            'request_type' => 'Pedido',
            'kind' => 'Acceso',
            'priority' => 'Media',
            'to_area_code' => 'VENTAS',
        ])->assertCreated()
            ->assertJsonPath('from_area.code', 'TI')
            ->assertJsonPath('to_area.code', 'VENTAS')
            ->assertJsonPath('status', 'Enviado')
            ->json('order_id');

        $ventasList = $this->withToken($ventas)->getJson('/api/v1/internal-orders?per_page=100')->assertOk();
        $incoming = collect($ventasList->json('data'))->firstWhere('order_id', $id);
        $this->assertNotNull($incoming);
        $this->assertContains('EnAtencion', $incoming['allowed_transitions']);
        $this->assertContains('Atendido', $incoming['allowed_transitions']);
        $this->withToken($ventas)->getJson('/api/v1/ops')->assertOk()
            ->assertJsonFragment(['order_id' => $id]);

        $marketingList = $this->withToken($marketing)->getJson('/api/v1/internal-orders?per_page=100')->assertOk();
        $this->assertNull(collect($marketingList->json('data'))->firstWhere('order_id', $id));
        $this->withToken($marketing)->postJson("/api/v1/internal-orders/{$id}/move", [
            'status' => 'Atendido',
            'note' => 'Respuesta desde un área ajena.',
        ])->assertStatus(409);
        $this->withToken($ti)->postJson("/api/v1/internal-orders/{$id}/move", [
            'status' => 'Atendido',
            'note' => 'TI no debe atender su propio pedido saliente.',
        ])->assertStatus(409);

        $this->withToken($ventas)->postJson("/api/v1/internal-orders/{$id}/move", [
            'status' => 'EnAtencion',
        ])->assertOk();
        $attended = $this->withToken($ventas)->post("/api/v1/internal-orders/{$id}/move", [
            'status' => 'Atendido',
            'note' => 'Accesos verificados por Ventas.',
            'attachments' => [UploadedFile::fake()->create('respuesta-ventas.pdf', 50, 'application/pdf')],
        ], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('status', 'Atendido');
        $downloadUrl = collect($attended->json('attachments'))->firstWhere('source', 'upload')['download_url'];
        $this->withToken($ventas)->get($downloadUrl)->assertOk();
        $this->withToken($marketing)->get($downloadUrl)->assertForbidden();
        $this->withToken($ti)->get($downloadUrl)->assertOk();
        $this->withToken($ti)->postJson("/api/v1/internal-orders/{$id}/move", [
            'status' => 'Cerrado',
        ])->assertOk()->assertJsonPath('status', 'Cerrado');

        $otherId = $this->withToken($ti)->postJson('/api/v1/internal-orders', [
            'title' => 'Revisar servicio de Marketing',
            'description' => 'TI requiere confirmación del área de Marketing.',
            'request_type' => 'Pedido',
            'kind' => 'Servicio',
            'priority' => 'Baja',
            'to_area_code' => 'MKT',
        ])->assertCreated()->assertJsonPath('to_area.code', 'MKT')->json('order_id');
        $marketingList = $this->withToken($marketing)->getJson('/api/v1/internal-orders?per_page=100')->assertOk();
        $this->assertNotNull(collect($marketingList->json('data'))->firstWhere('order_id', $otherId));
    }

    public function test_areas_can_choose_destinations_but_only_ti_can_escalate_to_superadmin(): void
    {
        $ti = $this->loginAs('ti@ingenieros.edu.pe');
        $ventas = $this->loginAs('ventas@ingenieros.edu.pe');
        $payload = [
            'title' => 'Pedido entre áreas',
            'description' => 'Validación del área de destino.',
            'request_type' => 'Pedido',
            'kind' => 'Servicio',
            'priority' => 'Media',
        ];

        $this->withToken($ti)->postJson('/api/v1/internal-orders', [
            ...$payload, 'to_area_code' => 'TI',
        ])->assertStatus(422);
        $this->withToken($ti)->postJson('/api/v1/internal-orders', [
            ...$payload, 'to_area_code' => 'INEXISTENTE',
        ])->assertStatus(422);
        $this->withToken($ventas)->postJson('/api/v1/internal-orders', [
            ...$payload, 'to_area_code' => 'MKT',
        ])->assertCreated()->assertJsonPath('to_area.code', 'MKT');
        $marketing = $this->loginAs('marketing@ingenieros.edu.pe');
        $directId = $this->withToken($ventas)->postJson('/api/v1/internal-orders', [
            ...$payload, 'to_area_code' => 'MKT',
        ])->assertCreated()->json('order_id');
        $this->withToken($marketing)->postJson("/api/v1/internal-orders/{$directId}/move", [
            'status' => 'Atendido', 'note' => 'Solicitud revisada por Marketing.',
        ])->assertOk();
        $this->withToken($ventas)->postJson("/api/v1/internal-orders/{$directId}/move", [
            'status' => 'Cerrado',
        ])->assertOk();
        $this->withToken($ventas)->postJson('/api/v1/internal-orders', [
            ...$payload, 'to_area_code' => 'SUPER',
        ])->assertStatus(422);
        $this->withToken($ti)->postJson('/api/v1/internal-orders', [
            ...$payload, 'to_area_code' => 'SUPER',
        ])->assertCreated()->assertJsonPath('status', 'Escalado')
            ->assertJsonPath('to_area.code', 'SUPER');
    }

    public function test_ticket_assistant_classifies_by_area_and_keeps_ambiguous_cases_for_review(): void
    {
        $ventas = $this->loginAs('ventas@ingenieros.edu.pe');
        $this->withToken($ventas)->postJson('/api/v1/internal-orders/assist', [
            'description' => 'Necesito una factura y comprobante de pago del proveedor.',
        ])->assertOk()->assertJsonPath('to_area_code', 'CONT')
            ->assertJsonPath('kind', 'Servicio');
        $this->withToken($ventas)->postJson('/api/v1/internal-orders/assist', [
            'description' => 'Necesitamos apoyo de salud mental y bienestar emocional.',
        ])->assertOk()->assertJsonPath('to_area_code', 'PSICO');
        $this->withToken($ventas)->postJson('/api/v1/internal-orders/assist', [
            'description' => 'Necesitamos resolver este asunto interno sin detalles adicionales.',
        ])->assertOk()->assertJsonPath('to_area_code', 'TI')
            ->assertJsonPath('confidence', 'baja');
        $this->withToken($ventas)->postJson('/api/v1/internal-orders/assist', [
            'description' => 'corto',
        ])->assertUnprocessable();
    }

    public function test_psychology_has_its_own_team_dashboard_and_ticket_scope(): void
    {
        $area = InternalArea::query()->where('codigo', 'PSICO')->firstOrFail();
        $lead = User::query()->create([
            'nombre_completo' => 'Encargada de Psicología',
            'correo' => 'psicologia.encargada.'.uniqid().'@ingenieros.edu.pe',
            'contrasena' => password_hash('TestOnly-12345678', PASSWORD_DEFAULT),
            'estado' => 'approved',
            'area_solicitada' => 'PSICO',
            'id_area' => $area->id_area,
            'activo' => true,
            'cambiar_contrasena' => false,
        ]);
        $lead->roles()->attach(Role::query()->where('nombre', 'Psicologia_Encargado')->firstOrFail()->id_rol);
        DB::table('org.miembros_area')->insert([
            'id_area' => $area->id_area,
            'id_usuario' => $lead->id_usuario,
            'es_encargado' => true,
            'ingresado_en' => now(),
        ]);

        $email = 'practicante.psicologia.'.uniqid().'@ingenieros.edu.pe';
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Practicante de Psicología',
            'email' => $email,
            'password' => 'TestOnly-12345678',
            'slack_user_id' => 'U'.strtoupper(uniqid()),
            'area' => 'PSICO',
        ])->assertCreated();

        $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'TestOnly-12345678'])
            ->assertForbidden();

        $leadToken = $this->loginAs($lead->correo);
        $pending = $this->withToken($leadToken)->getJson('/api/v1/team/pending')->assertOk();
        $candidate = collect($pending->json())->firstWhere('email', $email);
        $this->assertNotNull($candidate);
        $this->withToken($leadToken)->postJson("/api/v1/team/{$candidate['id']}/approve")->assertOk();

        $token = $this->loginAs($email);
        $this->withToken($token)->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('area.code', 'PSICO');
        $this->withToken($token)->getJson('/api/v1/ops')
            ->assertOk()
            ->assertJsonPath('scope.mode', 'personal')
            ->assertJsonPath('scope.area.code', 'PSICO');

        $id = $this->withToken($token)->postJson('/api/v1/internal-orders', [
            'title' => 'Solicitud de acceso para Psicología',
            'description' => 'Se requiere acceso al entorno de prácticas.',
            'request_type' => 'Ticket',
            'kind' => 'Acceso',
            'priority' => 'Media',
        ])->assertCreated()
            ->assertJsonPath('from_area.code', 'PSICO')
            ->assertJsonPath('to_area.code', 'TI')
            ->json('order_id');

        $ventas = $this->loginAs('ventas@ingenieros.edu.pe');
        $ventasOrders = $this->withToken($ventas)->getJson('/api/v1/internal-orders?per_page=100')->assertOk();
        $this->assertNull(collect($ventasOrders->json('data'))->firstWhere('order_id', $id));
        $ti = $this->loginAs('ti@ingenieros.edu.pe');
        $tiOrders = $this->withToken($ti)->getJson('/api/v1/internal-orders?per_page=100')->assertOk();
        $this->assertNotNull(collect($tiOrders->json('data'))->firstWhere('order_id', $id));
    }

    public function test_registration_and_area_lead_approval_flow(): void
    {
        $email = 'nuevo.ventas.'.uniqid().'@ingenieros.edu.pe';
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Nuevo Integrante Ventas',
            'email' => $email,
            'password' => 'TestOnly-12345678',
            'slack_user_id' => 'U'.strtoupper(uniqid()),
            'area' => 'VENTAS',
        ])->assertCreated();

        $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'TestOnly-12345678'])
            ->assertForbidden();

        $lead = $this->loginAs('ventas@ingenieros.edu.pe');
        $pending = $this->withToken($lead)->getJson('/api/v1/team/pending')->assertOk();
        $candidate = collect($pending->json())->firstWhere('email', $email);
        $this->assertNotNull($candidate);

        $this->withToken($lead)->postJson("/api/v1/team/{$candidate['id']}/approve")
            ->assertOk();

        $token = $this->loginAs($email);
        $this->withToken($token)->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('area.code', 'VENTAS')
            ->assertJsonPath('name', 'Nuevo Integrante Ventas');
    }

    public function test_ti_can_escalate_a_request_to_superadmin(): void
    {
        $ventas = $this->loginAs('ventas@ingenieros.edu.pe');
        $ti = $this->loginAs('ti@ingenieros.edu.pe');
        $superAdmin = $this->loginAs('admin@ingenieros.edu.pe');

        $id = $this->withToken($ventas)->postJson('/api/v1/internal-orders', [
            'title' => 'Incidente que requiere apoyo superior',
            'description' => 'TI requiere autorización extraordinaria para continuar.',
            'request_type' => 'Ticket',
            'kind' => 'Incidente',
            'priority' => 'Urgente',
        ])->assertCreated()->json('order_id');

        $this->withToken($ti)->postJson("/api/v1/internal-orders/{$id}/move", [
            'status' => 'Escalado',
            'note' => 'TI necesita decisión y apoyo del SuperAdmin.',
        ])->assertOk()
            ->assertJsonPath('status', 'Escalado')
            ->assertJsonPath('to_area.code', 'SUPER');

        $superList = $this->withToken($superAdmin)->getJson('/api/v1/internal-orders?per_page=100')->assertOk();
        $superOrder = collect($superList->json('data'))->firstWhere('order_id', $id);
        $this->assertContains('Atendido', $superOrder['allowed_transitions']);

        $this->withToken($superAdmin)->postJson("/api/v1/internal-orders/{$id}/move", [
            'status' => 'Atendido',
            'note' => 'SuperAdmin autorizó y resolvió el escalamiento.',
        ])->assertOk()->assertJsonPath('status', 'Atendido');
    }

    public function test_area_ticket_is_scoped_attended_by_ti_and_closed_by_requester(): void
    {
        $ventas = $this->loginAs('ventas@ingenieros.edu.pe');
        $ti = $this->loginAs('ti@ingenieros.edu.pe');
        $superAdmin = $this->loginAs('admin@ingenieros.edu.pe');

        $this->withToken($ventas)->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('area.code', 'VENTAS')
            ->assertJsonPath('name', 'Encargado de Ventas');

        $this->withToken($ventas)->getJson('/api/v1/ops')
            ->assertOk()
            ->assertJsonPath('scope.mode', 'area')
            ->assertJsonPath('scope.area.code', 'VENTAS');

        $this->withToken($ti)->getJson('/api/v1/ops')
            ->assertOk()
            ->assertJsonPath('scope.mode', 'area')
            ->assertJsonPath('scope.can_filter_areas', false);

        $this->withToken($superAdmin)->getJson('/api/v1/ops?area=VENTAS')
            ->assertOk()
            ->assertJsonPath('scope.area.code', 'VENTAS');

        $created = $this->withToken($ventas)->postJson('/api/v1/internal-orders', [
            'title' => 'Prueba de flujo por áreas',
            'description' => 'Solicitud de software para validar el circuito completo.',
            'request_type' => 'Ticket',
            'kind' => 'Software',
            'priority' => 'Alta',
        ])->assertCreated()
            ->assertJsonPath('from_area.code', 'VENTAS')
            ->assertJsonPath('to_area.code', 'TI')
            ->assertJsonPath('status', 'Enviado')
            ->json();

        $id = $created['order_id'];
        $dashboard = $this->withToken($superAdmin)->getJson('/api/v1/ops?area=VENTAS')->assertOk();
        $recent = collect($dashboard->json('recent_orders'))->firstWhere('order_id', $id);
        $this->assertSame('Prueba de flujo por áreas', $recent['title']);
        $this->assertSame('Encargado de Ventas', $recent['requested_by_name']);
        $this->assertSame('VENTAS', $dashboard->json('scope.area.code'));
        $this->assertNotEmpty($dashboard->json('orders_by_status.0.status'));
        $this->assertArrayHasKey('qty', $dashboard->json('orders_by_status.0'));
        $this->assertArrayHasKey('period', $dashboard->json('monthly_activity.0'));

        $tiList = $this->withToken($ti)->getJson('/api/v1/internal-orders?per_page=100')->assertOk();
        $tiOrder = collect($tiList->json('data'))->firstWhere('order_id', $id);
        $this->assertSame('Encargado de Ventas', $tiOrder['requested_by']['full_name']);
        $this->assertSame('ventas@ingenieros.edu.pe', $tiOrder['requested_by']['email']);
        $this->assertContains('EnAtencion', $tiOrder['allowed_transitions']);
        $this->assertContains('Escalado', $tiOrder['allowed_transitions']);

        $this->withToken($ti)->postJson("/api/v1/internal-orders/{$id}/move", [
            'status' => 'EnAtencion',
        ])->assertOk()->assertJsonPath('status', 'EnAtencion');

        $this->withToken($ti)->postJson("/api/v1/internal-orders/{$id}/move", [
            'status' => 'Atendido',
            'note' => 'Software instalado y validado.',
        ])->assertOk()->assertJsonPath('status', 'Atendido');

        $requesterList = $this->withToken($ventas)->getJson('/api/v1/internal-orders?per_page=100')->assertOk();
        $requesterOrder = collect($requesterList->json('data'))->firstWhere('order_id', $id);
        $this->assertContains('Cerrado', $requesterOrder['allowed_transitions']);

        $this->withToken($ventas)->postJson("/api/v1/internal-orders/{$id}/move", [
            'status' => 'Cerrado',
        ])->assertOk()->assertJsonPath('status', 'Cerrado');

        $this->withToken($ventas)->getJson('/api/v1/team')
            ->assertOk()
            ->assertJsonFragment(['area' => 'Ventas']);

        $this->withToken($ventas)->getJson('/api/v1/lookups')
            ->assertOk()
            ->assertJsonPath('order_kinds', ['Documentación', 'Equipo', 'Software', 'Acceso', 'Incidente', 'Servicio', 'Otro']);
    }

    public function test_transition_stores_private_files_and_google_drive_links(): void
    {
        Storage::fake('local');
        $ventas = $this->loginAs('ventas@ingenieros.edu.pe');
        $ti = $this->loginAs('ti@ingenieros.edu.pe');

        $id = $this->withToken($ventas)->postJson('/api/v1/internal-orders', [
            'title' => 'Evidencias para atención',
            'description' => 'Validar comentarios y archivos del flujo.',
            'request_type' => 'Ticket',
            'kind' => 'Servicio',
            'priority' => 'Media',
        ])->assertCreated()->json('order_id');

        $response = $this->withToken($ti)->post("/api/v1/internal-orders/{$id}/move", [
            'status' => 'Atendido',
            'note' => 'Se adjuntan acta, evidencia y carpeta compartida.',
            'attachments' => [UploadedFile::fake()->create('evidencia.png', 100, 'image/png')],
            'drive_links' => ['https://drive.google.com/file/d/evidencia/view'],
        ], ['Accept' => 'application/json'])->assertOk();

        $attachments = collect($response->json('attachments'));
        $upload = $attachments->firstWhere('source', 'upload');
        $drive = $attachments->firstWhere('source', 'google_drive');

        $this->assertNotNull($upload);
        $this->assertSame('evidencia.png', $upload['original_name']);
        $this->assertStringContainsString('/api/v1/internal-orders/attachments/', $upload['download_url']);
        $this->assertNotNull($drive);
        $this->assertSame('https://drive.google.com/file/d/evidencia/view', $drive['external_url']);

        $this->withToken($ventas)->get($upload['download_url'])->assertOk();
    }

    public function test_document_contract_remains_compatible_after_spanish_database_migration(): void
    {
        $admin = $this->loginAs('admin_area@ingenieros.edu.pe');
        $lookups = $this->withToken($admin)->getJson('/api/v1/lookups')->assertOk();
        $type = $lookups->json('doc_types.0');
        $area = collect($lookups->json('areas'))->firstWhere('code', 'ADM');

        $this->assertNotEmpty($type['doc_type_id']);
        $this->assertNotEmpty($type['name']);
        $this->assertNotNull($area);

        $document = $this->withToken($admin)->postJson('/api/v1/documents', [
            'title' => 'Documento de prueba de compatibilidad',
            'doc_type_id' => $type['doc_type_id'],
            'owner_area_id' => $area['area_id'],
            'summary' => 'Valida el contrato público sobre la base física en español.',
            'body_text' => 'Contenido de prueba.',
        ])->assertCreated()
            ->assertJsonPath('title', 'Documento de prueba de compatibilidad')
            ->assertJsonPath('status', 'Borrador')
            ->assertJsonPath('owner_area.code', 'ADM')
            ->json();

        $this->withToken($admin)->postJson("/api/v1/documents/{$document['document_id']}/publish")
            ->assertOk()
            ->assertJsonPath('status', 'Vigente');

        $this->withToken($admin)->getJson('/api/v1/documents?per_page=100')
            ->assertOk()
            ->assertJsonFragment(['title' => 'Documento de prueba de compatibilidad']);
    }

    public function test_orders_can_be_filtered_by_day_month_and_year(): void
    {
        $ventas = $this->loginAs('ventas@ingenieros.edu.pe');
        $id = $this->withToken($ventas)->postJson('/api/v1/internal-orders', [
            'title' => 'Solicitud para comprobar filtros de fecha',
            'description' => 'Registro controlado para validar día, mes y año.',
            'request_type' => 'Ticket',
            'kind' => 'Servicio',
            'priority' => 'Media',
        ])->assertCreated()->json('order_id');

        DB::table('req.pedidos')->where('id_pedido', $id)->update(['creado_en' => '2025-05-17 10:30:00']);

        foreach (['day=2025-05-17', 'month=2025-05', 'year=2025'] as $filter) {
            $ids = collect($this->withToken($ventas)->getJson("/api/v1/internal-orders?{$filter}&per_page=100")->assertOk()->json('data'))->pluck('order_id');
            $this->assertContains($id, $ids);
        }

        $ids = collect($this->withToken($ventas)->getJson('/api/v1/internal-orders?day=2025-05-18&per_page=100')->assertOk()->json('data'))->pluck('order_id');
        $this->assertNotContains($id, $ids);
    }

    private function loginAs(string $email): string
    {
        return $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'TestOnly-12345678',
        ])->assertOk()->json('token');
    }

    public function test_document_upload_is_versioned_downloadable_and_scoped(): void
    {
        Storage::fake('local');
        $admin = $this->loginAs('admin_area@ingenieros.edu.pe');
        $lookups = $this->withToken($admin)->getJson('/api/v1/lookups')->assertOk()->json();
        $area = collect($lookups['areas'])->firstWhere('code', 'ADM');
        $payload = [
            'title' => 'Nueva resolución institucional',
            'doc_type_id' => $lookups['doc_types'][0]['doc_type_id'],
            'owner_area_id' => $area['area_id'],
            'file' => UploadedFile::fake()->create('resolucion.pdf', 100, 'application/pdf'),
        ];
        $created = $this->withToken($admin)->post('/api/v1/documents', $payload, ['Accept' => 'application/json'])
            ->assertCreated()->json();
        $path = $created['enlace_archivo'];
        Storage::disk('local')->assertExists($path);
        $this->assertSame($path, $created['versions'][0]['enlace_archivo']);
        $this->withToken($admin)->get($created['file_url'])->assertOk()
            ->assertDownload('resolucion.pdf');
        $previewResponse = $this->withToken($admin)->get($created['file_url'].'?preview=1')->assertOk();
        $this->assertStringStartsWith('inline;', $previewResponse->headers->get('Content-Disposition'));
        $ventas = $this->loginAs('ventas@ingenieros.edu.pe');
        $this->withToken($ventas)->getJson($created['file_url'])->assertForbidden();
        $this->withToken($admin)->post('/api/v1/documents', [
            ...$payload, 'file' => UploadedFile::fake()->create('programa.exe', 10, 'application/octet-stream'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();
        $this->withToken($admin)->post('/api/v1/documents', [
            ...$payload, 'file' => UploadedFile::fake()->create('grande.pdf', 10241, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();
        $filesBefore = Storage::disk('local')->allFiles('documents');
        $this->withToken($admin)->post('/api/v1/documents', [
            ...$payload, 'doc_type_id' => 32767,
            'file' => UploadedFile::fake()->create('fallido.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();
        $this->assertSame($filesBefore, Storage::disk('local')->allFiles('documents'));
        $this->withToken($ventas)->deleteJson('/api/v1/documents/'.$created['document_id'])->assertForbidden();
        Storage::disk('local')->assertExists($path);
        $this->withToken($admin)->deleteJson('/api/v1/documents/'.$created['document_id'])->assertOk();
        Storage::disk('local')->assertMissing($path);
        $this->assertDatabaseMissing('docs.documentos', ['id_documento' => $created['document_id']]);
        $this->assertDatabaseMissing('docs.versiones_documento', ['id_documento' => $created['document_id']]);
        $this->withToken($admin)->getJson($created['file_url'])->assertNotFound();
    }

    public function test_agent_ticket_uses_authenticated_member_and_preserves_identity(): void
    {
        $area = InternalArea::query()->where('codigo', 'MKT')->firstOrFail();
        $member = User::query()->create([
            'nombre_completo' => 'Miembro Marketing Prueba',
            'correo' => 'miembro.marketing.'.uniqid().'@ingenieros.edu.pe',
            'contrasena' => password_hash('TestOnly-12345678', PASSWORD_DEFAULT),
            'estado' => 'approved', 'area_solicitada' => 'MKT',
            'id_area' => $area->id_area, 'activo' => true, 'cambiar_contrasena' => false,
        ]);
        DB::table('org.miembros_area')->insert([
            'id_area' => $area->id_area, 'id_usuario' => $member->id_usuario,
            'es_encargado' => false, 'ingresado_en' => now(),
        ]);
        $token = $this->loginAs($member->correo);
        $suggestion = $this->withToken($token)->postJson('/api/v1/internal-orders/assist', [
            'description' => 'Necesito actualizar el cronograma de la página web.',
        ])->assertOk()->json();
        $created = $this->withToken($token)->post('/api/v1/internal-orders', [
            ...array_intersect_key($suggestion, array_flip(['title', 'description', 'request_type', 'kind', 'priority', 'to_area_code'])),
            'solicitado_por' => 1, 'correo_solicitante' => 'otro@example.com',
        ], ['Accept' => 'application/json'])->assertCreated()
            ->assertJsonPath('requested_by_user_id', $member->id_usuario)
            ->assertJsonPath('requested_by_email', $member->correo)
            ->assertJsonPath('requested_by_name', $member->nombre_completo)->json();
        $id = $created['order_id'];
        $ti = $this->loginAs('ti@ingenieros.edu.pe');
        $member->delete();
        $order = collect($this->withToken($ti)->getJson('/api/v1/internal-orders?per_page=100')
            ->assertOk()->json('data'))->firstWhere('order_id', $id);
        $this->assertNull($order['requested_by_user_id']);
        $this->assertSame($member->correo, $order['requested_by_email']);
        $recent = collect($this->withToken($ti)->getJson('/api/v1/ops')->assertOk()
            ->json('recent_orders'))->firstWhere('order_id', $id);
        $this->assertSame($member->correo, $recent['requested_by_email']);
    }
}
