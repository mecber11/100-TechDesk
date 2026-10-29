<?php

namespace App\Http\Middleware;

use App\Business\Platform\PlatformConfigurationService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireModule
{
    public function __construct(private readonly PlatformConfigurationService $configuration) {}

    public function handle(Request $request, Closure $next, string $module): Response
    {
        if (! $this->configuration->enabled($module)) {
            return response()->json(['message' => 'Este módulo está deshabilitado para la empresa.', 'code' => 'MODULE_DISABLED'], 403);
        }
        return $next($request);
    }
}
