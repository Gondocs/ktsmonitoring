<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\MonitorController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MonitorLogController;
use App\Http\Controllers\Api\SettingsController;

// Public auth routes
Route::post('/login', [AuthController::class, 'login']);

// Routes that require a valid Sanctum token in the Authorization header
Route::middleware('auth:sanctum')->group(function () {
	Route::post('/logout', [AuthController::class, 'logout']);
	Route::get('/me', [AuthController::class, 'me']);

	// Sites API (primary)
	Route::get('/sites', [MonitorController::class, 'index']);
	Route::post('/sites', [MonitorController::class, 'store']);
	Route::put('/sites/{id}', [MonitorController::class, 'update']);
	Route::patch('/sites/{id}', [MonitorController::class, 'update']);
	Route::delete('/sites/{id}', [MonitorController::class, 'destroy']);
	Route::post('/sites/check-all', [MonitorController::class, 'checkAll']);
	Route::post('/sites/{id}/check', [MonitorController::class, 'checkOne']);

	// Legacy monitors endpoints (optional)
	Route::get('/monitors', [MonitorController::class, 'index']);
	Route::post('/monitors/check', [MonitorController::class, 'checkAll']);

	// Monitor logs (limit is configurable via ?limit=...) 
	Route::get('/sites/{id}/logs', [MonitorLogController::class, 'index']);

	// Settings
	Route::get('/settings/monitor-interval', [SettingsController::class, 'getMonitorInterval']);
	Route::post('/settings/monitor-interval', [SettingsController::class, 'setMonitorInterval']);
});