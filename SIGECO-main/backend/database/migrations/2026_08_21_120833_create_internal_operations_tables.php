<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement('CREATE SCHEMA IF NOT EXISTS org');
        DB::statement('CREATE SCHEMA IF NOT EXISTS req');

        Schema::create('org.internal_areas', function (Blueprint $table) {
            $table->id('area_id');
            $table->string('name');
            $table->boolean('is_active')->default(true);
        });

        Schema::create('req.internal_orders', function (Blueprint $table) {
            $table->id('order_id');
            $table->foreignId('from_area_id')->constrained('org.internal_areas', 'area_id');
            $table->foreignId('to_area_id')->constrained('org.internal_areas', 'area_id');
            $table->foreignId('requested_by_user_id')->nullable()->constrained('sec.users', 'user_id');
            $table->integer('related_document_id')->nullable();
            $table->string('title', 200);
            $table->text('description');
            $table->string('kind')->nullable();
            $table->string('priority')->nullable();
            $table->string('status')->default('Borrador');
            $table->date('due_on')->nullable();
            $table->timestamps();
        });

        Schema::create('req.internal_order_history', function (Blueprint $table) {
            $table->id('history_id');
            $table->foreignId('order_id')->constrained('req.internal_orders', 'order_id');
            $table->string('status');
            $table->text('note')->nullable();
            $table->foreignId('changed_by_user_id')->nullable()->constrained('sec.users', 'user_id');
            $table->timestamp('changed_at');
        });

        Schema::create('req.internal_order_items', function (Blueprint $table) {
            $table->id('item_id');
            $table->foreignId('order_id')->constrained('req.internal_orders', 'order_id');
            $table->string('description', 220);
            $table->decimal('quantity', 10, 2)->nullable();
            $table->string('unit', 20)->nullable();
        });

        // Seed Default Areas
        $areas = [
            'SuperAdmin', 'Administracion', 'Ventas', 'Marketing', 'TI', 'Recursos Humanos', 'Contabilidad',
        ];
        foreach ($areas as $area) {
            DB::table('org.internal_areas')->insert([
                'name' => $area,
                'is_active' => true,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('req.internal_order_items');
        Schema::dropIfExists('req.internal_order_history');
        Schema::dropIfExists('req.internal_orders');
        Schema::dropIfExists('org.internal_areas');
    }
};
