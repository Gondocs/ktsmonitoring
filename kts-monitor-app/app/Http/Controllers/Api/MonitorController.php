<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Monitor;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Http\Request;

class MonitorController extends Controller
{
    // GET /api/sites
    public function index()
    {
        return response()->json(
            Monitor::orderBy('name')->get([
                'id',
                'url',
                'name',
                'last_status',
                'last_response_time_ms',
                'ssl_days_remaining',
                'ssl_expires_at',
                'has_hsts',
                'redirect_count',
                'is_wordpress',
                'wordpress_version',
                'content_last_modified_at',
                'stability_score',
                'last_checked_at',
                'is_active',
            ])
        );
    }

    // POST /api/sites
    public function store(Request $request)
    {
        $data = $request->validate([
            'url' => ['required', 'url'],
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $monitor = Monitor::create([
            'url' => $data['url'],
            'name' => $data['name'] ?? $data['url'],
            'is_active' => true,
        ]);

        return response()->json($monitor, 201);
    }

    // PUT/PATCH /api/sites/{id}
    public function update(Request $request, int $id)
    {
        $monitor = Monitor::findOrFail($id);

        $data = $request->validate([
            'url' => ['sometimes', 'required', 'url'],
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('url', $data)) {
            $monitor->url = $data['url'];
        }

        if (array_key_exists('name', $data)) {
            $monitor->name = $data['name'] ?? $monitor->url;
        }

        if (array_key_exists('is_active', $data)) {
            $monitor->is_active = $data['is_active'];
        }

        $monitor->save();

        return response()->json($monitor);
    }

    // DELETE /api/sites/{id}
    public function destroy(int $id)
    {
        $monitor = Monitor::findOrFail($id);
        $monitor->delete();

        return response()->json(['message' => 'Site deleted']);
    }

    // POST /api/sites/check-all
    public function checkAll()
    {
        Artisan::call('sites:check', ['--force' => true]);

        return response()->json([
            'message' => 'All sites refreshed',
            'data' => Monitor::orderBy('name')->get(),
        ]);
    }

    // POST /api/sites/{id}/check
    public function checkOne(int $id)
    {
        $monitor = Monitor::findOrFail($id);

        $originalActive = $monitor->is_active;
        $monitor->is_active = true;
        $monitor->save();

        Artisan::call('sites:check', ['--force' => true]);

        $monitor->is_active = $originalActive;
        $monitor->save();

        $monitor->refresh();

        return response()->json([
            'message' => 'Site refreshed',
            'data' => $monitor,
        ]);
    }
}