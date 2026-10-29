<?php

namespace Tests\Feature;

use App\Domain\Sec\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class SuperAdminUserCreationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_superadmin_can_create_area_lead(): void
    {
        $token = $this->login('admin@ingenieros.edu.pe', 'TestOnly-12345678');
        $email = 'nuevo.encargado.'.uniqid().'@ingenieros.edu.pe';

        $response = $this->withToken($token)->postJson('/api/v1/team', [
            'name' => 'Nuevo Encargado de Diseño',
            'email' => $email,
            'password' => 'SecurePass-123456',
            'slack_user_id' => 'U'.strtoupper(uniqid()),
            'area' => 'DIS',
            'is_lead' => true,
        ]);

        $response->assertCreated();
        $response->assertJsonStructure(['message', 'user_id']);

        $user = User::query()->where('correo', $email)->first();
        $this->assertNotNull($user);
        $this->assertSame('Nuevo Encargado de Diseño', $user->nombre_completo);
        $this->assertSame('approved', $user->estado);
        $this->assertTrue($user->activo);
        $this->assertTrue($user->roles()->where('nombre', 'Diseno_Encargado')->exists());

        // Verificar miembros_area
        $isLead = \Illuminate\Support\Facades\DB::table('org.miembros_area')
            ->where('id_usuario', $user->id_usuario)
            ->value('es_encargado');
        $this->assertTrue((bool) $isLead);
    }

    public function test_superadmin_can_create_team_member(): void
    {
        $token = $this->login('admin@ingenieros.edu.pe', 'TestOnly-12345678');
        $email = 'colaborador.'.uniqid().'@ingenieros.edu.pe';

        $response = $this->withToken($token)->postJson('/api/v1/team', [
            'name' => 'Colaborador de TI',
            'email' => $email,
            'password' => 'SecurePass-123456',
            'slack_user_id' => 'U'.strtoupper(uniqid()),
            'area' => 'TI',
            'is_lead' => false,
        ]);

        $response->assertCreated();

        $user = User::query()->where('correo', $email)->first();
        $this->assertNotNull($user);
        $this->assertTrue($user->roles()->where('nombre', 'TI_Equipo')->exists());

        $isLead = \Illuminate\Support\Facades\DB::table('org.miembros_area')
            ->where('id_usuario', $user->id_usuario)
            ->value('es_encargado');
        $this->assertFalse((bool) $isLead);
    }

    public function test_non_superadmin_cannot_create_users_via_team_endpoint(): void
    {
        $token = $this->login('ti@ingenieros.edu.pe', 'TestOnly-12345678');

        $response = $this->withToken($token)->postJson('/api/v1/team', [
            'name' => 'Intento No Autorizado',
            'email' => 'intento@ingenieros.edu.pe',
            'password' => 'SecurePass-123456',
            'slack_user_id' => 'U'.strtoupper(uniqid()),
            'area' => 'TI',
            'is_lead' => true,
        ]);

        $response->assertStatus(403);
    }

    public function test_deleted_user_is_purged_and_orders_remain_and_email_can_be_recreated(): void
    {
        $token = $this->login('admin@ingenieros.edu.pe', 'TestOnly-12345678');
        $email = 'mkt.test.'.uniqid().'@ingenieros.edu.pe';

        // 1. SuperAdmin crea el usuario
        $createRes = $this->withToken($token)->postJson('/api/v1/team', [
            'name' => 'Encargado Temporal MKT',
            'email' => $email,
            'password' => 'SecurePass-123456',
            'slack_user_id' => 'U'.strtoupper(uniqid()),
            'area' => 'MKT',
            'is_lead' => true,
        ]);
        $createRes->assertCreated();
        $userId = $createRes->json('user_id');

        // 2. Simulamos que el usuario tiene un pedido registrado en el historial
        $orderId = \Illuminate\Support\Facades\DB::table('req.pedidos')->insertGetId([
            'area_origen' => 4,
            'area_destino' => 5,
            'solicitado_por' => $userId,
            'titulo' => 'Solicitud de Campaña',
            'descripcion' => 'Detalle de la solicitud de prueba',
            'categoria' => 'Acceso',
            'prioridad' => 'Media',
            'estado' => 'Atendido',
            'creado_en' => now(),
            'actualizado_en' => now(),
            'codigo_pedido' => 'SOL-TEST-'.uniqid(),
            'tipo_solicitud' => 'Ticket',
        ], 'id_pedido');

        // 3. SuperAdmin elimina al usuario
        $deleteRes = $this->withToken($token)->postJson("/api/v1/team/{$userId}/remove");
        $deleteRes->assertOk();

        // 4. El usuario debe haber sido completamente borrado de sec.usuarios
        $this->assertNull(User::query()->find($userId));

        // 5. El pedido debe seguir existiendo en el historial (solicitado_por pasa a null)
        $order = \Illuminate\Support\Facades\DB::table('req.pedidos')->where('id_pedido', $orderId)->first();
        $this->assertNotNull($order);
        $this->assertNull($order->solicitado_por);
        $this->assertSame('Solicitud de Campaña', $order->titulo);

        // 6. El SuperAdmin puede volver a crear un nuevo encargado con el MISMO correo sin error
        $recreateRes = $this->withToken($token)->postJson('/api/v1/team', [
            'name' => 'Nuevo Encargado Definitivo MKT',
            'email' => $email,
            'password' => 'SecurePass-123456',
            'slack_user_id' => 'U'.strtoupper(uniqid()),
            'area' => 'MKT',
            'is_lead' => true,
        ]);
        $recreateRes->assertCreated();
        $newUserId = $recreateRes->json('user_id');
        $this->assertNotSame($userId, $newUserId);

        $newUser = User::query()->find($newUserId);
        $this->assertNotNull($newUser);
        $this->assertSame('Nuevo Encargado Definitivo MKT', $newUser->nombre_completo);
        $this->assertSame($email, $newUser->correo);
    }

    private function login(string $email, string $password): string
    {
        return $this->postJson('/api/v1/auth/login', compact('email', 'password'))
            ->assertOk()->json('token');
    }
}
