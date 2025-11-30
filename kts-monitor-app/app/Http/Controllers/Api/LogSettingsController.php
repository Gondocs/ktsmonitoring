<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Setting;

class LogSettingsController extends Controller
{
    const KEY_RETENTION_DAYS = 'log_retention_days';
    const DEFAULT_DAYS = 15;

    public function getRetention()
    {
        $days = (int) Setting::get(self::KEY_RETENTION_DAYS, self::DEFAULT_DAYS);

        return response()->json([
            'retention_days' => $days,
        ]);
    }

    public function setRetention(Request $request)
    {
        $validated = $request->validate([
            'retention_days' => 'required|integer|min:1|max:365',
        ]);

        Setting::set(self::KEY_RETENTION_DAYS, $validated['retention_days']);

        return response()->json([
            'retention_days' => (int) $validated['retention_days'],
        ]);
    }
}
