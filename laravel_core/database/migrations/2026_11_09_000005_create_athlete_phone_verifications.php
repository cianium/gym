<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('athlete_phone_verifications', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 20)->unique();
            $table->string('code_hash', 64);
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });
        Schema::table('users', fn (Blueprint $table) => $table->timestamp('phone_verified_at')->nullable());
    }
    public function down(): void {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('phone_verified_at'));
        Schema::dropIfExists('athlete_phone_verifications');
    }
};
