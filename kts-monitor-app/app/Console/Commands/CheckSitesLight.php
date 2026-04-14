<?php

namespace App\Console\Commands;

use App\Models\Monitor;
use App\Models\MonitorLog;
use App\Models\Setting;
use App\Services\OutageAlertService;
use GuzzleHttp\Client;
use GuzzleHttp\Pool;
use GuzzleHttp\Promise\Create;
use GuzzleHttp\TransferStats;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;
use Psr\Http\Message\ResponseInterface;
use Throwable;

class CheckSitesLight extends Command
{
    protected $signature = 'sites:check-light {--force : Run checks ignoring light interval limit}';
    protected $description = 'Gyors rendelkezésre állás ellenőrzés (parallel GET range + optional full GET fallback)';

    private const USER_AGENT = 'MyMonitorBot/1.0 (Light Check)';
    private const CONNECT_TIMEOUT_SECONDS = 10.0;
    private const REQUEST_TIMEOUT_SECONDS = 30.0;
    private const MAX_REDIRECTS = 5;
    private const DEFAULT_GET_FALLBACK_STATUSES = [416];

    public function handle(): int
    {
        $force = (bool) $this->option('force');

        $defaultInterval = (int) config('app.monitor_interval_light_minutes', 5);
        $intervalMinutes = (int) Setting::get('monitor_interval_light_minutes', $defaultInterval);
        $defaultRetryAttempts = (int) config('app.monitor_retry_attempts', 3);
        $maxAttempts = (int) Setting::get('monitor_retry_attempts', $defaultRetryAttempts);
        $maxAttempts = max(1, min($maxAttempts, 10));

        $batchSize = (int) config('app.monitor_light_batch_size', 15);
        $fallbackStatuses = $this->resolveFallbackStatuses();

        $monitors = $this->getMonitorsToCheck($force, $intervalMinutes, $batchSize);

        if ($monitors->isEmpty()) {
            $this->info('Nincs light ellenőrzésre esedékes monitor.');
            return self::SUCCESS;
        }

        $this->info('Gyors ellenőrzés indítása ' . $monitors->count() . ' monitoron (parallel GET range)...');

        $outageAlertService = app(OutageAlertService::class);
        $outageAlertService->beginBatch();

        // Első próbálkozás minden monitorra (GET Range: bytes=0-0 + opcionális teljes GET fallback).
        $attemptResults = $this->runAttempt($monitors, $fallbackStatuses, true);

        // További próbálkozások csak a még mindig down monitorokra menjenek.
        for ($attempt = 2; $attempt <= $maxAttempts; $attempt++) {
            $stillDown = $monitors->filter(function (Monitor $monitor) use ($attemptResults) {
                $monitorId = (string) $monitor->id;
                $statusCode = (int) ($attemptResults[$monitorId]['status_code'] ?? 0);

                return $this->isDownStatus($statusCode);
            })->values();

            if ($stillDown->isEmpty()) {
                break;
            }

            $this->info('Újrapróbálás ' . $attempt . '/' . $maxAttempts . ' (' . $stillDown->count() . ' monitor)...');

            $retryResults = $this->runAttempt($stillDown, $fallbackStatuses, false);
            foreach ($retryResults as $monitorId => $retryResult) {
                $attemptResults[$monitorId] = $retryResult;
            }
        }

        $checkedAt = now();

        try {
            foreach ($monitors as $monitor) {
                /** @var Monitor $monitor */
                $monitorId = (string) $monitor->id;
                $previousStatus = $monitor->last_status;

                $result = $attemptResults[$monitorId] ?? $this->emptyResult();
                $result['used_fallback'] = (bool) ($result['used_fallback'] ?? false);

                $statusCode = (int) ($result['status_code'] ?? 0);
                $responseTimeMs = (int) ($result['response_time_ms'] ?? 0);
                $errorMessage = $result['error_message'] ?? null;
                $redirectCount = (int) ($result['redirect_count'] ?? 0);

                MonitorLog::create([
                    'monitor_id' => $monitor->id,
                    'status_code' => $statusCode,
                    'response_time_ms' => $responseTimeMs,
                    'error_message' => $errorMessage,
                    'checked_at' => $checkedAt,
                ]);

                $stability24h = MonitorLog::calculateStabilityForMonitor($monitor->id);

                $monitor->last_status = $statusCode;
                $monitor->last_response_time_ms = $responseTimeMs;
                $monitor->redirect_count = $redirectCount;
                $monitor->last_checked_at = $checkedAt;

                if ($stability24h !== null) {
                    $monitor->stability_score = $stability24h;
                }

                $monitor->save();

                $outageAlertService->maybeSendOutageAlert(
                    $monitor,
                    $previousStatus,
                    $statusCode,
                    $errorMessage
                );

                $isUp = ($statusCode >= 200 && $statusCode < 400);
                $statusMsg = $isUp ? 'OK (' . $statusCode . ')' : 'HIBA (' . $statusCode . ')';
                $fallbackTag = !empty($result['used_fallback']) ? ' [GET fallback]' : '';

                $this->line(
                    $monitor->url
                    . ' -> '
                    . $statusMsg
                    . ' (' . $responseTimeMs . 'ms, redirects: ' . $redirectCount . ')'
                    . $fallbackTag
                    . ($errorMessage ? ' | ' . $errorMessage : '')
                );
            }
        } finally {
            $outageAlertService->flushBatch();
        }

        $this->info('Gyors ellenőrzés kész.');
        return self::SUCCESS;
    }

