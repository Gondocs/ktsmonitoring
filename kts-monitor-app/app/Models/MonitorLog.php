<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MonitorLog extends Model
{
    protected $fillable = [
        'monitor_id',
        'status_code',
        'response_time_ms',
        'error_message',
        'checked_at',
    ];
}
