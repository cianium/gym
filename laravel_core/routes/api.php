<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\AdminAuthController;
use App\Http\Controllers\Api\V1\AdminStateController;
use App\Http\Controllers\Api\V1\BootstrapController;
use App\Http\Controllers\Api\V1\CheckoutController;
use App\Http\Controllers\Api\V1\ConsultationController;
use App\Http\Controllers\Api\V1\DownloadController;
use App\Http\Controllers\Api\V1\InstallController;
use App\Http\Controllers\Api\V1\MediaController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PaymentCallbackController;
use App\Http\Controllers\Api\V1\PostInteractionController;
use App\Http\Controllers\Api\V1\PrivateAssetController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\RevisionController;
use App\Http\Controllers\Api\V1\SystemMaintenanceController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AthletePortalController;
use App\Http\Controllers\Api\V1\TrainingPlanAdminController;
use App\Http\Controllers\Api\V1\CoachScheduleController;
use App\Http\Controllers\Api\V1\CoachMessageController;
use App\Http\Controllers\Api\V1\CoachLeadController;

/*
|--------------------------------------------------------------------------
| White-Label Single-Tenant Fitness Platform — Laravel 13 API Routes
|--------------------------------------------------------------------------
*/

// 0. Secure One-Time Installer Endpoints (Rate-Limited + Setup Token Protected)
Route::prefix('v1/install')->group(function () {
    Route::get('/status', [InstallController::class, 'status']);
    Route::post('/run', [InstallController::class, 'run'])->middleware('throttle:5,10,installer');
});

// 1. Public & Admin Bootstrap (strips private orders and unapproved comments for unauthenticated visitors)
Route::get('/v1/bootstrap', [BootstrapController::class, 'index'])->middleware('throttle:120,1,bootstrap');

// 1b. Public Media Serving Fallback via API prefix
Route::get('/v1/media/{filename}', [MediaController::class, 'serve'])
    ->where('filename', '^[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|webp|gif|mp4|webm)$');

// 2. Admin Session & Authentication
Route::prefix('v1/auth')->group(function () {
    Route::get('/session', [AdminAuthController::class, 'session']);
    Route::post('/admin/login', [AdminAuthController::class, 'login'])->middleware('throttle:8,10,admin-login');
    Route::post('/admin/logout', [AdminAuthController::class, 'logout'])
        ->middleware(['admin.auth', 'admin.csrf']);
    Route::post('/admin/password', [AdminAuthController::class, 'changePassword'])
        ->middleware(['admin.auth', 'admin.csrf']);
});

// 3. Authoritative Checkout, Order Status & Customer Purchase Lookup (with Ownership Policy)
Route::post('/checkout', [CheckoutController::class, 'verifiedStore'])->middleware(['athlete.auth', 'admin.csrf', 'throttle:8,1,checkout']);
Route::post('/v1/checkout', [CheckoutController::class, 'verifiedStore'])->middleware(['athlete.auth', 'admin.csrf', 'throttle:8,1,checkout']);
Route::get('/orders/{orderId}', [OrderController::class, 'show'])->middleware('throttle:30,1,order-view');
Route::get('/v1/orders/{orderId}', [OrderController::class, 'show'])->middleware('throttle:30,1,order-view');
Route::post('/v1/customer/orders/lookup', [OrderController::class, 'customerLookup'])->middleware('throttle:10,10,order-lookup');

// 4. Bank Callbacks & Dev-Only Sandbox Callback
Route::match(['get', 'post'], '/v1/payments/callback/{gateway}', [PaymentCallbackController::class, 'handleBankCallback'])
    ->middleware('throttle:60,1,payment-callback');
Route::post('/mock-gateway/callback', [PaymentCallbackController::class, 'handleSandboxCallback'])->middleware('throttle:20,1,mock-callback');
Route::post('/v1/mock-gateway/callback', [PaymentCallbackController::class, 'handleSandboxCallback'])->middleware('throttle:20,1,mock-callback');

// 5. Protected Private Digital Asset Download (Explicit Ownership & Entitlement Authorization)
Route::get('/v1/downloads/{token}', [DownloadController::class, 'download'])->middleware('throttle:20,1,digital-download');

// 6. Public Coaching Consultation & Explore/Reels Interactions (Moderated Comments)
Route::post('/v1/consultations', [ConsultationController::class, 'store'])->middleware('throttle:5,10,consultation');
Route::post('/v1/posts/{postId}/like', [PostInteractionController::class, 'toggleLike'])->middleware('throttle:30,10,post-like');
Route::post('/v1/posts/{postId}/comments', [PostInteractionController::class, 'storeComment'])->middleware('throttle:10,10,post-comment');

