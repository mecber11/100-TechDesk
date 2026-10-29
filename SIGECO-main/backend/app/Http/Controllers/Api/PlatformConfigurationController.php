<?php

namespace App\Http\Controllers\Api;

use App\Business\Platform\PlatformConfigurationService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlatformConfigurationController extends Controller
{
    public function __construct(private readonly PlatformConfigurationService $configuration) {}

    public function modules(): JsonResponse
    {
        return response()->json($this->configuration->modules());
    }

    public function show(): JsonResponse
    {
        return response()->json($this->configuration->current());
    }

    public function update(Request $request): JsonResponse
    {
        $values = $request->validate([
            'nombre_empresa' => 'required|string|max:160',
            'ia_habilitada' => 'required|boolean',
            'documentos_habilitados' => 'required|boolean',
            'slack_habilitado' => 'required|boolean',
        ]);
        return response()->json($this->configuration->update($values, $request->user()));
    }
}
