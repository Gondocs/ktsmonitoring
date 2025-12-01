<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use App\Models\Monitor;
use App\Models\MonitorLog;
use App\Models\Setting;

class CheckSitesLight extends Command
{
    protected $signature = 'sites:check-light {--force : Run checks ignoring light interval limit}';
    protected $description = 'Gyors rendelkezésre állás ellenőrzés (HEAD request only)';

    const USER_AGENT = 'MyMonitorBot/1.0 (Light Check)';

    public function handle()
    {
        $force = (bool) $this->option('force');
        $defaultInterval = config('app.monitor_interval_light_minutes');
        $intervalMinutes = (int) Setting::get('monitor_interval_light_minutes', $defaultInterval);
        $batchSize = (int) config('app.monitor_light_batch_size', 15);

        if ($force) {
            // Manual run: ignore interval and batch limits, check all active monitors
            $monitors = Monitor::where('is_active', true)->get();
        } else {
            // Scheduler run: always check the next batch of oldest monitors
            $monitors = Monitor::where('is_active', true)
                ->orderBy('last_checked_at', 'asc')
                ->limit($batchSize)
                ->get();

            if ($monitors->isEmpty()) {
                $this->info('Nincs light ellenőrzésre esedékes monitor.');
                return 0;
            }
        }

        $this->info('Gyors ellenőrzés indítása ' . count($monitors) . ' monitoron...');

        foreach ($monitors as $monitor) {
            $start = microtime(true);
            $statusCode = 0;
            $error = null;

            try {
                $response = Http::timeout(10)
                    ->withHeaders(['User-Agent' => self::USER_AGENT])
                    ->head($monitor->url);

                $statusCode = $response->status();

                // Megpróbálom ez nélkü, hogy futnak-e problémák a HEAD kéréssel
                /*
                 if ($statusCode === 405) {
                     $response = Http::timeout(5)
                         ->withHeaders(['User-Agent' => self::USER_AGENT])
                         ->get($monitor->url);
                     $statusCode = $response->status();
                 }

                 */

            } catch (\Exception $e) {
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

            $isUp = ($statusCode >= 200 && $statusCode < 400);

            $monitor->update([
                'last_status' => $statusCode,
                'last_response_time_ms' => $responseTime,
                'last_checked_at' => now(),
            ]);

            $statusMsg = $isUp ? 'OK (' . $statusCode . ')' : 'HIBA (' . $statusCode . ')';
            $this->line($monitor->url . ' -> ' . $statusMsg . ' (' . $responseTime . 'ms)');
        }

        $this->info('Gyors ellenőrzés kész.');
    }
}
