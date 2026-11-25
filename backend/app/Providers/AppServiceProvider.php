<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

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
        RateLimiter::for('login', function (Request $request) {
            $email = strtolower((string) $request->input('email', ''));

            return Limit::perMinute(30)->by($email.'|'.$request->ip());
        });

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(1000)->by((string) ($request->user()?->id ?: $request->ip()));
        });

        RateLimiter::for('realtime', function (Request $request) {
            return Limit::perMinute(600)->by((string) ($request->user()?->id ?: $request->ip()));
        });

        RateLimiter::for('mutations', function (Request $request) {
            return Limit::perMinute(180)->by((string) ($request->user()?->id ?: $request->ip()));
        });

        RateLimiter::for('payroll', function (Request $request) {
            return Limit::perMinute(120)->by((string) ($request->user()?->id ?: $request->ip()));
        });

        if (app()->runningInConsole() || ! app()->environment('production')) {
            return;
        }

        if (config('filesystems.default') !== 's3') {
            throw new RuntimeException('Production document storage must use the private S3 disk.');
        }

        $disk = config('filesystems.disks.s3');
        if (blank($disk['bucket'] ?? null) || blank($disk['region'] ?? null)) {
            throw new RuntimeException('Production S3 storage requires AWS_BUCKET and AWS_DEFAULT_REGION.');
        }

        if (filled($disk['key'] ?? null) !== filled($disk['secret'] ?? null)) {
            throw new RuntimeException('Production S3 credentials must include both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or neither when using workload identity.');
        }
    }
}
