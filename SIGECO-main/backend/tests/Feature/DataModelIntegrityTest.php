<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DataModelIntegrityTest extends TestCase
{
    use DatabaseTransactions;

    public function test_operational_model_has_no_isolated_tables_and_uses_real_foreign_keys(): void
    {
        $text = file_get_contents(base_path('../database/ERD_SIGECO_Operativo.dbml'));
        preg_match_all('/^Table ([\w.]+)/m', $text, $tables);
        preg_match_all('/^Ref: ([\w]+\.[\w]+)\.[\w]+ > ([\w]+\.[\w]+)\.[\w]+/m', $text, $refs, PREG_SET_ORDER);
        $connected = [];
        foreach ($refs as $ref) {
            $connected[$ref[1]] = true;
            $connected[$ref[2]] = true;
        }
        foreach ($tables[1] as $table) $this->assertArrayHasKey($table, $connected, 'Tabla aislada: '.$table);
        foreach (['avisos_slack_area_destino_fk', 'pedidos_documento_fk', 'pedidos_atendido_por_fk', 'usuarios_creado_por_fk', 'historial_configuracion_empresa_fk', 'intentos_login_usuario_fk'] as $name) {
            $this->assertNotNull(DB::selectOne("SELECT conname FROM pg_constraint WHERE conname = ? AND contype = 'f' AND convalidated", [$name]));
        }
    }

    public function test_login_attempts_reference_known_users_and_preserve_unknown_emails(): void
    {
        $known = 'admin@ingenieros.edu.pe';
        $unknown = 'inexistente.'.uniqid().'@example.com';
        $repository = app(\App\Data\Contracts\AuthRepositoryInterface::class);
        $repository->recordAttempt($known, false, '127.0.0.1');
        $repository->recordAttempt($unknown, false, '127.0.0.1');
        $this->assertDatabaseHas('sec.intentos_login', ['correo' => $known, 'id_usuario' => DB::table('sec.usuarios')->where('correo', $known)->value('id_usuario')]);
        $this->assertDatabaseHas('sec.intentos_login', ['correo' => $unknown, 'id_usuario' => null]);
    }
}
