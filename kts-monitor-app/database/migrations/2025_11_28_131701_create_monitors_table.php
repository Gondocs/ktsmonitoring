<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('monitors', function (Blueprint $table) {
            $table->id();
            $table->string('url');
            $table->string('name');
            $table->integer('last_status')->nullable();
            $table->integer('last_response_time_ms')->nullable();
            $table->integer('ssl_days_remaining')->nullable();
            $table->timestamp('ssl_expires_at')->nullable();
            $table->boolean('has_hsts')->nullable();
            $table->integer('redirect_count')->nullable();
            $table->boolean('is_wordpress')->nullable();
            $table->string('wordpress_version')->nullable();
            $table->timestamp('content_last_modified_at')->nullable();
            $table->unsignedTinyInteger('stability_score')->nullable();
            $table->timestamp('last_checked_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('monitors');
    }
};
