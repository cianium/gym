<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\MediaController;
use App\Http\Controllers\WebEntryController;
use Illuminate\Support\Facades\Route;

// Public Media Serving Route (serves verified public images from storage/app/public/media)
Route::get('/media/{filename}', [MediaController::class, 'serve'])
    ->where('filename', '^media_[a-f0-9\-]{36}\.(jpg|png|webp)$');

// Dynamic White-Label SEO Sitemap & Robots.txt
Route::get('/sitemap.xml', [WebEntryController::class, 'sitemap']);
Route::get('/robots.txt', [WebEntryController::class, 'robots']);

Route::get('/athlete', fn () => response()->view('athlete')->header('Cache-Control', 'no-store, private'));
Route::get('/athlete/register', fn () => response()->view('athlete-register')->header('Cache-Control', 'no-store, private'));
Route::get('/coach/athletes', fn () => response()->view('coach-athletes')->header('Cache-Control', 'no-store, private'));
Route::get('/coach/schedule', fn () => response()->view('coach-schedule')->header('Cache-Control', 'no-store, private')); 

// Dynamic White-Label SEO & SPA Entry Routes (Homepage, Products, Posts, Profile, Shop, Explore, Admin, Installer)
Route::get('/', [WebEntryController::class, 'show']);
Route::get('/products/{id}', [WebEntryController::class, 'show']);
Route::get('/product/{id}', [WebEntryController::class, 'show']);
Route::get('/posts/{id}', [WebEntryController::class, 'show']);
Route::get('/profile', [WebEntryController::class, 'show']);
Route::get('/coach', [WebEntryController::class, 'show']);
Route::get('/shop', [WebEntryController::class, 'show']);
Route::get('/explore', [WebEntryController::class, 'show']);
Route::get('/contact', [WebEntryController::class, 'show']);

Route::get('/{any?}', [WebEntryController::class, 'show'])
    ->where('any', '^(?!api|media|sitemap\.xml|robots\.txt).*$');

