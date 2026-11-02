<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id', 'email_dicoba', 'status', 'alasan', 'ip_address', 'user_agent'])]
class LoginLog extends Model
{
    // created_at diisi default NOW() oleh database
    public $timestamps = false;
}
