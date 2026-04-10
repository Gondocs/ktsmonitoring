<?php

namespace App\Services;

use App\Mail\OutageDetectedMail;
use App\Mail\OutageTestMail;
use App\Models\Monitor;
use App\Models\Setting;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class OutageAlertService
{
    private const DEFAULT_ALERT_RECIPIENT = 'gondocs.robert@gmail.com';

    public function maybeSendOutageAlert(Monitor $monitor, ?int $previousStatus, ?int $currentStatus, ?string $errorMessage = null): void
    {
        // Unknown previous status should not suppress the first outage alert.
        $wasDown = $previousStatus !== null && $this->isDownStatus($previousStatus);
        $isDown = $this->isDownStatus($currentStatus);

        if (!$isDown || $wasDown) {
            return;
        }

        $recipient = $this->getRecipient();
        if ($recipient === null) {
            return;
        }

        try {
            Mail::to($recipient)->send(new OutageDetectedMail(
                $monitor,
                $currentStatus ?? 0,
                $errorMessage
            ));
        } catch (\Throwable $e) {
            Log::error('Outage alert email send failed.', [
                'monitor_id' => $monitor->id,
                'monitor_url' => $monitor->url,
                'recipient' => $recipient,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function sendTestAlertEmail(string $recipient): void
    {
        Mail::to($recipient)->send(new OutageTestMail());
    }

    private function getRecipient(): ?string
    {
        $recipient = (string) Setting::get('alert_email_recipient', self::DEFAULT_ALERT_RECIPIENT);
        if ($recipient === '') {
            return null;
        }

        return $recipient;
    }

    private function isDownStatus(?int $statusCode): bool
    {
        if ($statusCode === null || $statusCode <= 0) {
            return true;
        }

        return $statusCode >= 400;
    }
}
