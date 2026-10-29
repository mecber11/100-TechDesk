<?php

namespace App\Http\Middleware;

use App\Business\Auth\AuthService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiToken
{
    public function __construct(private readonly AuthService $auth) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken() ?: $request->cookie('sigeco_session');
        $user = $this->auth->authenticateToken($token);
        abort_unless($user, 401, 'Sesión inválida o expirada');
        $request->setUserResolver(fn () => $user);

        if (app(\App\Common\Support\AreaAccess::class)->isPlatformAdmin($user)
            && ! $request->is('api/v1/auth/*', 'api/v1/platform/*', 'api/v1/modules')) {
            return response()->json(['message' => 'La cuenta de plataforma administra configuración, no operaciones de la empresa.'], 403);
        }

        $allowedWhileChanging = ['api/v1/auth/me', 'api/v1/auth/logout', 'api/v1/auth/password'];
        abort_if($user->cambiar_contrasena && ! in_array($request->path(), $allowedWhileChanging, true), 428, 'Debes cambiar tu contraseña antes de continuar.');

        return $next($request);
    }
}
