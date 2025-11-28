<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use App\Models\Monitor;

class CheckSites extends Command
{
    protected $signature = 'sites:check';
    protected $description = 'Weboldalak ellenőrzése';

    public function handle()
    {
        $monitors = Monitor::where('is_active', true)->get();

        foreach ($monitors as $monitor) {
            try {
                $response = Http::timeout(5)->get($monitor->url);
                $status = $response->status();
            } catch (\Exception $e) {
                $status = 0; // 0 jelentése: hiba/timeout
            }

            $monitor->update([
                'last_status' => $status,
                'last_checked_at' => now(),
            ]);
        }
        $this->info('Kész.');
    }
}