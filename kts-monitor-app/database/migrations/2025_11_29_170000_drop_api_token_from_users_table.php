<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // SQLite keeps a separate unique index that must be removed before dropping the column.
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS users_api_token_unique');
        }

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'api_token')) {
                $table->dropColumn('api_token');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'api_token')) {
                $table->string('api_token', 64)->nullable()->unique();
            }
        });
    }
};
