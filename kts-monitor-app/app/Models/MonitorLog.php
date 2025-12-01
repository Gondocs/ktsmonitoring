<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class MonitorLog extends Model
{
    protected $fillable = [
        'monitor_id',
        'status_code',
        'response_time_ms',
        'error_message',
        'checked_at',
    ];

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(Monitor::class);
    }

    /**
     * Calculate stability score for a monitor over the last 24h
     * (max 96 samples assuming 15-minute checks).
     *
     * Rules:
     * - success = HTTP 2xx-3xx AND response_time_ms <= 5000
     * - failure = anything else (including null / timeout / 5xx / 4xx / >5000ms)
     * - if there are no logs in the period, returns null
     */
    public static function calculateStabilityForMonitor(int $monitorId): ?int
    {
        $since = now()->subHours(24);

        $logs = static::where('monitor_id', $monitorId)
            ->where('checked_at', '>=', $since)
            ->orderBy('checked_at', 'desc')
            ->limit(96)
            ->get();

        $total = $logs->count();
        if ($total === 0) {
            return null;
        }

        $success = 0;

        foreach ($logs as $log) {
            $status = $log->status_code;
            $time = $log->response_time_ms;

            if ($status !== null && $status >= 200 && $status < 400 && $time !== null && $time <= 5000) {
                $success++;
            }
        }

        return (int) round(($success / $total) * 100);
    }
}