// 7. Protected Admin CMS, Media Storage, Private Digital Assets, Product CRUD, Order Reconciliation, Backup/Restore, Revisions & Reset (Auth + CSRF Mandatory)
Route::prefix('v1/admin')
    ->middleware(['admin.auth', 'admin.csrf'])
    ->group(function () {
        Route::put('/state-sync', [AdminStateController::class, 'sync']);
        Route::get('/products', [ProductController::class, 'index']);
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{id}', [ProductController::class, 'update']);
        Route::delete('/products/{id}', [ProductController::class, 'destroy']);

        // Private Digital Training Assets (PDF upload, versioning, availability & revocation)
        Route::get('/products/{id}/private-file', [PrivateAssetController::class, 'status']);
        Route::post('/products/{id}/private-file', [PrivateAssetController::class, 'upload']);
        Route::post('/entitlements/{token}/revoke', [PrivateAssetController::class, 'revokeEntitlement']);

        // Order Reconciliation & Refund Accounting
        Route::post('/orders/{orderId}/reconcile', [OrderController::class, 'reconcile']);

        // Public Media Management
        Route::get('/media', [MediaController::class, 'index']);
        Route::post('/media', [MediaController::class, 'store']);
        Route::delete('/media/{id}', [MediaController::class, 'destroy']);

        // Dedicated Explore / Reels Comment Moderation & Deletion
        Route::patch('/posts/{postId}/comments/{commentId}', [PostInteractionController::class, 'moderateComment']);
        Route::delete('/posts/{postId}/comments/{commentId}', [PostInteractionController::class, 'destroyComment']);

        // System Version, Compatibility, Backup, Pre-Upgrade Snapshot & Non-Destructive Restore (Section 9)
        Route::get('/system/status', [SystemMaintenanceController::class, 'status']);
        Route::get('/backup/export', [SystemMaintenanceController::class, 'exportBackup']);
        Route::post('/backup/snapshot', [SystemMaintenanceController::class, 'createPreUpgradeSnapshot']);
        Route::post('/backup/restore', [SystemMaintenanceController::class, 'restoreBackup']);

        // Page Revisions & Factory Reset
        Route::post('/revisions/publish', [RevisionController::class, 'publish']);
        Route::post('/revisions/{id}/restore', [RevisionController::class, 'restore']);
        Route::post('/reset', [AdminStateController::class, 'reset']);
    });

// Public registration is OTP-gated and rate-limited. Requires configured SMS provider.
Route::post('/v1/athlete/otp/request', [\App\Http\Controllers\Api\V1\AthleteRegistrationController::class, 'requestCode'])->middleware('throttle:3,10');
Route::post('/v1/athlete/register', [\App\Http\Controllers\Api\V1\AthleteRegistrationController::class, 'register'])->middleware('throttle:8,10');

// Athlete portal: login and verified public registration.
Route::post('/v1/athlete/login', [AthletePortalController::class, 'login'])->middleware('throttle:8,10,athlete-login');
Route::prefix('v1/athlete')->middleware('athlete.auth')->group(function () {
    Route::get('/me', [AthletePortalController::class, 'me']);
    Route::post('/phone/otp/request', [\App\Http\Controllers\Api\V1\AthleteRegistrationController::class, 'requestLoggedInCode'])
        ->middleware(['admin.csrf', 'throttle:3,10']);
    Route::post('/phone/verify', [\App\Http\Controllers\Api\V1\AthleteRegistrationController::class, 'verifyLoggedInCode'])
        ->middleware(['admin.csrf', 'throttle:8,10']);
    Route::get('/plans', [AthletePortalController::class, 'plans']);
    Route::get('/orders', [AthletePortalController::class, 'orders']);
    Route::post('/checkout', [CheckoutController::class, 'verifiedStore'])->middleware(['admin.csrf', 'throttle:8,1']);
    Route::get('/progress', [AthletePortalController::class, 'progress']);
    Route::post('/progress', [AthletePortalController::class, 'saveProgress'])->middleware(['admin.csrf', 'throttle:30,1']);
    Route::post('/logout', [AthletePortalController::class, 'logout'])->middleware('admin.csrf');
    // Verified-athlete consultation bookings and private coach messaging
    Route::get('/consultations/slots', [CoachScheduleController::class, 'available']);
    Route::get('/consultations/bookings', [CoachScheduleController::class, 'mine']);
    Route::post('/consultations/bookings', [CoachScheduleController::class, 'book'])->middleware(['admin.csrf', 'throttle:6,10']);
    Route::post('/consultations/bookings/{booking}/cancel', [CoachScheduleController::class, 'cancelMine'])->middleware(['admin.csrf', 'throttle:6,10']);
    Route::get('/messages', [CoachMessageController::class, 'athleteIndex']);
    Route::post('/messages', [CoachMessageController::class, 'athleteSend'])->middleware(['admin.csrf', 'throttle:12,10']);
    Route::post('/messages/read', [CoachMessageController::class, 'athleteRead'])->middleware('admin.csrf');
});
Route::prefix('v1/admin')->middleware(['admin.auth', 'admin.csrf'])->group(function () {
    Route::get('/athletes', [TrainingPlanAdminController::class, 'athletes']);
    Route::post('/athletes', [TrainingPlanAdminController::class, 'createAthlete']);
    Route::get('/training-plans', [TrainingPlanAdminController::class, 'index']);
    Route::get('/athletes/{athlete}/progress', [TrainingPlanAdminController::class, 'athleteProgress']);
    Route::post('/training-plans', [TrainingPlanAdminController::class, 'store']);
    Route::put('/training-plans/{plan}', [TrainingPlanAdminController::class, 'update']);
    // Coach's private consultation calendar (never expose athlete PII publicly)
    Route::get('/consultation-leads', [CoachLeadController::class, 'index']);
    Route::post('/consultation-leads/{lead}/status', [CoachLeadController::class, 'update']);
    Route::get('/consultation-slots', [CoachScheduleController::class, 'slots']);
    Route::post('/consultation-slots', [CoachScheduleController::class, 'createSlot'])->middleware('throttle:30,1');
    Route::post('/consultation-slots/{slot}/disable', [CoachScheduleController::class, 'disableSlot']);
    Route::get('/consultation-bookings', [CoachScheduleController::class, 'bookings']);
    Route::get('/consultation-sms-status', [CoachScheduleController::class, 'smsStatus']);
    Route::post('/consultation-bookings/{booking}/status', [CoachScheduleController::class, 'updateBooking']);
    Route::get('/athletes/{athlete}/messages', [CoachMessageController::class, 'adminIndex']);
    Route::post('/athletes/{athlete}/messages', [CoachMessageController::class, 'adminSend'])->middleware('throttle:40,1');
    Route::post('/athletes/{athlete}/messages/read', [CoachMessageController::class, 'adminRead']);
});
