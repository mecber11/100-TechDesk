<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $userRoles = $user->roles->pluck('nombre')->toArray();

        // La administración de empresa nunca concede configuración de plataforma.
        if (! in_array('Plataforma_Admin', $roles, true)
            && app(\App\Common\Support\AreaAccess::class)->isCompanyAdmin($user)) {
            return $next($request);
        }

        foreach ($roles as $role) {
            $parsedRoles = explode('|', $role);
            foreach ($parsedRoles as $r) {
                if (in_array($r, $userRoles)) {
                    return $next($request);
                }
            }
        }

        return response()->json(['message' => 'No tienes permisos para acceder a esta ruta.'], 403);
    }
}
