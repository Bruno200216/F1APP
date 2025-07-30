# Script de deploy rápido para F1 Fantasy App
# Uso: .\quick-deploy.ps1 <tu-usuario-dockerhub>

param(
    [Parameter(Mandatory=$true)]
    [string]$DockerHubUsername
)

$VERSION = "v3.0"
$BUILD_DATE = Get-Date -Format "yyyy-MM-dd"

Write-Host "F1 Fantasy App - Deploy Rapido v3.0" -ForegroundColor Green
Write-Host "Fecha: $BUILD_DATE" -ForegroundColor Cyan
Write-Host "Usuario Docker Hub: $DockerHubUsername" -ForegroundColor Cyan
Write-Host "Version: $VERSION" -ForegroundColor Cyan
Write-Host ""

# Verificar Docker
try {
    docker info | Out-Null
    Write-Host "Docker esta corriendo" -ForegroundColor Green
} catch {
    Write-Host "Error: Docker no esta corriendo" -ForegroundColor Red
    exit 1
}

# Login a Docker Hub si es necesario
$dockerInfo = docker info 2>$null
if ($dockerInfo -notmatch "Username") {
    Write-Host "Haciendo login en Docker Hub..." -ForegroundColor Yellow
    docker login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error en login" -ForegroundColor Red
        exit 1
    }
}

# Construir y hacer push automaticamente
Write-Host "Construyendo y subiendo imagenes..." -ForegroundColor Yellow

# Backend
Write-Host "Backend..." -ForegroundColor Cyan
docker build -t "$DockerHubUsername/f1app-backend:$VERSION" -t "$DockerHubUsername/f1app-backend:latest" ./backend/
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error construyendo backend" -ForegroundColor Red
    exit 1
}

docker push "$DockerHubUsername/f1app-backend:$VERSION"
docker push "$DockerHubUsername/f1app-backend:latest"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error subiendo backend" -ForegroundColor Red
    exit 1
}

# Frontend
Write-Host "Frontend..." -ForegroundColor Cyan
docker build -t "$DockerHubUsername/f1app-frontend:$VERSION" -t "$DockerHubUsername/f1app-frontend:latest" ./frontend/
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error construyendo frontend" -ForegroundColor Red
    exit 1
}

docker push "$DockerHubUsername/f1app-frontend:$VERSION"
docker push "$DockerHubUsername/f1app-frontend:latest"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error subiendo frontend" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Deploy completado exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Imagenes disponibles:" -ForegroundColor Cyan
Write-Host "   https://hub.docker.com/r/$DockerHubUsername/f1app-backend" -ForegroundColor Blue
Write-Host "   https://hub.docker.com/r/$DockerHubUsername/f1app-frontend" -ForegroundColor Blue
Write-Host ""
Write-Host "Para usar en produccion:" -ForegroundColor Cyan
Write-Host "   docker pull $DockerHubUsername/f1app-backend:$VERSION" -ForegroundColor Gray
Write-Host "   docker pull $DockerHubUsername/f1app-frontend:$VERSION" -ForegroundColor Gray
Write-Host ""
Write-Host "Cambios en v3.0:" -ForegroundColor Green
Write-Host "   Sistema de ofertas FIA mejorado" -ForegroundColor White
Write-Host "   Correcciones de base de datos" -ForegroundColor White
Write-Host "   Optimizaciones de rendimiento" -ForegroundColor White
Write-Host "   Mejoras en UI/UX" -ForegroundColor White 