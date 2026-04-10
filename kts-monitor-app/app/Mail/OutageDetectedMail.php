<?php

namespace App\Mail;

use App\Models\Monitor;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OutageDetectedMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public Monitor $monitor;
    public int $statusCode;
    public ?string $errorMessage;

    public function __construct(Monitor $monitor, int $statusCode, ?string $errorMessage = null)
    {
        $this->monitor = $monitor;
        $this->statusCode = $statusCode;
        $this->errorMessage = $errorMessage;
    }

    public function build(): self
    {
        return $this
            ->subject('KTS Monitor riasztás: oldalleállás észlelve')
            ->view('emails.outage-detected')
            ->with([
                'monitor' => $this->monitor,
                'statusCode' => $this->statusCode,
                'errorMessage' => $this->errorMessage,
                'checkedAt' => now()->format('Y.m.d. H:i:s'),
            ]);
    }
}
