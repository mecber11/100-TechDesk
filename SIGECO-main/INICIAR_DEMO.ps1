Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "         SIGECO - Sistema de Gestión Corporativa y Mesa de Ayuda TI   " -ForegroundColor Cyan
Write-Host "                   MODO DEMOSTRACIÓN INDEPENDIENTE                    " -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$frontendPath = Join-Path $PSScriptRoot "frontend"
Set-Location $frontendPath

# Asegurar modo demo
"VITE_DEMO_MODE=true" | Out-File -FilePath (Join-Path $frontendPath ".env.local") -Encoding ascii

Write-Host "[+] Modo Demo activo en .env.local (sin necesidad de Backend ni PostgreSQL)." -ForegroundColor Green
Write-Host "[*] Abriendo el navegador en http://localhost:5173/ ..." -ForegroundColor Cyan

Start-Process "http://localhost:5173/"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor White
Write-Host " CREDENCIALES PRECARGADAS:" -ForegroundColor Yellow
Write-Host "  - Correo: ti@ingenieros.edu.pe"
Write-Host "  - Clave:  demo1234"
Write-Host "  - Rol:    Encargado de TI (acceso completo a todos los módulos)"
Write-Host ""
Write-Host " MÓDULOS DE TI DISPONIBLES EN /ti:" -ForegroundColor Yellow
Write-Host "  [1] Inventario de Activos Tecnológicos y Fichas Técnicas"
Write-Host "  [2] Asignaciones y Control de Devoluciones a Colaboradores"
Write-Host "  [3] Mantenimiento Preventivo, Correctivo e Historial de Costos"
Write-Host "  [4] Monitoreo de SLAs con Temporizadores y Alertas en Riesgo"
Write-Host "======================================================================" -ForegroundColor White
Write-Host ""

npm run dev
