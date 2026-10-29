@echo off
title SIGECO - Modo Demostracion (100%% Ingenieros)
color 0B
chcp 65001 >nul

echo ======================================================================
echo          SIGECO - Sistema de Gestion Corporativa y Mesa de Ayuda TI
echo                    MODO DEMOSTRACION INDEPENDIENTE
echo ======================================================================
echo.
echo [*] Configurando entorno local de demostracion...

cd /d "%~dp0frontend"

:: Asegurar que .env.local tenga VITE_DEMO_MODE=true
echo VITE_DEMO_MODE=true> .env.local

echo [+] Modo Demo activado (sin necesidad de Laravel, PHP ni PostgreSQL).
echo.
echo [*] Abriendo la aplicacion en tu navegador...
start http://localhost:5173/

echo.
echo [*] Iniciando servidor web de frontend en http://localhost:5173/ ...
echo.
echo ======================================================================
echo  CREDENCIALES DEMO PRECARGADAS:
echo   - Correo:      ti@ingenieros.edu.pe
echo   - Clave:       demo1234
echo   - Rol:         Encargado de TI (acceso completo a todos los modulos)
echo.
echo  MODULOS ACTIVOS EN LA DEMO:
echo   [1] Panel de Control Operativo y KPIs (Dashboard)
echo   [2] Inventario de Activos TI (Laptops, Servidores, Redes)
echo   [3] Prestamos y Asignaciones con Trazabilidad
echo   [4] Mantenimiento Preventivo y Correctivo
echo   [5] Monitoreo de Acuerdos de Nivel de Servicio (SLA)
echo   [6] Mesa de Ayuda y Pedidos Internos
echo ======================================================================
echo.
echo Para detener el sistema en cualquier momento, presiona Ctrl + C en esta ventana.
echo.

npm run dev
pause
