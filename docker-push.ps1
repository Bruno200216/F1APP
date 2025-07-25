# Script para hacer push de las imágenes F1 Fantasy App a Docker Hub
# Uso: .\docker-push.ps1 <tu-usuario-dockerhub>

param(
    [Parameter(Mandatory=$true)]
    [string]$DockerHubUsername
)

Write-Host "🐳 F1 Fantasy App - Push to Docker Hub" -ForegroundColor Blue
Write-Host "Usuario Docker Hub: $DockerHubUsername" -ForegroundColor Yellow
Write-Host ""

# Verificar que Docker esté corriendo
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Error: Docker no está corriendo" -ForegroundColor Red
    exit 1
}

# Reconstruir las imágenes con tags específicos
Write-Host "🔨 Reconstruyendo imágenes..." -ForegroundColor Yellow

# Backend
Write-Host "📦 Construyendo backend..." -ForegroundColor Cyan
docker build -t "f1app-backend:latest" -t "${DockerHubUsername}/f1app-backend:latest" -t "${DockerHubUsername}/f1app-backend:v1.0" ./backend/

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error construyendo backend" -ForegroundColor Red
    exit 1
}

# Frontend 
Write-Host "📦 Construyendo frontend..." -ForegroundColor Cyan
docker build -t "f1app-frontend:latest" -t "${DockerHubUsername}/f1app-frontend:latest" -t "${DockerHubUsername}/f1app-frontend:v1.0" ./frontend/

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error construyendo frontend" -ForegroundColor Red
    exit 1
}

# Mostrar imágenes construidas
Write-Host "📋 Imágenes construidas:" -ForegroundColor Green
docker images | Select-String $DockerHubUsername

# Verificar login
Write-Host "🔐 Verificando login en Docker Hub..." -ForegroundColor Yellow
$loginCheck = docker info 2>&1 | Select-String "Username"
if (-not $loginCheck) {
    Write-Host "⚠️  No estás logueado en Docker Hub" -ForegroundColor Yellow
    Write-Host "Ejecutando docker login..." -ForegroundColor Cyan
    docker login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error en login" -ForegroundColor Red
        exit 1
    }
}

# Push de las imágenes
Write-Host "🚀 Haciendo push a Docker Hub..." -ForegroundColor Green

Write-Host "📤 Pushing backend..." -ForegroundColor Cyan
docker push "${DockerHubUsername}/f1app-backend:latest"
docker push "${DockerHubUsername}/f1app-backend:v1.0"

Write-Host "📤 Pushing frontend..." -ForegroundColor Cyan  
docker push "${DockerHubUsername}/f1app-frontend:latest"
docker push "${DockerHubUsername}/f1app-frontend:v1.0"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ¡Push completado exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Tus imágenes están disponibles en:" -ForegroundColor Blue
    Write-Host "   - https://hub.docker.com/r/${DockerHubUsername}/f1app-backend" -ForegroundColor Cyan
    Write-Host "   - https://hub.docker.com/r/${DockerHubUsername}/f1app-frontend" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Para usar en otro lugar:" -ForegroundColor Yellow
    Write-Host "   docker pull ${DockerHubUsername}/f1app-backend:latest" -ForegroundColor Gray
    Write-Host "   docker pull ${DockerHubUsername}/f1app-frontend:latest" -ForegroundColor Gray
} else {
    Write-Host "❌ Error durante el push" -ForegroundColor Red
    exit 1
} 