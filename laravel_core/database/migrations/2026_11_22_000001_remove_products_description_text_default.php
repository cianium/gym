<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql'
            && Schema::hasTable('products')
            && Schema::hasColumn('products', 'description')) {
            // MySQL does not allow a literal default on TEXT columns.
            // Keep the column NOT NULL while removing the incompatible default.
            DB::statement('ALTER TABLE `products` MODIFY `description` TEXT NOT NULL');
        }
    }

    public function down(): void
    {
        // Intentionally keep the portable no-default definition. Restoring a
        // TEXT literal default would make fresh MySQL 8 installations fail.
        if (DB::getDriverName() === 'mysql'
            && Schema::hasTable('products')
            && Schema::hasColumn('products', 'description')) {
            DB::statement('ALTER TABLE `products` MODIFY `description` TEXT NOT NULL');
        }
    }
};
