<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id', 'user_name', 'user_role', 'module', 'action', 'description', 'subject_type', 'subject_id', 'ip_address', 'user_agent', 'created_at'])]
class ActivityLog extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }
}
