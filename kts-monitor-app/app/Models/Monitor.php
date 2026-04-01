<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $url
 * @property string $name
 * @property int|null $last_status
 * @property int|null $last_response_time_ms
 * @property int|null $ssl_days_remaining
 * @property \Illuminate\Support\Carbon|null $ssl_expires_at
 * @property bool|null $has_hsts
 * @property int|null $redirect_count
 * @property bool|null $is_wordpress
 * @property string|null $wordpress_version
 * @property \Illuminate\Support\Carbon|null $content_last_modified_at
 * @property int|null $stability_score
 * @property \Illuminate\Support\Carbon|null $last_checked_at
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
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
