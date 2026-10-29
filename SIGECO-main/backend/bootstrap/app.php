<?php

use App\Common\Exceptions\DomainException;
use App\Http\Middleware\AuthenticateApiToken;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->append(SecurityHeaders::class);
        $middleware->validateCsrfTokens(except: ['api/*']);
        $middleware->alias([
            'api.token' => AuthenticateApiToken::class,
            'role' => CheckRole::class,
            'module' => \App\Http\Middleware\RequireModule::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Illuminate\Http\Exceptions\PostTooLargeException $e) {
            return response()->json(['message' => 'La carga supera el límite del servidor. Adjunta archivos de hasta 10 MB cada uno.'], 413);
        });
        $exceptions->render(function (DomainException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => $e->codeKey,
            ], $e->httpStatus);
        });
    })->create();
