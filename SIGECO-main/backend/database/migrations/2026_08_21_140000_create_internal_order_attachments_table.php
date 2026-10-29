<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('req.internal_order_attachments', function (Blueprint $table) {
            $table->id('attachment_id');
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('history_id')->nullable();
            $table->integer('uploaded_by_user_id')->nullable();
            $table->string('source', 20)->default('upload');
            $table->string('original_name', 255);
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->string('storage_disk', 40)->nullable();
            $table->string('storage_path', 500)->nullable();
            $table->string('external_url', 1000)->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('order_id')->references('order_id')->on('req.internal_orders')->cascadeOnDelete();
            $table->foreign('history_id')->references('history_id')->on('req.internal_order_history')->nullOnDelete();
            $table->foreign('uploaded_by_user_id')->references('user_id')->on('sec.users')->nullOnDelete();
            $table->index(['order_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('req.internal_order_attachments');
    }
};
