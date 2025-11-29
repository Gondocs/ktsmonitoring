<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MonitorLog;
use Illuminate\Http\Request;

class MonitorLogController extends Controller
{
    public function index(int $monitorId, Request $request)
    {
        $limit = (int) $request->query('limit', 50);

        // Hard max to avoid accidental huge queries
        if ($limit <= 0) {
            $limit = 50;
        } elseif ($limit > 1000) {
            $limit = 1000;
        }

        $logs = MonitorLog::where('monitor_id', $monitorId)
            ->orderByDesc('checked_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get([
                'id',
                'monitor_id',
                'status_code',
                'response_time_ms',
                'error_message',
                'checked_at',
                'created_at',
            ]);

        return response()->json($logs);
    }
}
