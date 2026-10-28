<?php

namespace App\Providers;

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
