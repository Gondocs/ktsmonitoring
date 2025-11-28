<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Monitor extends Model
{
    protected $fillable = ['url', 'name', 'last_status', 'last_checked_at', 'is_active'];
}
