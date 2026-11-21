<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('coach_appointment_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->dateTime('starts_at')->unique();
            $table->dateTime('ends_at');
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('coach_consultation_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('slot_id')->constrained('coach_appointment_slots')->restrictOnDelete();
            // Nullable unique index: only one live booking per slot. On cancellation
            // active_slot_id becomes NULL; old bookings remain in the history.
            $table->foreignId('active_slot_id')->nullable()->unique()
                ->constrained('coach_appointment_slots')->nullOnDelete();
            $table->foreignId('athlete_id')->constrained('users')->restrictOnDelete();
            $table->string('status', 20)->default('requested')->index();
            $table->string('athlete_note', 500)->nullable();
            $table->string('coach_note', 500)->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
            $table->index(['athlete_id', 'created_at']);
            $table->index(['slot_id', 'created_at']);
        });

        Schema::create('coach_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('athlete_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('sender_id')->constrained('users')->restrictOnDelete();
            $table->text('body');
            $table->timestamp('read_by_athlete_at')->nullable();
            $table->timestamp('read_by_coach_at')->nullable();
            $table->timestamps();
            $table->index(['athlete_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coach_messages');
        Schema::dropIfExists('coach_consultation_bookings');
        Schema::dropIfExists('coach_appointment_slots');
    }
};
