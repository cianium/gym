<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('coach_sms_outbox', function (Blueprint $table) {
            $table->id();
            $table->string('event_key', 150)->unique();
            $table->foreignId('booking_id')->constrained('coach_consultation_bookings')->restrictOnDelete();
            $table->string('recipient_kind', 10); // athlete | coach
            $table->string('recipient_phone', 20);
            $table->json('template_args');
            $table->string('state', 20)->default('queued')->index(); // queued/sending/sent/unknown/failed
            $table->unsignedTinyInteger('attempt_count')->default(0);
            $table->timestamp('lease_until')->nullable();
            $table->string('provider_receipt', 80)->nullable();
            $table->string('last_error_code', 80)->nullable();
            $table->timestamps();
            $table->index(['state', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coach_sms_outbox');
    }
};
