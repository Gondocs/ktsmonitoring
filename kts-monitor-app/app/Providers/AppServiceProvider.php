<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            $perMinute = (int) env('API_RATE_LIMIT_PER_MINUTE', 120);

            return Limit::perMinute(max(1, $perMinute))
                ->by((string) ($request->user()?->id ?? $request->ip()));
        });

        RateLimiter::for('login', function (Request $request) {
            $perMinute = (int) env('LOGIN_RATE_LIMIT_PER_MINUTE', 5);
            $email = strtolower((string) $request->input('email', ''));

            return Limit::perMinute(max(1, $perMinute))
                ->by($email . '|' . $request->ip());
        });
    }
}
