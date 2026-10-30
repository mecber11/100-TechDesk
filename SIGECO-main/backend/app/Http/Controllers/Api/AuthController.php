<?php

namespace App\Http\Controllers\Api;

use App\Business\Auth\AuthService;
use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $auth) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();
        $result = $this->auth->login(
            $data['email'],
            $data['password'],
            $request->ip(),
            substr((string) $request->userAgent(), 0, 300),
        );
        $token = $result['token'];
        $result['token'] = $token;
        $result['token_type'] = 'Bearer';

        return response()->json($result)->cookie(
            'sigeco_session', $token, 480, '/', null,
            false, true, false, 'lax'
        );
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $this->auth->register($request->validated());

        return response()->json(['message' => 'Usuario registrado exitosamente. Esperando aprobación.'], 201);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->auth->logout($request->bearerToken() ?: $request->cookie('sigeco_session'));

        return response()->json(['ok' => true])->withoutCookie('sigeco_session');
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);
        $this->auth->changePassword($request->user(), $data['current_password'], $data['password']);

        return response()->json(['message' => 'Contraseña actualizada. Inicia sesión nuevamente.'])
            ->withoutCookie('sigeco_session');
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->auth->profile($request->user()));
    }
}
