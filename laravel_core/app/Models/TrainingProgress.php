<?php

declare(strict_types=1);
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class TrainingProgress extends Model {
    protected $table = 'training_progress';
    protected $fillable = ['athlete_id','training_plan_id','performed_on','session_day','effort','notes'];
    protected function casts(): array { return ['performed_on'=>'date:Y-m-d']; }
}
