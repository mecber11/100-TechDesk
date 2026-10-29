<?php

use App\Common\Support\AreaAccess;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE SCHEMA IF NOT EXISTS org');
        DB::statement('CREATE SCHEMA IF NOT EXISTS req');
        DB::statement('CREATE SCHEMA IF NOT EXISTS docs');

        $this->upgradeAreas();
        $this->createDocumentTables();
        $this->upgradeUsersAndTeams();
        $this->upgradeOrders();
        $this->seedAreaMemberships();
    }

    private function upgradeAreas(): void
    {
        Schema::table('org.internal_areas', function (Blueprint $table) {
            if (! Schema::hasColumn('org.internal_areas', 'code')) {
                $table->string('code', 20)->nullable()->unique();
            }
            if (! Schema::hasColumn('org.internal_areas', 'purpose')) {
                $table->string('purpose', 300)->nullable();
            }
            if (! Schema::hasColumn('org.internal_areas', 'sort_order')) {
                $table->integer('sort_order')->default(0);
            }
        });

        $purposes = [
            'ADM' => 'Gestión administrativa, logística y coordinación interna',
            'VENTAS' => 'Gestión comercial y atención de oportunidades',
            'MKT' => 'Marketing, comunicación y campañas',
            'TI' => 'Mesa de ayuda, software, equipos, accesos e infraestructura',
            'RRHH' => 'Gestión del talento y bienestar del equipo',
            'CONT' => 'Control contable, financiero y tributario',
        ];

        $sort = 0;
        foreach (AreaAccess::AREA_DEFINITIONS as $code => $definition) {
            $sort++;
            $legacyName = str_replace('ó', 'o', $definition['name']);
            $area = DB::table('org.internal_areas')
                ->whereIn('name', [$definition['name'], $legacyName])
                ->first();

            $values = [
                'code' => $code,
                'name' => $definition['name'],
                'purpose' => $purposes[$code],
                'sort_order' => $sort,
                'is_active' => true,
            ];

            if ($area) {
                DB::table('org.internal_areas')->where('area_id', $area->area_id)->update($values);
            } else {
                DB::table('org.internal_areas')->insert($values);
            }
        }

        DB::table('org.internal_areas')->where('name', 'SuperAdmin')->update([
            'code' => 'SUPER',
            'purpose' => 'Bandeja de escalamiento excepcional desde TI',
            'sort_order' => 99,
            'is_active' => false,
        ]);
    }

    private function createDocumentTables(): void
    {
        if (! Schema::hasTable('docs.doc_types')) {
            Schema::create('docs.doc_types', function (Blueprint $table) {
                $table->smallIncrements('doc_type_id');
                $table->string('code', 20)->unique();
                $table->string('name', 80);
            });
        }

        if (! Schema::hasTable('docs.documents')) {
            Schema::create('docs.documents', function (Blueprint $table) {
                $table->id('document_id');
                $table->string('code', 40)->unique();
                $table->string('title', 220);
                $table->unsignedSmallInteger('doc_type_id');
                $table->unsignedBigInteger('owner_area_id');
                $table->string('status', 16)->default('Borrador');
                $table->string('summary', 500)->nullable();
                $table->text('body_text')->nullable();
                $table->string('file_url', 400)->nullable();
                $table->integer('current_version')->default(1);
                $table->date('effective_on')->nullable();
                $table->date('expires_on')->nullable();
                $table->integer('created_by_user_id')->nullable();
                $table->timestampsTz();

                $table->foreign('doc_type_id')->references('doc_type_id')->on('docs.doc_types');
                $table->foreign('owner_area_id')->references('area_id')->on('org.internal_areas');
                $table->foreign('created_by_user_id')->references('user_id')->on('sec.users');
                $table->index(['owner_area_id', 'status']);
            });
        }

        if (! Schema::hasTable('docs.document_versions')) {
            Schema::create('docs.document_versions', function (Blueprint $table) {
                $table->id('version_id');
                $table->unsignedBigInteger('document_id');
                $table->integer('version_no');
                $table->text('body_text')->nullable();
                $table->string('file_url', 400)->nullable();
                $table->string('change_note', 300)->nullable();
                $table->integer('created_by_user_id')->nullable();
                $table->timestampTz('created_at')->useCurrent();

                $table->foreign('document_id')->references('document_id')->on('docs.documents')->cascadeOnDelete();
                $table->foreign('created_by_user_id')->references('user_id')->on('sec.users');
                $table->unique(['document_id', 'version_no']);
            });
        }

        DB::table('docs.doc_types')->upsert([
            ['code' => 'POL', 'name' => 'Política'],
            ['code' => 'PRO', 'name' => 'Procedimiento'],
            ['code' => 'INS', 'name' => 'Instructivo'],
            ['code' => 'REG', 'name' => 'Registro'],
            ['code' => 'MAN', 'name' => 'Manual'],
            ['code' => 'FOR', 'name' => 'Formato'],
        ], ['code'], ['name']);

        DB::statement('CREATE SEQUENCE IF NOT EXISTS docs.seq_document START 1');
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION docs.fn_generate_document_code(p_type VARCHAR, p_area VARCHAR)
            RETURNS VARCHAR LANGUAGE plpgsql AS $$
            BEGIN
                RETURN upper(p_type) || '-' || upper(p_area) || '-' || lpad(nextval('docs.seq_document')::text, 4, '0');
            END;
            $$;
        SQL);
    }

    private function upgradeUsersAndTeams(): void
    {
        if (! Schema::hasColumn('sec.users', 'area_id')) {
            Schema::table('sec.users', function (Blueprint $table) {
                $table->unsignedBigInteger('area_id')->nullable();
                $table->foreign('area_id')->references('area_id')->on('org.internal_areas')->nullOnDelete();
            });
        }

        if (! Schema::hasTable('org.area_members')) {
            Schema::create('org.area_members', function (Blueprint $table) {
                $table->unsignedBigInteger('area_id');
                $table->integer('user_id');
                $table->boolean('is_lead')->default(false);
                $table->timestampTz('joined_at')->useCurrent();
                $table->primary(['area_id', 'user_id']);
                $table->foreign('area_id')->references('area_id')->on('org.internal_areas')->cascadeOnDelete();
                $table->foreign('user_id')->references('user_id')->on('sec.users')->cascadeOnDelete();
            });
        }
    }

    private function upgradeOrders(): void
    {
        Schema::table('req.internal_orders', function (Blueprint $table) {
            if (! Schema::hasColumn('req.internal_orders', 'order_code')) {
                $table->string('order_code', 30)->nullable()->unique();
            }
            if (! Schema::hasColumn('req.internal_orders', 'request_type')) {
                $table->string('request_type', 16)->default('Ticket');
            }
            if (! Schema::hasColumn('req.internal_orders', 'response_note')) {
                $table->string('response_note', 500)->nullable();
            }
            if (! Schema::hasColumn('req.internal_orders', 'assigned_to_user_id')) {
                $table->integer('assigned_to_user_id')->nullable();
            }
            if (! Schema::hasColumn('req.internal_orders', 'escalation_reason')) {
                $table->string('escalation_reason', 500)->nullable();
            }
            if (! Schema::hasColumn('req.internal_orders', 'escalated_at')) {
                $table->timestampTz('escalated_at')->nullable();
            }
            if (! Schema::hasColumn('req.internal_orders', 'resolved_at')) {
                $table->timestampTz('resolved_at')->nullable();
            }
            if (! Schema::hasColumn('req.internal_orders', 'closed_at')) {
                $table->timestampTz('closed_at')->nullable();
            }
        });

        if (! Schema::hasColumn('req.internal_order_items', 'notes')) {
            Schema::table('req.internal_order_items', fn (Blueprint $table) => $table->string('notes', 200)->nullable());
        }

        Schema::table('req.internal_order_history', function (Blueprint $table) {
            if (! Schema::hasColumn('req.internal_order_history', 'from_status')) {
                $table->string('from_status', 20)->nullable();
            }
            if (! Schema::hasColumn('req.internal_order_history', 'to_status')) {
                $table->string('to_status', 20)->nullable();
            }
        });

        DB::statement('CREATE SEQUENCE IF NOT EXISTS req.seq_order START 1');
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION req.fn_generate_order_code()
            RETURNS VARCHAR LANGUAGE plpgsql AS $$
            BEGIN
                RETURN 'SOL-' || to_char(NOW(), 'YYYY') || '-' || lpad(nextval('req.seq_order')::text, 5, '0');
            END;
            $$;
        SQL);

        DB::table('req.internal_orders')->whereNull('order_code')->orderBy('order_id')->each(function ($order) {
            DB::table('req.internal_orders')->where('order_id', $order->order_id)->update([
                'order_code' => DB::raw('req.fn_generate_order_code()'),
            ]);
        });
        DB::table('req.internal_order_history')->whereNull('to_status')->update([
            'to_status' => DB::raw('status'),
        ]);
    }

    private function seedAreaMemberships(): void
    {
        $users = DB::table('sec.users as u')
            ->join('sec.user_roles as ur', 'ur.user_id', '=', 'u.user_id')
            ->join('sec.roles as r', 'r.role_id', '=', 'ur.role_id')
            ->select('u.user_id', 'r.name as role_name')
            ->get();

        foreach ($users as $user) {
            foreach (AreaAccess::AREA_DEFINITIONS as $code => $definition) {
                if (! in_array($user->role_name, [$definition['role'].'_Encargado', $definition['role'].'_Equipo'], true)) {
                    continue;
                }

                $areaId = DB::table('org.internal_areas')->where('code', $code)->value('area_id');
                DB::table('sec.users')->where('user_id', $user->user_id)->update(['area_id' => $areaId]);
                DB::table('org.area_members')->updateOrInsert(
                    ['area_id' => $areaId, 'user_id' => $user->user_id],
                    ['is_lead' => str_ends_with($user->role_name, '_Encargado'), 'joined_at' => now()]
                );
            }
        }
    }

    public function down(): void
    {
        // Migración de alineación: no elimina datos operativos preexistentes.
    }
};
