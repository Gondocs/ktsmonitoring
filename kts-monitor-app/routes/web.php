<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SwaggerController;

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