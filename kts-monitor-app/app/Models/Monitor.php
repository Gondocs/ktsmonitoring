<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Monitor extends Model
{
    protected $fillable = [
        'url',
        'name',
        'last_status',
        'last_response_time_ms',
        'ssl_days_remaining',
        'ssl_expires_at',
        'has_hsts',
        'redirect_count',
        'is_wordpress',
        'wordpress_version',
        'content_last_modified_at',
        'stability_score',
        'last_checked_at',
        'is_active',
    ];
}
