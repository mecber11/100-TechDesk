<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExportDataModel extends Command
{
    protected $signature = 'model:export {--output= : Ruta del archivo DBML} {--operational : Solo tablas utilizadas por SIGECO}';
    protected $description = 'Exporta el esquema PostgreSQL real a DBML sin datos ni credenciales.';

    public function handle(): int
    {
        $path = $this->option('output') ?: base_path('../database/ERD_SIGECO_Actual.dbml');
        $columns = DB::select("SELECT table_schema, table_name, column_name, data_type, udt_name, is_nullable, character_maximum_length, numeric_precision, numeric_scale
            FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
            ORDER BY table_schema, table_name, ordinal_position");
        $keys = DB::select("SELECT n.nspname AS schema_name, t.relname AS table_name, c.contype,
            array_to_json(ARRAY(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY k(num, pos)
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.num ORDER BY k.pos)) AS columns
            FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE c.contype IN ('p', 'u') AND n.nspname NOT IN ('pg_catalog', 'information_schema')");
        $constraints = [];
        foreach ($keys as $key) {
            $constraints[$key->schema_name.'.'.$key->table_name][] = [$key->contype, json_decode($key->columns, true)];
        }
        $tables = [];
        foreach ($columns as $column) $tables[$column->table_schema.'.'.$column->table_name][] = $column;
        if ($this->option('operational')) {
            $selected = [
                'cfg.configuracion_empresa', 'cfg.historial_configuracion',
                'org.areas', 'org.miembros_area', 'docs.documentos', 'docs.tipos_documento', 'docs.versiones_documento',
                'req.pedidos', 'req.detalles_pedido', 'req.adjuntos_pedido', 'req.historial_pedido', 'req.avisos_slack',
                'sec.usuarios', 'sec.roles', 'sec.usuarios_roles', 'sec.permisos', 'sec.roles_permisos',
                'sec.sesiones_usuario', 'sec.tokens_acceso', 'sec.intentos_login',
            ];
            $tables = array_intersect_key($tables, array_flip($selected));
        }
        $text = "// SIGECO: modelo físico obtenido de PostgreSQL. Solo estructura, sin datos.\n";
        $text .= "// Una instalación y base de datos por empresa. cfg.configuracion_empresa tiene una sola fila (id=1).\n\n";
        foreach ($tables as $name => $fields) {
            $text .= 'Table '.$name." {\n";
            foreach ($fields as $field) {
                $type = match ($field->data_type) {
                    'character varying' => 'varchar('.$field->character_maximum_length.')',
                    'character' => 'char('.$field->character_maximum_length.')',
                    'numeric' => $field->numeric_precision !== null ? 'numeric('.$field->numeric_precision.','.$field->numeric_scale.')' : 'numeric',
                    'timestamp with time zone' => 'timestamptz',
                    'timestamp without time zone' => 'timestamp',
                    'USER-DEFINED' => $field->udt_name,
                    'ARRAY' => '"'.$field->udt_name.'"',
                    default => str_contains($field->data_type, ' ') ? '"'.$field->data_type.'"' : $field->data_type,
                };
                $settings = $field->is_nullable === 'NO' ? ['not null'] : [];
                foreach ($constraints[$name] ?? [] as [$kind, $keyFields]) {
                    if ($keyFields === [$field->column_name]) $settings[] = $kind === 'p' ? 'pk' : 'unique';
                }
                $text .= '  '.$field->column_name.' '.$type.($settings ? ' ['.implode(', ', $settings).']' : '')."\n";
            }
            $indexes = array_filter($constraints[$name] ?? [], fn ($key) => count($key[1]) > 1);
            if ($indexes) {
                $text .= "  indexes {\n";
                foreach ($indexes as [$kind, $keyFields]) $text .= '    ('.implode(', ', $keyFields).') ['.($kind === 'p' ? 'pk' : 'unique')."]\n";
                $text .= "  }\n";
            }
            $text .= "}\n\n";
        }
        $references = DB::select("SELECT ns.nspname AS source_schema, src.relname AS source_table,
            nt.nspname AS target_schema, dst.relname AS target_table,
            array_to_json(ARRAY(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY k(num, pos)
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.num ORDER BY k.pos)) AS source_columns,
            array_to_json(ARRAY(SELECT a.attname FROM unnest(c.confkey) WITH ORDINALITY k(num, pos)
            JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.num ORDER BY k.pos)) AS target_columns
            FROM pg_constraint c JOIN pg_class src ON src.oid = c.conrelid JOIN pg_namespace ns ON ns.oid = src.relnamespace
            JOIN pg_class dst ON dst.oid = c.confrelid JOIN pg_namespace nt ON nt.oid = dst.relnamespace
            WHERE c.contype = 'f' AND ns.nspname NOT IN ('pg_catalog', 'information_schema')
            ORDER BY ns.nspname, src.relname, c.conname");
        $references = array_filter($references, fn ($ref) => isset($tables[$ref->source_schema.'.'.$ref->source_table], $tables[$ref->target_schema.'.'.$ref->target_table]));
        foreach ($references as $ref) {
            $source = json_decode($ref->source_columns, true);
            $target = json_decode($ref->target_columns, true);
            $format = fn ($fields) => count($fields) === 1 ? $fields[0] : '('.implode(', ', $fields).')';
            $text .= 'Ref: '.$ref->source_schema.'.'.$ref->source_table.'.'.$format($source).' > '
                .$ref->target_schema.'.'.$ref->target_table.'.'.$format($target)."\n";
        }
        if (! is_dir(dirname($path)) || file_put_contents($path, $text) === false) {
            $this->error('No se pudo escribir el archivo de modelo.');
            return self::FAILURE;
        }
        $this->info(count($tables).' tablas y '.count($references).' relaciones exportadas.');
        return self::SUCCESS;
    }
}
