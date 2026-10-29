-- Referencia SQL equivalente a la migración Laravel del 12/10/2026.
-- Para instalaciones existentes, usar php artisan migrate. No ejecutar ambos mecanismos.
BEGIN;
INSERT INTO sec.roles (nombre, descripcion, es_sistema, activo) VALUES
 ('Plataforma_Admin', 'Superadministrador de plataforma: configuración de módulos', true, true),
 ('Administrador_Empresa', 'Administrador operativo de la empresa', true, true)
ON CONFLICT DO NOTHING;
UPDATE sec.roles SET descripcion = 'Administrador de empresa (rol histórico compatible)'
WHERE nombre IN ('Super_Admin', 'SuperAdmin');
INSERT INTO sec.usuarios_roles (id_usuario, id_rol)
SELECT DISTINCT ur.id_usuario, nuevo.id_rol
FROM sec.usuarios_roles ur
JOIN sec.roles anterior ON anterior.id_rol = ur.id_rol
CROSS JOIN sec.roles nuevo
WHERE anterior.nombre IN ('Super_Admin', 'SuperAdmin') AND nuevo.nombre = 'Administrador_Empresa'
ON CONFLICT DO NOTHING;
UPDATE org.areas SET nombre = 'Administrador de empresa' WHERE codigo = 'SUPER';
CREATE TABLE cfg.configuracion_empresa (
 id smallint PRIMARY KEY CHECK (id = 1),
 nombre_empresa varchar(160) NOT NULL DEFAULT '100% Ingenieros',
 ia_habilitada boolean NOT NULL DEFAULT true,
 documentos_habilitados boolean NOT NULL DEFAULT true,
 slack_habilitado boolean NOT NULL DEFAULT true,
 actualizado_en timestamp NULL
);
INSERT INTO cfg.configuracion_empresa (id) VALUES (1);
CREATE TABLE cfg.historial_configuracion (
 id_cambio bigserial PRIMARY KEY,
 id_usuario integer NULL REFERENCES sec.usuarios(id_usuario) ON DELETE SET NULL,
 antes jsonb NOT NULL,
 despues jsonb NOT NULL,
 creado_en timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMIT;
