<?php

declare(strict_types=1);

return [
    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [
        // Private disk outside public_html for protected digital PDF/video training assets
        'private_downloads' => [
            'driver' => 'local',
            'root' => storage_path('app/private_downloads'),
            'visibility' => 'private',
            'throw' => true,
        ],

        // Public disk for product images, brand logos, and coach avatars
        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL') . '/storage',
            'visibility' => 'public',
            'throw' => false,
        ],
    ],
];
