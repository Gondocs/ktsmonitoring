<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Setting;
use App\Services\OutageAlertService;

class SettingsController extends Controller
{
    private const DEFAULT_ALERT_RECIPIENT = 'gondocs.robert@gmail.com';

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

    public function getLightMonitorInterval()
    {
        $default = config('app.monitor_interval_light_minutes');
        $value = (int) Setting::get('monitor_interval_light_minutes', $default);

        return response()->json([
            'interval_minutes' => $value,
        ]);
    }

    public function setLightMonitorInterval(Request $request)
    {
        $data = $request->validate([
            'interval_minutes' => 'required|integer|min:1|max:10080',
        ]);

        Setting::set('monitor_interval_light_minutes', $data['interval_minutes']);

        return response()->json([
            'interval_minutes' => (int) $data['interval_minutes'],
        ]);
    }

    public function getAlertEmail()
    {
        $value = (string) Setting::get('alert_email_recipient', self::DEFAULT_ALERT_RECIPIENT);

        return response()->json([
            'recipient_email' => $value,
        ]);
    }

    public function setAlertEmail(Request $request)
    {
        $data = $request->validate([
            'recipient_email' => 'required|email|max:255',
        ]);

        Setting::set('alert_email_recipient', $data['recipient_email']);

        return response()->json([
            'recipient_email' => $data['recipient_email'],
        ]);
    }

    public function sendTestAlertEmail(Request $request, OutageAlertService $outageAlertService)
    {
        $data = $request->validate([
            'recipient_email' => 'nullable|email|max:255',
        ]);

        $recipient = $data['recipient_email']
            ?? (string) Setting::get('alert_email_recipient', self::DEFAULT_ALERT_RECIPIENT);

        $outageAlertService->sendTestAlertEmail($recipient);

        return response()->json([
            'message' => 'Teszt email elküldve.',
            'recipient_email' => $recipient,
        ]);
    }
}