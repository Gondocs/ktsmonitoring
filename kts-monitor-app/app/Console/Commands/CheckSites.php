<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use App\Models\Monitor;
use App\Models\MonitorLog;
use App\Models\Setting;

class CheckSites extends Command
{
    protected $signature = 'sites:check {--force : Run checks ignoring interval limit}';
    protected $description = 'Weboldalak ellenőrzése';

    public function handle()
    {
        $defaultInterval = config('app.monitor_interval_minutes');
        $intervalMinutes = (int) Setting::get('monitor_interval_minutes', $defaultInterval);

        $force = (bool) $this->option('force');

        if (!$force) {
            $lastCheck = Monitor::max('last_checked_at');

            if ($lastCheck) {
                $diffMinutes = now()->diffInMinutes($lastCheck);
                if ($diffMinutes < $intervalMinutes) {
                    $this->info("Még nem telt le az intervallum ({$intervalMinutes} perc). Kihagyva.");
                    return 0;
                }
            }
        }

        $monitors = Monitor::where('is_active', true)->get();


        foreach ($monitors as $monitor) {
            $attempts = 3;
            $successCount = 0;
            $statusCodes = [];
            $responseTimes = [];

            $sslDaysRemaining = null;
            $sslExpiresAt = null;
            $hasHsts = null;
            $redirectCount = null;
            $isWordpress = null;
            $wordpressVersion = null;
            $contentLastModifiedAt = null;

            for ($i = 0; $i < $attempts; $i++) {
                $attemptStatus = null;
                $attemptResponseTime = null;
                $attemptError = null;

                try {
                    $start = microtime(true);
                    $response = Http::timeout(5)->withOptions([
                        'allow_redirects' => [
                            'max' => 10,
                            'track_redirects' => true,
                        ],
                    ])->get($monitor->url);
                    $end = microtime(true);

                    $attemptStatus = $response->status();
                    $attemptResponseTime = (int) round(($end - $start) * 1000);

                    $statusCodes[] = $attemptStatus;
                    $responseTimes[] = $attemptResponseTime;

                    if ($attemptStatus >= 200 && $attemptStatus < 400) {
                        $successCount++;
                    }

                    // Első sikeres próbálkozáskor gyűjtjük a "lassabb" metaadatokat
                    if ($i === 0) {
                        // Redirect lánc hossza (Guzzle header)
                        $redirectHistory = $response->header('X-Guzzle-Redirect-History');
                        if ($redirectHistory !== null) {
                            $redirectUrls = array_filter(explode(', ', $redirectHistory));
                            $redirectCount = count($redirectUrls);
                        }

                        // HSTS
                        $hasHsts = $response->hasHeader('Strict-Transport-Security');

                        // WordPress detection (meta generator vagy X-Powered-By)
                        $body = $response->body();
                        if (stripos($body, 'WordPress') !== false) {
                            $isWordpress = true;

                            if (preg_match('/<meta[^>]+name=["\']generator["\'][^>]*content=["\']WordPress\s*([^"\']+)["\']/i', $body, $m)) {
                                $wordpressVersion = trim($m[1]);
                            }
                        } else {
                            $isWordpress = false;
                        }

                        // Last-Modified header
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
                }

                // Logoljuk az egyes próbálkozásokat
                MonitorLog::create([
                    'monitor_id' => $monitor->id,
                    'status_code' => $attemptStatus,
                    'response_time_ms' => $attemptResponseTime,
                    'error_message' => $attemptError,
                    'checked_at' => now(),
                ]);

            }

            $avgStatus = empty($statusCodes) ? 0 : (int) round(array_sum($statusCodes) / count($statusCodes));
            $avgResponseTime = empty($responseTimes) ? null : (int) round(array_sum($responseTimes) / count($responseTimes));

            // Stabilitási score (0-100)
            $stabilityScore = (int) round(($successCount / $attempts) * 100);

            // Ha HTTPS, próbáljuk kiolvasni a cert lejáratát (csak első futáskor vagy ha üres)
            if (str_starts_with($monitor->url, 'https://')) {
                $sslInfo = $this->getSslInfo($monitor->url);
                if ($sslInfo !== null) {
                    $sslDaysRemaining = $sslInfo['days_remaining'];
                    $sslExpiresAt = $sslInfo['expires_at'];
                }
            }

            $monitor->update([
                'last_status' => $avgStatus,
                'last_response_time_ms' => $avgResponseTime,
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
        }
        $this->info('Kész.');
    }

    /**
     * Lekéri az SSL tanúsítvány lejárati idejét és hátralévő napokat.
     */
    public function getSslInfo(string $url): ?array
    {
        $host = parse_url($url, PHP_URL_HOST);
        $port = parse_url($url, PHP_URL_PORT) ?: 443;

        if (!$host) {
            return null;
        }

        $context = stream_context_create([
            'ssl' => [
                'capture_peer_cert' => true,
                'verify_peer' => false,
                'verify_peer_name' => false,
            ],
        ]);

        $client = @stream_socket_client("ssl://{$host}:{$port}", $errno, $errstr, 5, STREAM_CLIENT_CONNECT, $context);

        if (!$client) {
            return null;
        }

        $params = stream_context_get_params($client);
        if (empty($params['options']['ssl']['peer_certificate'])) {
            return null;
        }

        $cert = openssl_x509_parse($params['options']['ssl']['peer_certificate']);
        if (!$cert || empty($cert['validTo_time_t'])) {
            return null;
        }

        $expiresAt = (new \DateTime())->setTimestamp($cert['validTo_time_t']);
        $now = new \DateTime();
        $daysRemaining = (int) $now->diff($expiresAt)->format('%r%a');

        return [
            'expires_at' => $expiresAt,
            'days_remaining' => $daysRemaining,
        ];
    }
}