    /**
     * @return array<string, array{
     *     status_code:int,
     *     response_time_ms:int,
     *     error_message:?string,
     *     redirect_count:int,
     *     used_fallback:bool
     * }>
     */
    private function runAttempt(Collection $monitors, array $fallbackStatuses, bool $announceFallback): array
    {
        if ($monitors->isEmpty()) {
            return [];
        }

        $rangeGetResults = $this->runPool($monitors, 'GET', [
            'Range' => 'bytes=0-0',
            'Accept-Encoding' => 'identity',
        ]);

        $fallbackMonitors = $monitors->filter(function (Monitor $monitor) use ($rangeGetResults, $fallbackStatuses) {
            $result = $rangeGetResults[(string) $monitor->id] ?? null;

            if ($result === null) {
                return false;
            }

            return in_array((int) ($result['status_code'] ?? 0), $fallbackStatuses, true);
        })->values();

        $fallbackResults = [];
        if ($fallbackMonitors->isNotEmpty()) {
            if ($announceFallback) {
                $this->info('Teljes GET fallback indul ' . $fallbackMonitors->count() . ' monitorra...');
            }

            $fallbackResults = $this->runPool($fallbackMonitors, 'GET');
        }

        $results = [];
        foreach ($monitors as $monitor) {
            /** @var Monitor $monitor */
            $monitorId = (string) $monitor->id;
            $result = $rangeGetResults[$monitorId] ?? $this->emptyResult();

            if (isset($fallbackResults[$monitorId])) {
                $result = $fallbackResults[$monitorId];
                $result['used_fallback'] = true;
            } else {
                $result['used_fallback'] = false;
            }

            $results[$monitorId] = $result;
        }

        return $results;
    }

    private function getMonitorsToCheck(bool $force, int $intervalMinutes, int $batchSize): Collection
    {
        $query = Monitor::query()
            ->where('is_active', true);

        if (!$force) {
            $cutoff = now()->subMinutes(max(0, $intervalMinutes));

            $query->where(function ($q) use ($cutoff) {
                $q->whereNull('last_checked_at')
                    ->orWhere('last_checked_at', '<=', $cutoff);
            })
                ->orderBy('last_checked_at', 'asc')
                ->orderBy('id', 'asc')
                ->limit(max(1, $batchSize));
        }

        return $query->get();
    }

