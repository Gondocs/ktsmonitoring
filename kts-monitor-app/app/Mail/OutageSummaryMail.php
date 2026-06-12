<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OutageSummaryMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    /**
     * @var array<int, array{monitor: \App\Models\Monitor, status_code: int, error_message: ?string, detected_at: string}>
     */
    public array $outages;

    /**
     * @param array<int, array{monitor: \App\Models\Monitor, status_code: int, error_message: ?string, detected_at: string}> $outages
     */
    public function __construct(array $outages)
    {
        $this->outages = $outages;
    }

    public function build(): self
    {
        $count = count($this->outages);

        return $this
            ->subject("KTS Monitor riasztás: {$count} oldal elérhetetlen")
            ->view('emails.outage-summary')
            ->with([
                'outages' => $this->outages,
                'count' => $count,
                'generatedAt' => now()->timezone('Europe/Budapest')->format('Y.m.d. H:i:s'),
            ]);
    }
}
