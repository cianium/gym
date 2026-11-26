<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Middleware\VerifyAdminCsrfToken;
use App\Models\TrainingPlan;
use App\Models\TrainingProgress;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrainingIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_training_history_stays_with_original_athlete_and_date_range(): void
    {
        $this->withoutMiddleware(VerifyAdminCsrfToken::class);
        $user = static fn (string $role, string $phone) => User::create([
            'name' => 'Test user', 'role' => $role, 'phone' => $phone,
            'email' => $phone.'@example.test', 'password' => 'TestOnlyPassword123!',
        ]);
        $admin = $user('admin', '09120000100');
        $athlete = $user('athlete', '09120000101');
        $other = $user('athlete', '09120000102');
        $payload = [
            'athlete_id' => $athlete->id, 'title' => 'Test plan',
            'sessions' => [['day' => 'Day 1', 'exercises' => [['name' => 'Squat', 'sets' => 3, 'reps' => '8']]]],
            'starts_on' => now()->subDays(3)->toDateString(),
            'ends_on' => now()->addDays(3)->toDateString(), 'status' => 'published',
        ];
        $this->actingAs($admin)->postJson('/api/v1/admin/training-plans', array_replace($payload, [
            'sessions' => [$payload['sessions'][0], $payload['sessions'][0]],
        ]))->assertUnprocessable();
        $id = $this->actingAs($admin)->postJson('/api/v1/admin/training-plans', $payload)
            ->assertCreated()->json('plan.id');
        $progress = ['training_plan_id' => $id, 'session_day' => 'Day 1', 'performed_on' => now()->toDateString(), 'effort' => 5];
        $this->actingAs($athlete)->postJson('/api/v1/athlete/progress', array_replace($progress, [
            'performed_on' => now()->subDays(4)->toDateString(),
        ]))->assertUnprocessable();
        $this->actingAs($other)->postJson('/api/v1/athlete/progress', $progress)->assertNotFound();
        $firstId = $this->actingAs($athlete)->postJson('/api/v1/athlete/progress', $progress)->assertOk()->json('progress.id');
        $this->actingAs($athlete)->postJson('/api/v1/athlete/progress', array_replace($progress, ['effort' => 8]))
            ->assertOk()->assertJsonPath('progress.id', $firstId);
        $this->assertSame(1, TrainingProgress::where('training_plan_id', $id)->count());
        $this->actingAs($admin)->putJson('/api/v1/admin/training-plans/'.$id, array_replace($payload, [
            'athlete_id' => $other->id,
        ]))->assertStatus(409);
        $this->assertEquals($athlete->id, TrainingPlan::findOrFail($id)->athlete_id);
        $this->actingAs($admin)->putJson('/api/v1/admin/training-plans/'.$id, array_replace($payload, ['title' => 'Updated']))->assertOk();
    }
}
