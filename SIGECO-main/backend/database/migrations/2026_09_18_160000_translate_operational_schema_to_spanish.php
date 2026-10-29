<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const TABLES = [
        'sec.permissions' => 'permisos',
        'sec.users' => 'usuarios',
        'sec.role_permissions' => 'roles_permisos',
        'sec.user_roles' => 'usuarios_roles',
        'sec.user_sessions' => 'sesiones_usuario',
        'sec.refresh_tokens' => 'tokens_acceso',
        'sec.login_attempts' => 'intentos_login',
        'org.internal_areas' => 'areas',
        'org.area_members' => 'miembros_area',
        'req.internal_orders' => 'pedidos',
        'req.internal_order_history' => 'historial_pedido',
        'req.internal_order_items' => 'detalles_pedido',
        'req.internal_order_attachments' => 'adjuntos_pedido',
        'docs.doc_types' => 'tipos_documento',
        'docs.documents' => 'documentos',
        'docs.document_versions' => 'versiones_documento',
    ];

    private const COLUMNS = [
        'sec.permisos' => [
            'permission_id' => 'id_permiso', 'code' => 'codigo', 'module' => 'modulo',
            'description' => 'descripcion',
        ],
        'sec.roles' => [
            'role_id' => 'id_rol', 'name' => 'nombre', 'description' => 'descripcion',
            'is_system' => 'es_sistema', 'is_active' => 'activo',
        ],
        'sec.usuarios' => [
            'user_id' => 'id_usuario', 'email' => 'correo', 'password_hash' => 'contrasena',
            'full_name' => 'nombre_completo', 'phone' => 'telefono', 'preferred_theme' => 'tema_preferido',
            'is_active' => 'activo', 'must_change_password' => 'cambiar_contrasena', 'status' => 'estado',
            'requested_area' => 'area_solicitada', 'area_id' => 'id_area', 'last_login_at' => 'ultimo_ingreso',
            'created_at' => 'creado_en', 'created_by_user_id' => 'creado_por',
        ],
        'sec.roles_permisos' => ['role_id' => 'id_rol', 'permission_id' => 'id_permiso'],
        'sec.usuarios_roles' => ['user_id' => 'id_usuario', 'role_id' => 'id_rol', 'assigned_at' => 'asignado_en'],
        'sec.sesiones_usuario' => ['session_id' => 'id_sesion', 'user_id' => 'id_usuario', 'started_at' => 'inicio', 'ended_at' => 'fin', 'ip_address' => 'direccion_ip', 'user_agent' => 'agente_usuario'],
        'sec.tokens_acceso' => ['refresh_token_id' => 'id_token', 'user_id' => 'id_usuario', 'token_hash' => 'hash_token', 'expires_at' => 'expira_en', 'revoked_at' => 'revocado_en', 'created_at' => 'creado_en'],
        'sec.intentos_login' => ['attempt_id' => 'id_intento', 'email' => 'correo', 'succeeded' => 'exitoso', 'ip_address' => 'direccion_ip', 'attempted_at' => 'realizado_en'],
        'org.areas' => ['area_id' => 'id_area', 'code' => 'codigo', 'name' => 'nombre', 'purpose' => 'finalidad', 'sort_order' => 'orden', 'is_active' => 'activa'],
        'org.miembros_area' => ['area_id' => 'id_area', 'user_id' => 'id_usuario', 'is_lead' => 'es_encargado', 'joined_at' => 'ingresado_en'],
        'req.pedidos' => ['order_id' => 'id_pedido', 'order_code' => 'codigo_pedido', 'from_area_id' => 'area_origen', 'to_area_id' => 'area_destino', 'requested_by_user_id' => 'solicitado_por', 'assigned_to_user_id' => 'atendido_por', 'related_document_id' => 'documento_relacionado', 'request_type' => 'tipo_solicitud', 'title' => 'titulo', 'description' => 'descripcion', 'kind' => 'categoria', 'priority' => 'prioridad', 'status' => 'estado', 'due_on' => 'fecha_limite', 'response_note' => 'respuesta', 'escalation_reason' => 'motivo_escalamiento', 'escalated_at' => 'fecha_escalamiento', 'resolved_at' => 'fecha_atencion', 'closed_at' => 'fecha_cierre', 'created_at' => 'creado_en', 'updated_at' => 'actualizado_en'],
        'req.historial_pedido' => ['history_id' => 'id_historial', 'order_id' => 'id_pedido', 'status' => 'estado', 'from_status' => 'estado_anterior', 'to_status' => 'estado_nuevo', 'note' => 'observacion', 'changed_by_user_id' => 'modificado_por', 'changed_at' => 'modificado_en'],
        'req.detalles_pedido' => ['item_id' => 'id_detalle', 'order_id' => 'id_pedido', 'description' => 'descripcion', 'quantity' => 'cantidad', 'unit' => 'unidad', 'notes' => 'notas'],
        'req.adjuntos_pedido' => ['attachment_id' => 'id_adjunto', 'order_id' => 'id_pedido', 'history_id' => 'id_historial', 'uploaded_by_user_id' => 'cargado_por', 'source' => 'origen_archivo', 'original_name' => 'nombre_original', 'mime_type' => 'tipo_archivo', 'size_bytes' => 'tamano_bytes', 'storage_disk' => 'disco', 'storage_path' => 'ruta', 'external_url' => 'enlace_externo', 'created_at' => 'creado_en'],
        'docs.tipos_documento' => ['doc_type_id' => 'id_tipo_documento', 'code' => 'codigo', 'name' => 'nombre'],
        'docs.documentos' => ['document_id' => 'id_documento', 'code' => 'codigo', 'title' => 'titulo', 'doc_type_id' => 'id_tipo_documento', 'owner_area_id' => 'id_area_propietaria', 'status' => 'estado', 'summary' => 'resumen', 'body_text' => 'contenido', 'file_url' => 'enlace_archivo', 'current_version' => 'version_actual', 'effective_on' => 'vigente_desde', 'expires_on' => 'vigente_hasta', 'created_by_user_id' => 'creado_por', 'created_at' => 'creado_en', 'updated_at' => 'actualizado_en'],
        'docs.versiones_documento' => ['version_id' => 'id_version', 'document_id' => 'id_documento', 'version_no' => 'numero_version', 'body_text' => 'contenido', 'file_url' => 'enlace_archivo', 'change_note' => 'motivo_cambio', 'created_by_user_id' => 'creado_por', 'created_at' => 'creado_en'],
    ];

    public function up(): void
    {
        foreach (self::TABLES as $old => $new) {
            [$schema, $table] = explode('.', $old, 2);
            DB::statement(sprintf('ALTER TABLE %s.%s RENAME TO %s', $schema, $table, $new));
        }

        foreach (self::COLUMNS as $table => $columns) {
            [$schema, $name] = explode('.', $table, 2);
            foreach ($columns as $old => $new) {
                DB::statement(sprintf('ALTER TABLE %s.%s RENAME COLUMN %s TO %s', $schema, $name, $old, $new));
            }
        }
    }

    public function down(): void
    {
        foreach (array_reverse(self::COLUMNS, true) as $table => $columns) {
            [$schema, $name] = explode('.', $table, 2);
            foreach (array_reverse($columns, true) as $old => $new) {
                DB::statement(sprintf('ALTER TABLE %s.%s RENAME COLUMN %s TO %s', $schema, $name, $new, $old));
            }
        }

        foreach (array_reverse(self::TABLES, true) as $old => $new) {
            [$schema, $table] = explode('.', $old, 2);
            DB::statement(sprintf('ALTER TABLE %s.%s RENAME TO %s', $schema, $new, $table));
        }
    }
};
