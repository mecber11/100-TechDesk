<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('
            ALTER TABLE req.pedidos 
                DROP CONSTRAINT IF EXISTS req_internal_orders_requested_by_user_id_foreign,
                ADD CONSTRAINT req_internal_orders_requested_by_user_id_foreign 
                    FOREIGN KEY (solicitado_por) REFERENCES sec.usuarios(id_usuario) ON DELETE SET NULL;
        ');

        DB::statement('
            ALTER TABLE req.historial_pedido 
                DROP CONSTRAINT IF EXISTS req_internal_order_history_changed_by_user_id_foreign,
                ADD CONSTRAINT req_internal_order_history_changed_by_user_id_foreign 
                    FOREIGN KEY (modificado_por) REFERENCES sec.usuarios(id_usuario) ON DELETE SET NULL;
        ');

        DB::statement('
            ALTER TABLE docs.documentos 
                DROP CONSTRAINT IF EXISTS docs_documents_created_by_user_id_foreign,
                ADD CONSTRAINT docs_documents_created_by_user_id_foreign 
                    FOREIGN KEY (creado_por) REFERENCES sec.usuarios(id_usuario) ON DELETE SET NULL;
        ');

        DB::statement('
            ALTER TABLE docs.versiones_documento 
                DROP CONSTRAINT IF EXISTS docs_document_versions_created_by_user_id_foreign,
                ADD CONSTRAINT docs_document_versions_created_by_user_id_foreign 
                    FOREIGN KEY (creado_por) REFERENCES sec.usuarios(id_usuario) ON DELETE SET NULL;
        ');

        DB::statement('
            ALTER TABLE sec.usuarios_roles 
                DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
                ADD CONSTRAINT user_roles_user_id_fkey 
                    FOREIGN KEY (id_usuario) REFERENCES sec.usuarios(id_usuario) ON DELETE CASCADE;
        ');

        DB::statement('
            ALTER TABLE sec.sesiones_usuario 
                DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey,
                ADD CONSTRAINT user_sessions_user_id_fkey 
                    FOREIGN KEY (id_usuario) REFERENCES sec.usuarios(id_usuario) ON DELETE CASCADE;
        ');

        DB::statement('
            ALTER TABLE sec.tokens_acceso 
                DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey,
                ADD CONSTRAINT refresh_tokens_user_id_fkey 
                    FOREIGN KEY (id_usuario) REFERENCES sec.usuarios(id_usuario) ON DELETE CASCADE;
        ');
    }

    public function down(): void
    {
        DB::statement('
            ALTER TABLE req.pedidos 
                DROP CONSTRAINT IF EXISTS req_internal_orders_requested_by_user_id_foreign,
                ADD CONSTRAINT req_internal_orders_requested_by_user_id_foreign 
                    FOREIGN KEY (solicitado_por) REFERENCES sec.usuarios(id_usuario);
        ');

        DB::statement('
            ALTER TABLE req.historial_pedido 
                DROP CONSTRAINT IF EXISTS req_internal_order_history_changed_by_user_id_foreign,
                ADD CONSTRAINT req_internal_order_history_changed_by_user_id_foreign 
                    FOREIGN KEY (modificado_por) REFERENCES sec.usuarios(id_usuario);
        ');

        DB::statement('
            ALTER TABLE docs.documentos 
                DROP CONSTRAINT IF EXISTS docs_documents_created_by_user_id_foreign,
                ADD CONSTRAINT docs_documents_created_by_user_id_foreign 
                    FOREIGN KEY (creado_por) REFERENCES sec.usuarios(id_usuario);
        ');

        DB::statement('
            ALTER TABLE docs.versiones_documento 
                DROP CONSTRAINT IF EXISTS docs_document_versions_created_by_user_id_foreign,
                ADD CONSTRAINT docs_document_versions_created_by_user_id_foreign 
                    FOREIGN KEY (creado_por) REFERENCES sec.usuarios(id_usuario);
        ');

        DB::statement('
            ALTER TABLE sec.usuarios_roles 
                DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
                ADD CONSTRAINT user_roles_user_id_fkey 
                    FOREIGN KEY (id_usuario) REFERENCES sec.usuarios(id_usuario);
        ');

        DB::statement('
            ALTER TABLE sec.sesiones_usuario 
                DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey,
                ADD CONSTRAINT user_sessions_user_id_fkey 
                    FOREIGN KEY (id_usuario) REFERENCES sec.usuarios(id_usuario);
        ');

        DB::statement('
            ALTER TABLE sec.tokens_acceso 
                DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey,
                ADD CONSTRAINT refresh_tokens_user_id_fkey 
                    FOREIGN KEY (id_usuario) REFERENCES sec.usuarios(id_usuario);
        ');
    }
};
