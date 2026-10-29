<?php

namespace Tests\Feature;

use App\Business\Notifications\SlackTicketService;
use App\Domain\Sec\Role;
use App\Domain\Sec\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PlatformConfigurationTest extends TestCase
{
    use DatabaseTransactions;

    private function companyToken(): string
    {
        return $this->postJson('/api/v1/auth/login', ['email' => 'admin@ingenieros.edu.pe', 'password' => 'TestOnly-12345678'])
            ->assertOk()->json('token');
    }

    private function platform(): array
    {
        $user = User::query()->create([
            'correo' => 'platform.'.uniqid().'@example.com', 'nombre_completo' => 'Plataforma',
            'contrasena' => password_hash('PlatformTest-12345678', PASSWORD_DEFAULT),
            'activo' => true, 'estado' => 'approved', 'cambiar_contrasena' => false,
        ]);
        $user->roles()->attach(Role::query()->where('nombre', 'Plataforma_Admin')->value('id_rol'));
        $token = $this->postJson('/api/v1/auth/login', ['email' => $user->correo, 'password' => 'PlatformTest-12345678'])
            ->assertOk()->json('token');
        return [$user, $token];
    }

    public function test_company_admin_keeps_operations_but_cannot_configure_platform(): void
    {
        $token = $this->companyToken();
        $this->withToken($token)->getJson('/api/v1/auth/me')->assertOk()->assertJsonFragment(['Administrador_Empresa']);
        $this->withToken($token)->getJson('/api/v1/areas')->assertOk();
        $this->withToken($token)->getJson('/api/v1/platform/settings')->assertForbidden();
        $this->withToken($token)->putJson('/api/v1/platform/settings', $this->values(false))->assertForbidden();
    }

    public function test_platform_can_change_modules_and_audit_without_accessing_operations(): void
    {
        [$user, $token] = $this->platform();
        $this->withToken($token)->getJson('/api/v1/platform/settings')->assertOk();
        $this->withToken($token)->putJson('/api/v1/platform/settings', $this->values(false))->assertOk()->assertJsonPath('ia_habilitada', false);
        $this->assertDatabaseHas('cfg.historial_configuracion', ['id_usuario' => $user->id_usuario]);
        foreach (['areas', 'team', 'internal-orders', 'documents', 'ops'] as $path) {
            $this->withToken($token)->getJson('/api/v1/'.$path)->assertForbidden();
        }
    }

    public function test_disabled_modules_block_api_and_reenable_without_deleting_data(): void
    {
        [, $platformToken] = $this->platform();
        $companyToken = $this->companyToken();
        $documents = DB::table('docs.documentos')->count();
        $this->withToken($platformToken)->putJson('/api/v1/platform/settings', $this->values(false))->assertOk();
        $this->withToken($companyToken)->getJson('/api/v1/modules')->assertOk()->assertExactJson(['ia' => false, 'documentos' => false, 'slack' => false]);
        $this->withToken($companyToken)->postJson('/api/v1/internal-orders/assist', ['description' => 'Necesito soporte para el correo corporativo'])->assertForbidden()->assertJsonPath('code', 'MODULE_DISABLED');
        $this->withToken($companyToken)->getJson('/api/v1/documents')->assertForbidden();
        $this->withToken($companyToken)->getJson('/api/v1/internal-orders')->assertOk();
        $this->assertSame(0, app(SlackTicketService::class)->retryPending());
        Http::assertNothingSent();
        $this->assertSame($documents, DB::table('docs.documentos')->count());
        $this->withToken($platformToken)->putJson('/api/v1/platform/settings', $this->values(true))->assertOk();
        $this->withToken($companyToken)->getJson('/api/v1/documents')->assertOk();
        $this->withToken($companyToken)->postJson('/api/v1/internal-orders/assist', ['description' => 'Necesito soporte para el correo corporativo', 'from_area_id' => DB::table('org.areas')->where('codigo', 'ADM')->value('id_area')])->assertOk();
    }

    public function test_company_cannot_modify_or_delete_platform_accounts(): void
    {
        [$user] = $this->platform();
        $token = $this->companyToken();
        $this->withToken($token)->putJson('/api/v1/users/'.$user->id_usuario, ['full_name' => 'Alterado'])->assertForbidden();
        $this->withToken($token)->deleteJson('/api/v1/users/'.$user->id_usuario)->assertForbidden();
        $this->withToken($token)->postJson('/api/v1/team/'.$user->id_usuario.'/suspend')->assertForbidden();
        $this->withToken($token)->deleteJson('/api/v1/team/'.$user->id_usuario)->assertForbidden();
        $this->assertTrue($user->fresh()->activo);
    }

    private function values(bool $enabled): array
    {
        return ['nombre_empresa' => 'Empresa de prueba', 'ia_habilitada' => $enabled, 'documentos_habilitados' => $enabled, 'slack_habilitado' => $enabled];
    }

    public function test_platform_provisioning_creates_separate_account_without_default_password(): void
    {
        $email = 'new.platform.'.uniqid().'@example.com';
        $this->artisan('platform:create-admin', ['email' => $email])
            ->expectsQuestion('Contraseña (mínimo 8 caracteres)', 'Abcd1234')
            ->expectsQuestion('Repite la contraseña', 'Abcd1234')
            ->assertSuccessful();
        $user = User::query()->where('correo', $email)->firstOrFail();
        $this->assertTrue(password_verify('Abcd1234', $user->contrasena));
        $this->assertNull($user->id_area);
        $this->assertSame(['Plataforma_Admin'], $user->roles->pluck('nombre')->all());
        $this->artisan('platform:create-admin', ['email' => 'admin@ingenieros.edu.pe'])->assertFailed();
    }
}
