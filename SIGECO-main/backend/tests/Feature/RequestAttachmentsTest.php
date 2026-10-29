<?php

namespace Tests\Feature;

use App\Domain\Req\InternalOrderAttachment;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RequestAttachmentsTest extends TestCase
{
    use DatabaseTransactions;

    public function test_every_area_can_create_requests_with_files_and_access_preview_without_ai(): void
    {
        Storage::fake('local');
        \Illuminate\Support\Facades\DB::table('cfg.configuracion_empresa')->where('id', 1)->update(['ia_habilitada' => false]);
        foreach (['admin_area', 'ventas', 'marketing', 'ti', 'rrhh', 'contabilidad', 'psicologia', 'diseno'] as $account) {
            $token = $this->postJson('/api/v1/auth/login', ['email' => $account.'@ingenieros.edu.pe', 'password' => 'TestOnly-12345678'])->assertOk()->json('token');
            $order = $this->withToken($token)->post('/api/v1/internal-orders', [
                'title' => 'Solicitud con archivos', 'description' => 'Revisar la evidencia y el documento adjunto.',
                'request_type' => 'Ticket', 'kind' => 'Servicio', 'priority' => 'Media',
                'to_area_code' => $account === 'ti' ? 'ADM' : 'TI',
                'attachments' => [UploadedFile::fake()->createWithContent('captura.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')), UploadedFile::fake()->create('documento.pdf', 50, 'application/pdf')],
            ], ['Accept' => 'application/json'])->assertCreated()->json();
            $attachments = InternalOrderAttachment::query()->where('id_pedido', $order['order_id'])->get();
            $this->assertCount(2, $attachments);
            foreach ($attachments as $attachment) {
                Storage::disk('local')->assertExists($attachment->ruta);
                $response = $this->withToken($token)->get('/api/v1/internal-orders/attachments/'.$attachment->id_adjunto.'?preview=1')->assertOk();
                $this->assertStringStartsWith('inline;', $response->headers->get('Content-Disposition'));
            }
        }
    }
}
