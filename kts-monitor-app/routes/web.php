<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SwaggerController;
use Illuminate\Http\Request;

Route::get('/', function () {
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