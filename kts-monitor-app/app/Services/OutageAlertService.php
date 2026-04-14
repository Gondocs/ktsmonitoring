<?php

namespace App\Services;

use App\Mail\OutageDetectedMail;
use App\Mail\OutageSummaryMail;
use App\Mail\OutageTestMail;
use App\Models\Monitor;
use App\Models\Setting;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class OutageAlertService
{
    private const DEFAULT_ALERT_RECIPIENT = 'gondocs.robert@gmail.com';

    private bool $batchMode = false;

    /**
     * @var array<string, array{monitor: Monitor, status_code: int, error_message: ?string, detected_at: string}>
     */
    private array $pendingBatchOutages = [];

    public function beginBatch(): void
    {
        $this->batchMode = true;
        $this->pendingBatchOutages = [];
    }

    public function flushBatch(): void
    {
        if (!$this->batchMode) {
            return;
        }

        $this->batchMode = false;

        if (empty($this->pendingBatchOutages)) {
            return;
        }

        $recipient = $this->getRecipient();
        if ($recipient === null) {
            $this->pendingBatchOutages = [];
            return;
        }

        $outages = array_values($this->pendingBatchOutages);

        try {
            if (count($outages) === 1) {
                $single = $outages[0];
                Mail::to($recipient)->send(new OutageDetectedMail(
                    $single['monitor'],
                    $single['status_code'],
                    $single['error_message']
                ));
            } else {
                Mail::to($recipient)->send(new OutageSummaryMail($outages));
            }
        } catch (\Throwable $e) {
            Log::error('Outage batch alert email send failed.', [
                'recipient' => $recipient,
                'count' => count($outages),
                'error' => $e->getMessage(),
            ]);
        } finally {
            $this->pendingBatchOutages = [];
        }
    }

    public function maybeSendOutageAlert(Monitor $monitor, ?int $previousStatus, ?int $currentStatus, ?string $errorMessage = null): void
    {
        // Unknown previous status should not suppress the first outage alert.
        $wasDown = $previousStatus !== null && $this->isDownStatus($previousStatus);
        $isDown = $this->isDownStatus($currentStatus);

        if (!$isDown || $wasDown) {
            return;
        }

        if ($this->batchMode) {
            $this->pendingBatchOutages[(string) $monitor->id] = [
                'monitor' => $monitor,
                'status_code' => $currentStatus ?? 0,
                'error_message' => $errorMessage,
                'detected_at' => now()->format('Y.m.d. H:i:s'),
            ];

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
