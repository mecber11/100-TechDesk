<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('req.historial_pedido', 'status')
            && ! Schema::hasColumn('req.historial_pedido', 'estado')) {
            DB::statement('ALTER TABLE req.historial_pedido RENAME COLUMN status TO estado');
        }
    }

    public function down(): void
    {
        // La migración estructural anterior restaura este nombre.
    }
};
