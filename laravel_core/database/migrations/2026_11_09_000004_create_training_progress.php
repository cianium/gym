<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('training_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('athlete_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('training_plan_id')->constrained('training_plans')->cascadeOnDelete();
            $table->date('performed_on');
            $table->string('session_day', 80);
            $table->unsignedTinyInteger('effort')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['athlete_id', 'training_plan_id', 'performed_on', 'session_day'], 'training_progress_unique');
        });
    }
    public function down(): void { Schema::dropIfExists('training_progress'); }
};
