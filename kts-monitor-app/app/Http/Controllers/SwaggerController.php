<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;

class SwaggerController extends Controller
{
    public function json(): Response
    {
        $spec = [
            'openapi' => '3.0.0',
            'info' => [
                'title' => config('app.name', 'KTS Monitoring API'),
                'version' => '1.0.0',
            ],
            'tags' => [
                [
                    'name' => 'Auth',
                    'description' => 'Authentication endpoints (login, current user)',
                ],
                [
                    'name' => 'Monitors',
                    'description' => 'Legacy monitor endpoints',
                ],
                [
                    'name' => 'Sites',
                    'description' => 'Primary site monitoring endpoints',
                ],
                [
                    'name' => 'Settings',
                    'description' => 'Application settings (e.g. check interval)',
                ],
            ],
            'servers' => [
                ['url' => url('/api')],
            ],
            'components' => [
                'securitySchemes' => [
                    'ApiTokenAuth' => [
                        'type' => 'http',
                        'scheme' => 'bearer',
                    ],
                ],
            ],
            'security' => [
                ['ApiTokenAuth' => []],
            ],
            'paths' => [
                '/login' => [
                    'post' => [
                        'tags' => ['Auth'],
                        'summary' => 'Login with email and password',
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'required' => ['email', 'password'],
                                        'properties' => [
                                            'email' => [
                                                'type' => 'string',
                                                'format' => 'email',
                                            ],
                                            'password' => [
                                                'type' => 'string',
                                                'format' => 'password',
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => [
                            '200' => [
                                'description' => 'Login successful',
                            ],
                            '401' => [
                                'description' => 'Invalid credentials',
                            ],
                        ],
                    ],
                ],
                '/me' => [
                    'get' => [
                        'tags' => ['Auth'],
                        'summary' => 'Get the currently authenticated user',
                        'responses' => [
                            '200' => [
                                'description' => 'Current user',
                            ],
                            '401' => [
                                'description' => 'Unauthorized',
                            ],
                        ],
                    ],
                ],
                '/monitors' => [
                    'get' => [
                        'tags' => ['Monitors'],
                        'summary' => 'List monitors',
                        'responses' => [
                            '200' => [
                                'description' => 'List of monitors',
                            ],
                            '401' => [
                                'description' => 'Unauthorized',
                            ],
                        ],
                    ],
                ],
                '/monitors/check' => [
                    'post' => [
                        'tags' => ['Monitors'],
                        'summary' => 'Trigger manual monitor check',
                        'responses' => [
                            '200' => [
                                'description' => 'Check triggered',
                            ],
                            '401' => [
                                'description' => 'Unauthorized',
                            ],
                        ],
                    ],
                ],

                // New /sites API
                '/sites' => [
                    'get' => [
                        'tags' => ['Sites'],
                        'summary' => 'List all sites',
                        'responses' => [
                            '200' => [
                                'description' => 'List of sites',
                            ],
                            '401' => [
                                'description' => 'Unauthorized',
                            ],
                        ],
                    ],
                    'post' => [
                        'tags' => ['Sites'],
                        'summary' => 'Add a new site',
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'required' => ['url'],
                                        'properties' => [
                                            'url' => [
                                                'type' => 'string',
                                                'format' => 'uri',
                                            ],
                                            'name' => [
                                                'type' => 'string',
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => [
                            '201' => [
                                'description' => 'Site created',
                            ],
                            '401' => [
                                'description' => 'Unauthorized',
                            ],
                        ],
                    ],
                ],
                '/sites/{id}' => [
                    'delete' => [
                        'tags' => ['Sites'],
                        'summary' => 'Delete a site',
                        'parameters' => [
                            [
                                'name' => 'id',
                                'in' => 'path',
                                'required' => true,
                                'schema' => [
                                    'type' => 'integer',
                                ],
                            ],
                        ],
                        'responses' => [
                            '200' => [
                                'description' => 'Site deleted',
                            ],
                            '401' => [
                                'description' => 'Unauthorized',
                            ],
                            '404' => [
                                'description' => 'Not found',
                            ],
                        ],
                    ],
                    'put' => [
                        'tags' => ['Sites'],
                        'summary' => 'Update a site (URL, name, active flag)',
                        'parameters' => [
                            [
                                'name' => 'id',
                                'in' => 'path',
                                'required' => true,
                                'schema' => [
                                    'type' => 'integer',
                                ],
                            ],
                        ],
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'properties' => [
                                            'url' => [
                                                'type' => 'string',
                                                'format' => 'uri',
                                            ],
                                            'name' => [
                                                'type' => 'string',
                                            ],
                                            'is_active' => [
                                                'type' => 'boolean',
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => [
                            '200' => [
                                'description' => 'Site updated',
                            ],
                            '401' => [
                                'description' => 'Unauthorized',
                            ],
                            '404' => [
                                'description' => 'Not found',
                            ],
                        ],
                    ],
                ],
                '/sites/check-all' => [
                    'post' => [
                        'tags' => ['Sites'],
                        'summary' => 'Deep check all sites now (Mélyelemzés)',
                        'responses' => [
                            '200' => [
                                'description' => 'All sites deep-checked and refreshed',
                            ],
                            '401' => [
                                'description' => 'Unauthorized',
                            ],
                        ],
                    ],
                ],
                '/sites/check-all-light' => [
                    'post' => [
                        'tags' => ['Sites'],
                        'summary' => 'Light heartbeat check for all sites (Szívverés)',
                        'responses' => [
                            '200' => [
                                'description' => 'All sites light-checked (heartbeat)',
                            ],
                            '401' => [
                                'description' => 'Unauthorized',
                            ],
                        ],
                    ],
                ],
                '/sites/{id}/check' => [
                    'post' => [
                        'tags' => ['Sites'],
                        'summary' => 'Check a single site now',
                        'parameters' => [
                            [
                                'name' => 'id',
                                'in' => 'path',
                                'required' => true,
                                'schema' => [
                                    'type' => 'integer',
                                ],
                            ],
                        ],
                        'responses' => [
                            '200' => [
                                'description' => 'Site refreshed',
                            ],
                            '401' => [
                                'description' => 'Unauthorized',
                            ],
                            '404' => [
                                'description' => 'Not found',
                            ],
                        ],
                    ],
                ],
                '/sites/{id}/check-light' => [
                    'post' => [
                        'tags' => ['Sites'],
                        'summary' => 'Light heartbeat check for a single site (Szívverés)',
                        'parameters' => [
                            [
                                'name' => 'id',
                                'in' => 'path',
                                'required' => true,
                                'schema' => [
                                    'type' => 'integer',
                                ],
                            ],
                        ],
                        'responses' => [
                            '200' => [
                                'description' => 'Site light-checked (heartbeat)',
                            ],
                            '401' => [
                                'description' => 'Unauthorized',
                            ],
                            '404' => [
                                'description' => 'Not found',
                            ],
                        ],
                    ],
                ],

                // Settings: monitor interval
                '/settings/monitor-interval' => [
                    'get' => [
                        'tags' => ['Settings'],
                        'summary' => 'Get current monitor check interval (minutes)',
                        'responses' => [
                            '200' => [
                                'description' => 'Current interval returned',
                            ],
                            '401' => [
                                'description' => 'Unauthorized',
                            ],
                        ],
                    ],
                    'post' => [
                        'tags' => ['Settings'],
                        'summary' => 'Set monitor check interval (minutes)',
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'required' => ['interval_minutes'],
                                        'properties' => [
                                            'interval_minutes' => [
                                                'type' => 'integer',
                                                'minimum' => 1,
                                                'maximum' => 10080,
                                                'description' => 'Interval in minutes (1-10080)',
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => [
                            '200' => [
                                'description' => 'Interval updated',
                            ],
                            '400' => [
                                'description' => 'Validation error',
                            ],
                            '401' => [
                                'description' => 'Unauthorized',
                            ],
                        ],
                    ],
                ],
                '/settings/monitor-interval-light' => [
                    'get' => [
                        'tags' => ['Settings'],
                        'summary' => 'Get current light monitor check interval (minutes)',
                        'responses' => [
                            '200' => [
                                'description' => 'Current light interval returned',
                            ],
                            '401' => [
                                'description' => 'Unauthorized',
                            ],
                        ],
                    ],
                    'post' => [
                        'tags' => ['Settings'],
                        'summary' => 'Set light monitor check interval (minutes)',
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'required' => ['interval_minutes'],
                                        'properties' => [
                                            'interval_minutes' => [
                                                'type' => 'integer',
                                                'minimum' => 1,
                                                'maximum' => 10080,
                                                'description' => 'Light interval in minutes (1-10080)',
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => [
                            '200' => [
                                'description' => 'Light interval updated',
                            ],
                            '400' => [
                                'description' => 'Validation error',
                            ],
                            '401' => [
                                'description' => 'Unauthorized',
                            ],
                        ],
                    ],
                ],
            ],
        ];

        return response($spec, 200, ['Content-Type' => 'application/json']);
    }
}
