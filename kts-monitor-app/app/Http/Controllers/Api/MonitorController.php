<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Monitor;
use App\Models\MonitorLog;
use App\Services\OutageAlertService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Request;

class MonitorController extends Controller
{
    private const LIGHT_USER_AGENT = 'MyMonitorBot/1.0 (Light Check)';
    private const LIGHT_CONNECT_TIMEOUT_SECONDS = 3.0;
    private const LIGHT_REQUEST_TIMEOUT_SECONDS = 15.0;
    private const LIGHT_DEFAULT_GET_FALLBACK_STATUSES = [416];

    // GET /api/sites
    public function index()
    {
        return response()->json(
            Monitor::orderBy('name')->get([
                'id',
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
            ])
        );
    }

    // POST /api/sites
    public function store(Request $request)
    {
        $data = $request->validate([
            'url' => ['required', 'url'],
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $monitor = Monitor::create([
            'url' => $data['url'],
            'name' => $data['name'] ?? $data['url'],
            'is_active' => true,
        ]);

        return response()->json($monitor, 201);
    }

    // PUT/PATCH /api/sites/{id}
    public function update(Request $request, int $id)
    {
        $monitor = Monitor::findOrFail($id);

        $data = $request->validate([
            'url' => ['sometimes', 'required', 'url'],
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('url', $data)) {
            $monitor->url = $data['url'];
        }

        if (array_key_exists('name', $data)) {
            $monitor->name = $data['name'] ?? $monitor->url;
        }

        if (array_key_exists('is_active', $data)) {
            $monitor->is_active = $data['is_active'];
        }

        $monitor->save();

        return response()->json($monitor);
    }

    // DELETE /api/sites/{id}
    public function destroy(int $id)
    {
        $monitor = Monitor::findOrFail($id);
        $monitor->delete();

        return response()->json(['message' => 'Site deleted']);
    }

    // POST /api/sites/check-all (deep, always runs - ignore interval)
    public function checkAll()
    {
        Artisan::call('sites:check', ['--force' => true]);

        return response()->json([
            'message' => 'All sites refreshed',
            'data' => Monitor::orderBy('name')->get(),
        ]);
    }

    // POST /api/sites/check-all-light (light, always runs - ignore interval)
    public function checkAllLight()
    {
        Artisan::call('sites:check-light', ['--force' => true]);

        return response()->json([
            'message' => 'All sites light-checked',
            'data' => Monitor::orderBy('name')->get(),
        ]);
    }

    // POST /api/sites/{id}/check
    public function checkOne(int $id)
    {
        $monitor = Monitor::findOrFail($id);
        $previousStatus = $monitor->last_status;
        $lastErrorMessage = null;
        $finalStatus = 0;
        $finalResponseTime = null;

        $attempts = 3;
        $attemptsMade = 0;
        $successCount = 0;

        $sslDaysRemaining = null;
        $sslExpiresAt = null;
        $hasHsts = null;
        $redirectCount = null;
        $isWordpress = null;
        $wordpressVersion = null;
        $contentLastModifiedAt = null;

        for ($i = 0; $i < $attempts; $i++) {
            $attemptsMade++;
            $attemptStatus = null;
            $attemptResponseTime = null;
            $attemptError = null;

            try {
                $start = microtime(true);
                $response = Http::timeout(10)->withOptions([
                    'allow_redirects' => [
                        'max' => 10,
                        'track_redirects' => true,
                    ],
                ])->get($monitor->url);
                $end = microtime(true);

                $attemptStatus = $response->status();
                $attemptResponseTime = (int) round(($end - $start) * 1000);

                $finalStatus = (int) $attemptStatus;
                $finalResponseTime = $attemptResponseTime;
                $lastErrorMessage = null;

                if ($attemptStatus >= 200 && $attemptStatus < 400) {
                    $successCount++;
                }

                if ($i === 0) {
                    $redirectHistory = $response->header('X-Guzzle-Redirect-History');
                    if ($redirectHistory !== null) {
                        $redirectUrls = array_filter(explode(', ', $redirectHistory));
                        $redirectCount = count($redirectUrls);
                    }

                    $hasHsts = $response->hasHeader('Strict-Transport-Security');

                    $body = $response->body();
                    if (stripos($body, 'WordPress') !== false) {
                        $isWordpress = true;

                        if (preg_match('/<meta[^>]+name=["\']generator["\'][^>]*content=["\']WordPress\s*([^"\']+)["\']/i', $body, $m)) {
                            $wordpressVersion = trim($m[1]);
                        }
                    } else {
                        $isWordpress = false;
                    }

                    $lastModified = $response->header('Last-Modified');
                    if ($lastModified) {
                        try {
                            $contentLastModifiedAt = new \DateTime($lastModified);
                        } catch (\Exception $e) {
                            $contentLastModifiedAt = null;
                        }
                    }
                }
            } catch (\Exception $e) {
                $attemptError = $e->getMessage();
                $lastErrorMessage = $attemptError;
                $finalStatus = 0;
                $finalResponseTime = null;
            }

            MonitorLog::create([
                'monitor_id' => $monitor->id,
                'status_code' => $attemptStatus,
                'response_time_ms' => $attemptResponseTime,
                'error_message' => $attemptError,
                'checked_at' => now(),
            ]);

            if ($attemptStatus !== null && $attemptStatus >= 200 && $attemptStatus < 400) {
                break;
            }
        }

        $effectiveAttempts = max(1, $attemptsMade);
        $stabilityScore = (int) round(($successCount / $effectiveAttempts) * 100);

        if (str_starts_with($monitor->url, 'https://')) {
            $checker = new \App\Console\Commands\CheckSites();
            $sslInfo = $checker->getSslInfo($monitor->url);
            if ($sslInfo !== null) {
                $sslDaysRemaining = $sslInfo['days_remaining'];
                $sslExpiresAt = $sslInfo['expires_at'];
            }
        }

        $monitor->update([
            'last_status' => $finalStatus,
            'last_response_time_ms' => $finalResponseTime,
            'ssl_days_remaining' => $sslDaysRemaining,
            'ssl_expires_at' => $sslExpiresAt,
            'has_hsts' => $hasHsts,
            'redirect_count' => $redirectCount,
            'is_wordpress' => $isWordpress,
            'wordpress_version' => $wordpressVersion,
            'content_last_modified_at' => $contentLastModifiedAt,
            'stability_score' => $stabilityScore,
            'last_checked_at' => now(),
        ]);

        app(OutageAlertService::class)->maybeSendOutageAlert(
            $monitor,
            $previousStatus,
            $finalStatus,
            $lastErrorMessage
        );

        // Recalculate 24h stability based on last 96 logs (including timeouts > 5000ms)
        $stability24h = MonitorLog::calculateStabilityForMonitor($monitor->id);
        if ($stability24h !== null) {
            $monitor->stability_score = $stability24h;
            $monitor->save();
        }

        $monitor->refresh();

        return response()->json([
            'message' => 'Site refreshed',
            'data' => $monitor,
        ]);
    }

    // POST /api/sites/{id}/check-light
    public function checkOneLight(int $id)
    {
        $monitor = Monitor::findOrFail($id);
        $previousStatus = $monitor->last_status;

        $statusCode = 0;
        $responseTime = null;
        $error = null;
        $redirectCount = 0;
        $start = microtime(true);

        try {
            $response = Http::connectTimeout(self::LIGHT_CONNECT_TIMEOUT_SECONDS)
                ->timeout(self::LIGHT_REQUEST_TIMEOUT_SECONDS)
                ->withOptions([
                    'allow_redirects' => [
                        'max' => 5,
                        'track_redirects' => true,
                    ],
                ])
                ->withHeaders([
                    'User-Agent' => self::LIGHT_USER_AGENT,
                    'Range' => 'bytes=0-0',
                    'Accept-Encoding' => 'identity',
                ])
                ->get($monitor->url);

            $statusCode = $response->status();

            $fallbackStatuses = $this->resolveLightGetFallbackStatuses();
            if (in_array($statusCode, $fallbackStatuses, true)) {
                $response = Http::connectTimeout(self::LIGHT_CONNECT_TIMEOUT_SECONDS)
                    ->timeout(self::LIGHT_REQUEST_TIMEOUT_SECONDS)
                    ->withOptions([
                        'allow_redirects' => [
                            'max' => 5,
                            'track_redirects' => true,
                        ],
                    ])
                    ->withHeaders([
                        'User-Agent' => self::LIGHT_USER_AGENT,
                    ])
                    ->get($monitor->url);

                $statusCode = $response->status();
            }

            $redirectHistory = $response->header('X-Guzzle-Redirect-History');
            if ($redirectHistory !== null) {
                $redirectUrls = array_filter(explode(', ', $redirectHistory));
                $redirectCount = count($redirectUrls);
            }
        } catch (\Throwable $e) {
            $error = $e->getMessage();
        }

        $end = microtime(true);
        $responseTime = (int) round(($end - $start) * 1000);

        MonitorLog::create([
            'monitor_id' => $monitor->id,
            'status_code' => $statusCode,
            'response_time_ms' => $responseTime,
            'error_message' => $error,
            'checked_at' => now(),
        ]);

        $monitor->update([
            'last_status' => $statusCode,
            'last_response_time_ms' => $responseTime,
            'redirect_count' => $redirectCount,
            'last_checked_at' => now(),
        ]);

        app(OutageAlertService::class)->maybeSendOutageAlert(
            $monitor,
            $previousStatus,
            $statusCode,
            $error
        );

        // Recalculate 24h stability based on last 96 logs (including slow responses / timeouts)
        $stability24h = MonitorLog::calculateStabilityForMonitor($monitor->id);
        if ($stability24h !== null) {
            $monitor->stability_score = $stability24h;
            $monitor->save();
        }

        $monitor->refresh();

        return response()->json([
            'message' => 'Site light-checked',
            'data' => $monitor,
        ]);
    }

    /**
     * @return int[]
     */
    private function resolveLightGetFallbackStatuses(): array
    {
        $configured = config('app.monitor_light_get_fallback_statuses');

        if (!is_array($configured) || empty($configured)) {
            $configured = config('app.monitor_light_head_fallback_statuses', self::LIGHT_DEFAULT_GET_FALLBACK_STATUSES);
        }

        if (!is_array($configured) || empty($configured)) {
            return self::LIGHT_DEFAULT_GET_FALLBACK_STATUSES;
        }

        return array_values(array_unique(array_map('intval', $configured)));
    }
}