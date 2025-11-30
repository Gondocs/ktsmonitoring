<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\MonitorLog;
use App\Models\Setting;

class CleanOldLogs extends Command
{
    protected $signature = 'logs:clean-old';
    protected $description = 'Delete monitor logs older than the configured retention in days';

    const KEY_RETENTION_DAYS = 'log_retention_days';
    const DEFAULT_DAYS = 15;

    public function handle()
    {
        $days = (int) Setting::get(self::KEY_RETENTION_DAYS, self::DEFAULT_DAYS);

        if ($days < 1) {
            $this->warn('Retention days is less than 1, nothing to delete.');
            return 0;
        }

        $cutoff = now()->subDays($days);

        $count = MonitorLog::where('checked_at', '<', $cutoff)->delete();

        $this->info("Deleted {$count} monitor logs older than {$days} days.");

        return 0;
    }
}
