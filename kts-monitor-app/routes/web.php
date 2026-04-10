<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SwaggerController;
use Illuminate\Http\Request;

Route::get('/', function () {
    $spaIndex = public_path('index.html');

    if (is_file($spaIndex)) {
        return response()->file($spaIndex);
    }

    return view('welcome');
});

// Swagger UI and OpenAPI JSON
Route::get('/swagger', function () {
    return view('swagger');
});

Route::get('/swagger.json', [SwaggerController::class, 'json']);

Route::get('/test-route', function () {
    return 'web ok';
});

// Minimal login route for unauthenticated redirects (always 401 for this API-only app)
Route::get('/login', function (Request $request) {
    abort(401, 'Unauthenticated.');
})->name('login');

// SPA fallback (non-API GET routes)
Route::get('/{any}', function (string $any) {
    if (str_starts_with($any, 'api/')) {
        abort(404);
    }

    $spaIndex = public_path('index.html');

    if (is_file($spaIndex)) {
        return response()->file($spaIndex);
    }

    abort(404);
})->where('any', '.*');