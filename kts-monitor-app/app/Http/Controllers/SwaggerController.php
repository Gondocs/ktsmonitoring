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
                ],
                '/sites/check-all' => [
                    'post' => [
                        'summary' => 'Check all sites now',
                        'responses' => [
                            '200' => [
                                'description' => 'All sites refreshed',
                            ],
                            '401' => [
                                'description' => 'Unauthorized',
                            ],
                        ],
                    ],
                ],
                '/sites/{id}/check' => [
                    'post' => [
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
            ],
        ];

        return response($spec, 200, ['Content-Type' => 'application/json']);
    }
}
