# Script para compilar y subir las imágenes de Docker a producción
# F1 Fantasy App - Build Production v2.0

param(
    [string]$DockerHubUsername = "tuusuario",
    [string]$Version = "v2.0"
)

# Configuración
$BackendImage = "f1app-backend"
$FrontendImage = "f1app-frontend"

Write-Host "🏎️  F1 Fantasy App - Build Production $Version" -ForegroundColor Blue
Write-Host "==================================================" -ForegroundColor Blue

# Verificar que Docker esté corriendo
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker no está corriendo. Por favor inicia Docker Desktop." -ForegroundColor Red
    exit 1
}

# Verificar que estemos en el directorio correcto
if (-not (Test-Path "docker-compose.prod.yml")) {
    Write-Host "❌ No se encontró docker-compose.prod.yml. Ejecuta este script desde el directorio raíz del proyecto." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Configuración:" -ForegroundColor Yellow
Write-Host "  Usuario Docker Hub: $DockerHubUsername" -ForegroundColor White
Write-Host "  Backend Image: $BackendImage" -ForegroundColor White
Write-Host "  Frontend Image: $FrontendImage" -ForegroundColor White
Write-Host "  Versión: $Version" -ForegroundColor White
Write-Host ""

# Función para mostrar progreso
function Show-Progress {
    param([string]$Message)
    Write-Host "🔄 $Message" -ForegroundColor Blue
}

# Función para mostrar éxito
function Show-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

# Función para mostrar error
function Show-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# 1. Construir imagen del Backend
Show-Progress "Construyendo imagen del Backend..."
Set-Location backend

# Limpiar build anterior si existe
if (Test-Path "main") {
    Remove-Item "main" -Force
}

# Construir la imagen
try {
    docker build -t "$DockerHubUsername/$BackendImage`:$Version" .
    docker build -t "$DockerHubUsername/$BackendImage`:latest" .
    Show-Success "Backend construido exitosamente"
} catch {
    Show-Error "Error construyendo el Backend"
    Set-Location ..
    exit 1
}

Set-Location ..

# 2. Construir imagen del Frontend
Show-Progress "Construyendo imagen del Frontend..."
Set-Location frontend

# Limpiar build anterior si existe
if (Test-Path "build") {
    Remove-Item "build" -Recurse -Force
}

# Construir la imagen
try {
    docker build -t "$DockerHubUsername/$FrontendImage`:$Version" .
    docker build -t "$DockerHubUsername/$FrontendImage`:latest" .
    Show-Success "Frontend construido exitosamente"
} catch {
    Show-Error "Error construyendo el Frontend"
    Set-Location ..
    exit 1
}

Set-Location ..

# 3. Mostrar imágenes construidas
Show-Progress "Imágenes construidas:"
docker images | Select-String $DockerHubUsername

Write-Host ""
Write-Host "🎉 ¡Build completado exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Para subir a Docker Hub:" -ForegroundColor White
Write-Host "   docker push $DockerHubUsername/$BackendImage`:$Version" -ForegroundColor Gray
Write-Host "   docker push $DockerHubUsername/$BackendImage`:latest" -ForegroundColor Gray
Write-Host "   docker push $DockerHubUsername/$FrontendImage`:$Version" -ForegroundColor Gray
Write-Host "   docker push $DockerHubUsername/$FrontendImage`:latest" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Para desplegar en producción:" -ForegroundColor White
Write-Host "   docker-compose -f docker-compose.prod.yml up -d" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Para ver logs:" -ForegroundColor White
Write-Host "   docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor Gray 