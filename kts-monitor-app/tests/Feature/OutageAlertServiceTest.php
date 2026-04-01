<?php

namespace Tests\Feature;

use App\Mail\OutageDetectedMail;
use App\Models\Monitor;
use App\Models\Setting;
use App\Services\OutageAlertService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class OutageAlertServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_sends_email_when_site_goes_from_up_to_down(): void
    {
        Mail::fake();
        Setting::set('alert_email_recipient', 'alerts@example.com');

        $monitor = Monitor::create([
            'url' => 'https://example.com',
            'name' => 'Example',
            'is_active' => true,
        ]);

        app(OutageAlertService::class)->maybeSendOutageAlert($monitor, 200, 404, null);

        Mail::assertSent(OutageDetectedMail::class, function (OutageDetectedMail $mail) {
            return $mail->hasTo('alerts@example.com');
        });
    }

    public function test_it_does_not_send_email_when_site_stays_down(): void
    {
        Mail::fake();
        Setting::set('alert_email_recipient', 'alerts@example.com');

        $monitor = Monitor::create([
            'url' => 'https://example.com',
            'name' => 'Example',
            'is_active' => true,
        ]);

        app(OutageAlertService::class)->maybeSendOutageAlert($monitor, 404, 500, null);

        Mail::assertNothingSent();
    }
}
