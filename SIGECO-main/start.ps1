Write-Host "Iniciando servidores de SIGECO..." -ForegroundColor Cyan

$projectRoot = $PSScriptRoot
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"
$phpCommand = Get-Command php -ErrorAction SilentlyContinue
if ($null -eq $phpCommand) {
	throw "No se encontró PHP. Instala PHP 8.3 y agrégalo al PATH."
}
$phpPath = $phpCommand.Source

# Iniciar el backend en una nueva ventana
Write-Host "-> Levantando Backend (Laravel) en el puerto 8000..." -ForegroundColor Green
Start-Process powershell -WorkingDirectory $backendPath -ArgumentList "-NoExit", "-Command", "& '$phpPath' artisan serve"

# Iniciar el frontend en una nueva ventana
Write-Host "-> Levantando Frontend (Vite) en el puerto 5173..." -ForegroundColor Blue
Start-Process powershell -WorkingDirectory $frontendPath -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host "¡Listo! Se han abierto dos nuevas ventanas con los servidores corriendo." -ForegroundColor Yellow
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:5173"

# Reintentos automáticos de avisos de Slack
Start-Process powershell -WindowStyle Hidden -WorkingDirectory $backendPath -ArgumentList "-NoProfile", "-Command", "& '$phpPath' artisan schedule:work"
