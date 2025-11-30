<?php

use Illuminate\Foundation\Inspiring;
use App\Console\Commands\CheckSites;
use App\Console\Commands\CheckSitesLight;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Laravel 11 style: register commands by returning class names
return [
    CheckSites::class,
    CheckSitesLight::class,
];
