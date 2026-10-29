$ErrorActionPreference = "Stop"

$phpDir = "C:\Users\David\php83"
$phpZip = "$env:TEMP\php8.3.zip"
$phpUrl = "https://windows.php.net/downloads/releases/archives/php-8.3.10-nts-Win32-vs16-x64.zip"

Write-Host "1. Descargando PHP 8.3..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $phpUrl -OutFile $phpZip -MaximumRedirection 5

Write-Host "2. Extrayendo PHP 8.3 en $phpDir..." -ForegroundColor Cyan
if (Test-Path $phpDir) { Remove-Item $phpDir -Recurse -Force }
New-Item -ItemType Directory -Path $phpDir | Out-Null
Expand-Archive -Path $phpZip -DestinationPath $phpDir -Force

Write-Host "3. Configurando php.ini..." -ForegroundColor Cyan
$phpIni = "$phpDir\php.ini"
Copy-Item "$phpDir\php.ini-development" $phpIni

# Activar extensiones necesarias
$iniContent = Get-Content $phpIni
$iniContent = $iniContent -replace "^;extension_dir = `"ext`"", "extension_dir = `"ext`""
$iniContent = $iniContent -replace "^;extension=curl", "extension=curl"
$iniContent = $iniContent -replace "^;extension=fileinfo", "extension=fileinfo"
$iniContent = $iniContent -replace "^;extension=mbstring", "extension=mbstring"
$iniContent = $iniContent -replace "^;extension=openssl", "extension=openssl"
$iniContent = $iniContent -replace "^;extension=pdo_pgsql", "extension=pdo_pgsql"
$iniContent = $iniContent -replace "^;extension=pdo_sqlite", "extension=pdo_sqlite"
$iniContent = $iniContent -replace "^;extension=pgsql", "extension=pgsql"
$iniContent = $iniContent -replace "^;extension=sqlite3", "extension=sqlite3"

Set-Content $phpIni -Value $iniContent

Write-Host "4. Actualizando la variable PATH del usuario..." -ForegroundColor Cyan
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($userPath -notlike "*$phpDir*") {
    $newPath = "$phpDir;" + $userPath
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    Write-Host "-> PATH actualizado."
} else {
    Write-Host "-> PATH ya contenía el directorio de PHP."
}

# Actualizar el PATH de la sesión actual temporalmente para que los próximos comandos funcionen
$env:PATH = "$phpDir;" + $env:PATH

Write-Host "5. Verificando la versión de PHP instalada..." -ForegroundColor Cyan
& "$phpDir\php.exe" -v

Write-Host "¡PHP 8.3 instalado y configurado exitosamente!" -ForegroundColor Green
