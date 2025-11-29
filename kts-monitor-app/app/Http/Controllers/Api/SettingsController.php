<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Setting;

class SettingsController extends Controller
{
    public function getMonitorInterval()
    {
        $default = config('app.monitor_interval_minutes');
        $value = (int) Setting::get('monitor_interval_minutes', $default);

        return response()->json([
            'interval_minutes' => $value,
        ]);
    }

    public function setMonitorInterval(Request $request)
    {
        $data = $request->validate([
            'interval_minutes' => 'required|integer|min:1|max:10080',
        ]);

        Setting::set('monitor_interval_minutes', $data['interval_minutes']);

        return response()->json([
            'interval_minutes' => (int) $data['interval_minutes'],
        ]);
    }
}
