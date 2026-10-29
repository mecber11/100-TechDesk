<?php

namespace Tests\Feature;

use App\Domain\Sec\User;
use App\Domain\Sec\Role;
use App\Domain\Org\InternalArea;
use App\Domain\Req\InternalOrderAttachment;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PersonalRequestPrivacyTest extends TestCase
{
    use DatabaseTransactions;

    public function test_members_cannot_read_peer_requests_metrics_attachments_or_change_status(): void
    {
        Storage::fake('local');
        $area = InternalArea::query()->where('codigo', 'VENTAS')->firstOrFail();
        $tokens = [];
        foreach ([1, 2] as $number) {
            $user = User::query()->create(['correo' => 'privacy.'.uniqid().'@example.com', 'nombre_completo' => 'Integrante '.$number,
                'contrasena' => password_hash('TestOnly-12345678', PASSWORD_DEFAULT), 'estado' => 'approved', 'activo' => true,
                'cambiar_contrasena' => false, 'id_area' => $area->id_area]);
            $user->roles()->attach(Role::query()->where('nombre', 'Ventas_Equipo')->value('id_rol'));
            $tokens[] = $this->postJson('/api/v1/auth/login', ['email' => $user->correo, 'password' => 'TestOnly-12345678'])->assertOk()->json('token');
        }
        $order = $this->withToken($tokens[0])->post('/api/v1/internal-orders', ['title' => 'Solicitud privada', 'description' => 'Información exclusiva del solicitante.',
            'request_type' => 'Ticket', 'kind' => 'Servicio', 'priority' => 'Media', 'to_area_code' => 'TI',
            'attachments' => [UploadedFile::fake()->create('evidencia.pdf', 30, 'application/pdf')]], ['Accept' => 'application/json'])->assertCreated()->json();
        $id = $order['order_id'];
        $attachment = InternalOrderAttachment::query()->where('id_pedido', $id)->firstOrFail();
        $this->withToken($tokens[1])->getJson('/api/v1/internal-orders')->assertOk()->assertJsonPath('total', 0);
        $this->withToken($tokens[1])->getJson('/api/v1/internal-orders/'.$id)->assertNotFound();
        $this->withToken($tokens[1])->get('/api/v1/internal-orders/attachments/'.$attachment->id_adjunto)->assertForbidden();
        $this->withToken($tokens[1])->postJson('/api/v1/internal-orders/'.$id.'/move', ['status' => 'Atendido', 'note' => 'Intento ajeno'])->assertStatus(409);
        $this->withToken($tokens[1])->getJson('/api/v1/ops')->assertOk()->assertJsonPath('scope.mode', 'personal')->assertJsonPath('kpis.0.value', 0)->assertJsonCount(0, 'recent_orders');
        $this->withToken($tokens[1])->getJson('/api/v1/ops?area=VENTAS')->assertForbidden();
        $this->withToken($tokens[0])->getJson('/api/v1/ops?personal=1')->assertOk()->assertJsonPath('kpis.0.value', 1);
        $lead = $this->postJson('/api/v1/auth/login', ['email' => 'ventas@ingenieros.edu.pe', 'password' => 'TestOnly-12345678'])->assertOk()->json('token');
        $this->withToken($lead)->getJson('/api/v1/internal-orders/'.$id)->assertOk();
        $this->withToken($lead)->getJson('/api/v1/ops?personal=1')->assertOk()->assertJsonPath('kpis.0.value', 0);
        $this->withToken($lead)->getJson('/api/v1/ops?area=VENTAS')->assertOk()->assertJsonPath('scope.mode', 'area');
        $sender = $this->postJson('/api/v1/auth/login', ['email' => 'marketing@ingenieros.edu.pe', 'password' => 'TestOnly-12345678'])->assertOk()->json('token');
        $received = $this->withToken($sender)->post('/api/v1/internal-orders', ['title' => 'Solicitud para Ventas', 'description' => 'Atención por cualquier integrante del equipo.',
            'request_type' => 'Pedido', 'kind' => 'Servicio', 'priority' => 'Media', 'to_area_code' => 'VENTAS',
            'attachments' => [UploadedFile::fake()->create('pedido.pdf', 20, 'application/pdf')]], ['Accept' => 'application/json'])->assertCreated()->json('order_id');
        $receivedAttachment = InternalOrderAttachment::query()->where('id_pedido', $received)->firstOrFail();
        foreach ($tokens as $memberToken) {
            $this->withToken($memberToken)->getJson('/api/v1/internal-orders/'.$received)->assertOk();
            $this->withToken($memberToken)->get('/api/v1/internal-orders/attachments/'.$receivedAttachment->id_adjunto)->assertOk();
        }
        $this->withToken($tokens[0])->postJson('/api/v1/internal-orders/'.$received.'/move', ['status' => 'EnAtencion'])->assertOk();
        $this->withToken($tokens[1])->postJson('/api/v1/internal-orders/'.$received.'/move', ['status' => 'Atendido', 'note' => 'Resuelto por otro miembro del equipo.'])->assertOk();
        $this->withToken($tokens[1])->getJson('/api/v1/ops?personal=1')->assertOk()->assertJsonPath('kpis.0.value', 0);
        $this->withToken($tokens[1])->postJson('/api/v1/internal-orders/'.$received.'/move', ['status' => 'Cerrado'])->assertStatus(409);
        $this->withToken($sender)->postJson('/api/v1/internal-orders/'.$received.'/move', ['status' => 'Cerrado'])->assertOk();
    }
}
