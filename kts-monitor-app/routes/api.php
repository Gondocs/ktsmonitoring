<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\MonitorController;

Route::get('/monitors', [MonitorController::class, 'index']);
Route::post('/monitors/check', [MonitorController::class, 'check']);