    /**
     * @return array<string, array{
     *     status_code:int,
     *     response_time_ms:int,
     *     error_message:?string,
     *     redirect_count:int
     * }>
     */
    private function runPool(Collection $monitors, string $method, array $extraHeaders = []): array
    {
        $results = [];
        $stats = [];

        foreach ($monitors as $monitor) {
            $results[(string) $monitor->id] = $this->emptyResult();
        }

        if ($monitors->isEmpty()) {
            return $results;
        }

        $client = new Client([
            'http_errors' => false,
        ]);

        $requests = function () use ($monitors, $client, $method, $extraHeaders, &$stats) {
            foreach ($monitors as $monitor) {
                /** @var Monitor $monitor */
                $monitorId = (string) $monitor->id;

                yield $monitorId => function () use ($client, $method, $monitor, $extraHeaders, &$stats, $monitorId) {
                    try {
                        return $client->requestAsync(
                            $method,
                            $monitor->url,
                            $this->buildRequestOptions($monitorId, $stats, $extraHeaders)
                        );
                    } catch (Throwable $e) {
                        return Create::rejectionFor($e);
                    }
                };
            }
        };

        $pool = new Pool($client, $requests(), [
            'concurrency' => $this->resolveConcurrency($monitors->count()),
            'fulfilled' => function (ResponseInterface $response, string $monitorId) use (&$results, &$stats) {
                $results[$monitorId] = [
                    'status_code' => (int) $response->getStatusCode(),
                    'response_time_ms' => (int) ($stats[$monitorId]['response_time_ms'] ?? 0),
                    'error_message' => null,
                    'redirect_count' => (int) ($stats[$monitorId]['redirect_count'] ?? $this->countRedirectHistoryHeader($response)),
                ];
            },
            'rejected' => function ($reason, string $monitorId) use (&$results, &$stats) {
                $results[$monitorId] = [
                    'status_code' => 0,
                    'response_time_ms' => (int) ($stats[$monitorId]['response_time_ms'] ?? 0),
                    'error_message' => $this->normalizeErrorMessage($reason),
                    'redirect_count' => (int) ($stats[$monitorId]['redirect_count'] ?? 0),
                ];
            },
        ]);

        try {
            $pool->promise()->wait();
        } catch (Throwable $e) {
            // Ez ritka "globális" pool hiba esetére van.
            foreach ($results as $monitorId => $result) {
                if (($result['status_code'] ?? 0) === 0 && empty($result['error_message'])) {
                    $results[$monitorId]['error_message'] = 'Pool failure: ' . $e->getMessage();
                }
            }
        }

        return $results;
    }

    private function buildRequestOptions(string $monitorId, array &$stats, array $extraHeaders = []): array
    {
        return [
            'headers' => array_merge([
                'User-Agent' => self::USER_AGENT,
            ], $extraHeaders),
            'connect_timeout' => self::CONNECT_TIMEOUT_SECONDS,
            'timeout' => self::REQUEST_TIMEOUT_SECONDS,
            'allow_redirects' => [
                'max' => self::MAX_REDIRECTS,
                'track_redirects' => true,
            ],
            'on_stats' => function (TransferStats $transferStats) use (&$stats, $monitorId) {
                $handlerStats = $transferStats->getHandlerStats();

                $stats[$monitorId] = [
                    'response_time_ms' => (int) round($transferStats->getTransferTime() * 1000),
                    'redirect_count' => isset($handlerStats['redirect_count'])
                        ? (int) $handlerStats['redirect_count']
                        : 0,
                ];
            },
        ];
    }

    private function resolveConcurrency(int $monitorCount): int
    {
        $configured = (int) config('app.monitor_light_pool_concurrency', 10);

        if ($configured <= 0) {
            $configured = $monitorCount;
        }

        return max(1, min($configured, max(1, $monitorCount)));
    }

    /**
     * @return int[]
     */
    private function resolveFallbackStatuses(): array
    {
        $configured = config('app.monitor_light_get_fallback_statuses');

        if (!is_array($configured) || empty($configured)) {
            // Backward compatibility with older config key.
            $configured = config('app.monitor_light_head_fallback_statuses', self::DEFAULT_GET_FALLBACK_STATUSES);
        }

        if (!is_array($configured) || empty($configured)) {
            return self::DEFAULT_GET_FALLBACK_STATUSES;
        }

        return array_values(array_unique(array_map('intval', $configured)));
    }

    private function countRedirectHistoryHeader(ResponseInterface $response): int
    {
        $header = $response->getHeaderLine('X-Guzzle-Redirect-History');

        if ($header === '') {
            return 0;
        }

        $parts = array_filter(array_map('trim', explode(',', $header)));

        return count($parts);
    }

    private function normalizeErrorMessage(mixed $reason): string
    {
        if ($reason instanceof Throwable) {
            return $reason->getMessage();
        }

        if (is_string($reason) && $reason !== '') {
            return $reason;
        }

        if (is_object($reason) && method_exists($reason, '__toString')) {
            return (string) $reason;
        }

        return 'Unknown request error.';
    }

    private function isDownStatus(int $statusCode): bool
    {
        return $statusCode <= 0 || $statusCode >= 400;
    }

    /**
     * @return array{
     *     status_code:int,
     *     response_time_ms:int,
     *     error_message:?string,
     *     redirect_count:int
     * }
     */
    private function emptyResult(): array
    {
        return [
            'status_code' => 0,
            'response_time_ms' => 0,
            'error_message' => null,
            'redirect_count' => 0,
        ];
    }
}
