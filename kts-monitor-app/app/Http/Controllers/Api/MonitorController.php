<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Monitor;
use Illuminate\Support\Facades\Artisan;

class MonitorController extends Controller
{
    // Listázás (GET)
    public function index()
    {
        return response()->json(Monitor::orderBy('name')->get());
    }

    // Manuális frissítés indítása (POST)
    public function check()
    {
        Artisan::call('sites:check'); // Lefuttatja a fenti parancsot
        return response()->json(['message' => 'Frissítés lefutott', 'data' => Monitor::all()]);
    }
}