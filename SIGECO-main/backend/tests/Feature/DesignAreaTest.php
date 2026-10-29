<?php

namespace Tests\Feature;

use App\Domain\Org\InternalArea;
use App\Domain\Sec\Role;
use App\Domain\Sec\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class DesignAreaTest extends TestCase
{
    use DatabaseTransactions;

    public function test_design_area_exists_and_has_roles(): void
    {
        $area = InternalArea::where('codigo', 'DIS')->first();
        $this->assertNotNull($area);
        $this->assertSame('Diseño', $area->nombre);

        $encargadoRole = Role::where('nombre', 'Diseno_Encargado')->first();
        $equipoRole = Role::where('nombre', 'Diseno_Equipo')->first();

        $this->assertNotNull($encargadoRole);
        $this->assertNotNull($equipoRole);
    }

    public function test_ticket_assistant_classifies_image_and_cover_requests_to_design(): void
    {
        $user = User::where('correo', 'ti@ingenieros.edu.pe')->first();
        $assistant = app(\App\Business\InternalOrders\TicketAssistantService::class);

        // Prueba de creación de imágenes y portadas
        $result1 = $assistant->suggest('necesito la creacion de imagenes para portadas del curso', $user);
        $this->assertSame('DIS', $result1['to_area_code']);
        $this->assertSame('alta', $result1['confidence']);

        // Prueba de modificación de fotos y retoques
        $result2 = $assistant->suggest('solicito modificar fotos del curso y retocar las imagenes de portada', $user);
        $this->assertSame('DIS', $result2['to_area_code']);
        $this->assertSame('alta', $result2['confidence']);
    }

    public function test_registration_with_dis_assigns_design_team(): void
    {
        $email = 'practicante.diseno.'.uniqid().'@ingenieros.edu.pe';
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Practicante de Diseño',
            'email' => $email,
            'password' => 'TestOnly-12345678',
            'slack_user_id' => 'U'.strtoupper(uniqid()),
            'area' => 'DIS',
        ])->assertCreated();

        $user = User::where('correo', $email)->first();
        $this->assertNotNull($user);
        $this->assertSame('DIS', $user->area_solicitada);
        $this->assertTrue($user->roles()->where('nombre', 'Diseno_Equipo')->exists());
    }

    public function test_design_lead_can_manage_dashboard_and_team(): void
    {
        $token = $this->loginAs('diseno@ingenieros.edu.pe');

        // Acceso al perfil
        $this->withToken($token)->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('area.code', 'DIS')
            ->assertJsonPath('name', 'Encargado de Diseño');

        // Acceso al panel de operaciones
        $this->withToken($token)->getJson('/api/v1/ops')
            ->assertOk()
            ->assertJsonPath('scope.mode', 'area')
            ->assertJsonPath('scope.area.code', 'DIS');

        // Acceso a la gestión del equipo
        $this->withToken($token)->getJson('/api/v1/team')
            ->assertOk();
    }

    private function loginAs(string $email): string
    {
        return $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'TestOnly-12345678',
        ])->assertOk()->json('token');
    }
}
