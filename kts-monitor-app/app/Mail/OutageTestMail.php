<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OutageTestMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function build(): self
    {
        return $this
            ->subject('KTS Monitor teszt email')
            ->view('emails.outage-test')
            ->with([
                'sentAt' => now()->format('Y-m-d H:i:s'),
            ]);
    }
}
