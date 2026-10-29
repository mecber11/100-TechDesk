<?php

namespace Tests\Feature;

use App\Business\Notifications\SlackTicketService;
use App\Domain\Req\InternalOrder;
use App\Domain\Req\SlackNotice;
use App\Domain\Sec\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SlackTicketTest extends TestCase
{
    use DatabaseTransactions;

    private function token(string $email): string
    {
        return $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'TestOnly-12345678'])
            ->assertOk()->json('token');
    }

    private function fakeSlack(): void
    {
        Http::swap(new \Illuminate\Http\Client\Factory());
        Http::preventStrayRequests();
        config(['services.slack.notifications.bot_user_oauth_token' => 'test-token']);
        Http::fake([
            'slack.com/api/conversations.open' => Http::response(['ok' => true, 'channel' => ['id' => 'DTEST12345']]),
            'slack.com/api/chat.postMessage' => Http::response(['ok' => true, 'ts' => '123.456']),
        ]);
    }

    private function createTicket(string $token, string $destination): int
    {
        return $this->withToken($token)->postJson('/api/v1/internal-orders', [
            'title' => 'Ticket Slack', 'description' => 'Aviso dirigido a una sola área.',
            'request_type' => 'Ticket', 'kind' => 'Servicio', 'priority' => 'Media',
            'to_area_code' => $destination,
        ])->assertCreated()->json('order_id');
    }

    public function test_registration_requires_valid_unique_slack_id(): void
    {
        $data = ['name' => 'Miembro Slack', 'email' => 'slack.test@ingenieros.edu.pe', 'password' => 'TestOnly-12345678', 'area' => 'MKT'];
        $this->postJson('/api/v1/auth/register', $data)->assertUnprocessable()->assertJsonValidationErrors('slack_user_id');
        $this->postJson('/api/v1/auth/register', [...$data, 'slack_user_id' => '@nombre'])->assertUnprocessable();
        $this->postJson('/api/v1/auth/register', [...$data, 'slack_user_id' => ' u012abcdef0 '])->assertCreated();
        $this->assertDatabaseHas('sec.usuarios', ['correo' => $data['email'], 'slack_user_id' => 'U012ABCDEF0']);
        $this->postJson('/api/v1/auth/register', [...$data, 'email' => 'otro.slack@ingenieros.edu.pe', 'slack_user_id' => 'U012ABCDEF0'])
            ->assertUnprocessable()->assertJsonValidationErrors('slack_user_id');
    }

    public function test_only_destination_lead_receives_direct_message_and_no_duplicate(): void
    {
        $this->fakeSlack();
        User::query()->where('correo', 'ti@ingenieros.edu.pe')->update(['slack_user_id' => 'U000000001']);
        User::query()->where('correo', 'marketing@ingenieros.edu.pe')->update(['slack_user_id' => 'U000000002']);
        $id = $this->createTicket($this->token('ventas@ingenieros.edu.pe'), 'TI');
        Http::assertSent(fn ($r) => str_ends_with($r->url(), 'conversations.open') && $r['users'] === 'U000000001');
        Http::assertNotSent(fn ($r) => ($r['users'] ?? null) === 'U000000002');
        Http::assertSent(fn ($r) => str_ends_with($r->url(), 'chat.postMessage') && $r['channel'] === 'DTEST12345' && str_contains($r['text'], 'ventas@ingenieros.edu.pe'));
        $this->assertDatabaseHas('req.avisos_slack', ['id_pedido' => $id, 'estado' => 'enviado', 'slack_destinatario' => 'U000000001']);
        $this->withToken($this->token('ti@ingenieros.edu.pe'))->getJson("/api/v1/internal-orders/{$id}")
            ->assertOk()->assertJsonPath('order_id', $id)->assertJsonPath('slack_status', 'enviado');
        $this->withToken($this->token('marketing@ingenieros.edu.pe'))->getJson("/api/v1/internal-orders/{$id}")->assertNotFound();
        app(SlackTicketService::class)->notify(InternalOrder::query()->findOrFail($id), 'creado');
        Http::assertSentCount(2);
    }

    public function test_selected_marketing_destination_does_not_notify_ti(): void
    {
        $this->fakeSlack();
        User::query()->where('correo', 'ti@ingenieros.edu.pe')->update(['slack_user_id' => 'U000000001']);
        User::query()->where('correo', 'marketing@ingenieros.edu.pe')->update(['slack_user_id' => 'U000000002']);
        $this->createTicket($this->token('ventas@ingenieros.edu.pe'), 'MKT');
        Http::assertSent(fn ($r) => ($r['users'] ?? null) === 'U000000002');
        Http::assertNotSent(fn ($r) => ($r['users'] ?? null) === 'U000000001');
    }

    public function test_slack_error_keeps_ticket_and_retries_pending_notice(): void
    {
        config(['services.slack.notifications.bot_user_oauth_token' => 'test-token']);
        Http::fake(['slack.com/api/*' => Http::response(['ok' => false, 'error' => 'missing_scope'])]);
        User::query()->where('correo', 'ti@ingenieros.edu.pe')->update(['slack_user_id' => 'U000000001']);
        $id = $this->createTicket($this->token('ventas@ingenieros.edu.pe'), 'TI');
        $this->assertDatabaseHas('req.avisos_slack', ['id_pedido' => $id, 'estado' => 'pendiente', 'error' => 'Slack: missing_scope']);
        $this->travel(6)->minutes();
        $this->fakeSlack();
        $this->artisan('slack:send-pending')->assertSuccessful();
        $this->assertDatabaseHas('req.avisos_slack', ['id_pedido' => $id, 'estado' => 'enviado']);
    }

    public function test_escalation_notifies_only_superadmin(): void
    {
        $this->fakeSlack();
        User::query()->where('correo', 'ti@ingenieros.edu.pe')->update(['slack_user_id' => 'U000000001']);
        User::query()->where('correo', 'admin@ingenieros.edu.pe')->update(['slack_user_id' => 'U000000003']);
        $id = $this->createTicket($this->token('ventas@ingenieros.edu.pe'), 'TI');
        $this->withToken($this->token('ti@ingenieros.edu.pe'))->postJson("/api/v1/internal-orders/{$id}/move", [
            'status' => 'Escalado', 'note' => 'Se requiere autorización del administrador general.',
        ])->assertOk();
        $this->assertDatabaseHas('req.avisos_slack', ['id_pedido' => $id, 'evento' => 'escalado', 'estado' => 'enviado', 'slack_destinatario' => 'U000000003']);
        Http::assertSentCount(4);
    }

    public function test_missing_configuration_does_not_send_and_pending_destination_is_respected(): void
    {
        Http::fake();
        $id = $this->createTicket($this->token('ventas@ingenieros.edu.pe'), 'TI');
        Http::assertNothingSent();
        $this->assertDatabaseHas('req.avisos_slack', ['id_pedido' => $id, 'estado' => 'pendiente']);
        $this->withToken($this->token('ti@ingenieros.edu.pe'))->postJson("/api/v1/internal-orders/{$id}/move", [
            'status' => 'Escalado', 'note' => 'Requiere autorización.',
        ])->assertOk();
        $this->travel(6)->minutes();
        $this->fakeSlack();
        User::query()->where('correo', 'admin@ingenieros.edu.pe')->update(['slack_user_id' => 'U000000003']);
        $this->artisan('slack:send-pending')->assertSuccessful();
        $this->assertDatabaseHas('req.avisos_slack', ['id_pedido' => $id, 'evento' => 'creado', 'estado' => 'cancelado']);
        Http::assertSentCount(2);
    }

    public function test_manager_can_configure_own_slack_but_not_other_area(): void
    {
        $ti = User::query()->where('correo', 'ti@ingenieros.edu.pe')->firstOrFail();
        $mkt = User::query()->where('correo', 'marketing@ingenieros.edu.pe')->firstOrFail();
        $token = $this->token($ti->correo);
        $this->withToken($token)->putJson("/api/v1/team/{$ti->id_usuario}/slack", ['slack_user_id' => 'U000000001'])->assertOk();
        $this->withToken($token)->putJson("/api/v1/team/{$mkt->id_usuario}/slack", ['slack_user_id' => 'U000000002'])->assertForbidden();
        $this->withToken($token)->getJson('/api/v1/team')->assertOk()->assertJsonFragment(['slack_user_id' => 'U000000001']);
    }

    public function test_missing_or_ambiguous_lead_never_broadcasts(): void
    {
        $this->fakeSlack();
        $lead = User::query()->where('correo', 'ti@ingenieros.edu.pe')->firstOrFail();
        $lead->slack_user_id = null;
        $lead->save();
        $id = $this->createTicket($this->token('ventas@ingenieros.edu.pe'), 'TI');
        Http::assertNothingSent();
        $this->assertDatabaseHas('req.avisos_slack', ['id_pedido' => $id, 'estado' => 'pendiente', 'error' => 'El encargado no tiene ID de Slack registrado.']);
        $second = User::query()->create([
            'nombre_completo' => 'Segundo encargado', 'correo' => 'segundo.ti@ingenieros.edu.pe',
            'contrasena' => password_hash('TestOnly-12345678', PASSWORD_DEFAULT),
            'activo' => true, 'estado' => 'approved', 'id_area' => $lead->id_area,
            'slack_user_id' => 'U000000005',
        ]);
        $second->roles()->attach($lead->roles()->pluck('sec.roles.id_rol'));
        $otherId = $this->createTicket($this->token('ventas@ingenieros.edu.pe'), 'TI');
        Http::assertNothingSent();
        $this->assertDatabaseHas('req.avisos_slack', ['id_pedido' => $otherId, 'estado' => 'pendiente', 'error' => 'El destino debe tener exactamente un encargado activo.']);
    }
}
