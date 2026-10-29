<?php

namespace Tests\Feature;

use App\Domain\Sec\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class SecurityAndUserAdministrationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_superadmin_can_manage_users_with_spanish_schema(): void
    {
        $token = $this->login('admin@ingenieros.edu.pe', 'TestOnly-12345678');
        $email = 'crud.'.uniqid().'@ingenieros.edu.pe';

        $created = $this->withToken($token)->postJson('/api/v1/users', [
            'email' => $email,
            'full_name' => 'Usuario CRUD',
            'slack_user_id' => 'U'.strtoupper(uniqid()),
            'password' => 'Secure-Test-12345',
        ])->assertCreated()->assertJsonPath('email', $email)->json();

        $this->withToken($token)->getJson('/api/v1/users?q=Usuario%20CRUD')
            ->assertOk()->assertJsonFragment(['email' => $email]);

        $this->withToken($token)->patchJson('/api/v1/users/'.$created['user_id'], [
            'full_name' => 'Usuario CRUD Actualizado',
        ])->assertOk()->assertJsonPath('full_name', 'Usuario CRUD Actualizado');

        $this->withToken($token)->deleteJson('/api/v1/users/'.$created['user_id'])->assertOk();
        $this->assertFalse(User::query()->findOrFail($created['user_id'])->activo);
    }

    public function test_forced_password_change_revokes_existing_tokens(): void
    {
        $user = User::query()->where('correo', 'ventas@ingenieros.edu.pe')->firstOrFail();
        $user->cambiar_contrasena = true;
        $user->save();

        $token = $this->login($user->correo, 'TestOnly-12345678');
        $this->withToken($token)->getJson('/api/v1/ops')->assertStatus(428);

        $this->withToken($token)->postJson('/api/v1/auth/password', [
            'current_password' => 'TestOnly-12345678',
            'password' => 'New-1234',
            'password_confirmation' => 'New-1234',
        ])->assertOk();

        $this->withToken($token)->getJson('/api/v1/auth/me')->assertUnauthorized();
        $newToken = $this->login($user->correo, 'New-1234');
        $this->withToken($newToken)->getJson('/api/v1/ops')->assertOk();
    }

    public function test_documents_are_isolated_by_area_except_for_global_roles(): void
    {
        $ti = $this->login('ti@ingenieros.edu.pe', 'TestOnly-12345678');
        $administration = $this->login('admin_area@ingenieros.edu.pe', 'TestOnly-12345678');
        $lookups = $this->withToken($ti)->getJson('/api/v1/lookups')->assertOk()->json();
        $typeId = $lookups['doc_types'][0]['doc_type_id'];
        $salesId = collect($lookups['areas'])->firstWhere('code', 'VENTAS')['area_id'];

        $document = $this->withToken($ti)->postJson('/api/v1/documents', [
            'title' => 'Documento privado de Ventas',
            'doc_type_id' => $typeId,
            'owner_area_id' => $salesId,
        ])->assertCreated()->json();

        $this->withToken($administration)->getJson('/api/v1/documents/'.$document['document_id'])
            ->assertNotFound();
        $this->withToken($administration)->postJson('/api/v1/documents', [
            'title' => 'Intento fuera del área',
            'doc_type_id' => $typeId,
            'owner_area_id' => $salesId,
        ])->assertForbidden();
    }

    public function test_login_is_rate_limited_by_email_and_ip(): void
    {
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->withServerVariables(['REMOTE_ADDR' => '10.20.30.40'])
                ->postJson('/api/v1/auth/login', [
                    'email' => 'rate.limit@ingenieros.edu.pe',
                    'password' => 'incorrect-password',
                ])->assertUnauthorized();
        }

        $this->withServerVariables(['REMOTE_ADDR' => '10.20.30.40'])
            ->postJson('/api/v1/auth/login', [
                'email' => 'rate.limit@ingenieros.edu.pe',
                'password' => 'incorrect-password',
            ])->assertTooManyRequests();
    }

    private function login(string $email, string $password): string
    {
        return $this->postJson('/api/v1/auth/login', compact('email', 'password'))
            ->assertOk()->json('token');
    }
}
