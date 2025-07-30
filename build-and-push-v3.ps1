# Script para crear y subir la nueva versión v3.0 con las mejoras más recientes
# Uso: .\build-and-push-v3.ps1 <tu-usuario-dockerhub>

param(
    [Parameter(Mandatory=$true)]
    [string]$DockerHubUsername
)

$VERSION = "v3.0"
$BUILD_DATE = Get-Date -Format "yyyy-MM-dd"

Write-Host "🚀 F1 Fantasy App - Build & Push v3.0" -ForegroundColor Green
Write-Host "📅 Fecha: $BUILD_DATE" -ForegroundColor Cyan
Write-Host "👤 Usuario Docker Hub: $DockerHubUsername" -ForegroundColor Cyan
Write-Host "🏷️  Versión: $VERSION" -ForegroundColor Cyan
Write-Host ""

# Verificar que Docker esté corriendo
try {
    docker info | Out-Null
    Write-Host "✅ Docker está corriendo" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Docker no está corriendo" -ForegroundColor Red
    Write-Host "Inicia Docker y vuelve a intentar" -ForegroundColor Yellow
    exit 1
}

# Limpiar imágenes anteriores (opcional)
Write-Host "🧹 Limpiando imágenes anteriores..." -ForegroundColor Yellow
docker image prune -f

# Construir Backend con las mejoras más recientes
Write-Host "🔨 Construyendo Backend v3.0..." -ForegroundColor Yellow
Write-Host "   ➤ Incluye: Mejoras en sistema de ofertas FIA, correcciones de base de datos, optimizaciones" -ForegroundColor Gray

$backendBuildArgs = @(
    "build",
    "-t", "f1app-backend:$VERSION",
    "-t", "f1app-backend:latest",
    "-t", "$DockerHubUsername/f1app-backend:$VERSION",
    "-t", "$DockerHubUsername/f1app-backend:latest",
    "--label", "version=$VERSION",
    "--label", "build-date=$BUILD_DATE",
    "--label", "description=F1 Fantasy Backend v3.0 with FIA offers system and database improvements",
    "./backend/"
)

$backendResult = docker $backendBuildArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error construyendo backend" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Backend construido exitosamente" -ForegroundColor Green

# Construir Frontend
Write-Host "🔨 Construyendo Frontend v3.0..." -ForegroundColor Yellow

$frontendBuildArgs = @(
    "build",
    "-t", "f1app-frontend:$VERSION",
    "-t", "f1app-frontend:latest",
    "-t", "$DockerHubUsername/f1app-frontend:$VERSION",
    "-t", "$DockerHubUsername/f1app-frontend:latest",
    "--label", "version=$VERSION",
    "--label", "build-date=$BUILD_DATE",
    "--label", "description=F1 Fantasy Frontend v3.0 with improved UI/UX",
    "./frontend/"
)

$frontendResult = docker $frontendBuildArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error construyendo frontend" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Frontend construido exitosamente" -ForegroundColor Green

# Mostrar imágenes construidas
Write-Host ""
Write-Host "📋 Imágenes construidas:" -ForegroundColor Cyan
docker images | Select-String -Pattern "f1app|$DockerHubUsername"

# Verificar login en Docker Hub
Write-Host ""
Write-Host "🔐 Verificando login en Docker Hub..." -ForegroundColor Yellow

$dockerInfo = docker info 2>$null
if ($dockerInfo -match "Username") {
    $username = ($dockerInfo | Select-String "Username").ToString().Split(":")[1].Trim()
    Write-Host "✅ Logueado como: $username" -ForegroundColor Green
} else {
    Write-Host "⚠️  Necesitas hacer login en Docker Hub" -ForegroundColor Yellow
    Write-Host "Ejecutando docker login..." -ForegroundColor Cyan
    docker login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error en login" -ForegroundColor Red
        exit 1
    }
}

# Preguntar si hacer push
Write-Host ""
$response = Read-Host "¿Hacer push a Docker Hub? (y/N)"
if ($response -match "^[Yy]$") {
    
    Write-Host "🚀 Haciendo push a Docker Hub..." -ForegroundColor Green
    
    # Push Backend
    Write-Host "📤 Pushing backend..." -ForegroundColor Yellow
    docker push "$DockerHubUsername/f1app-backend:$VERSION"
    docker push "$DockerHubUsername/f1app-backend:latest"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error haciendo push del backend" -ForegroundColor Red
        exit 1
    }
    
    # Push Frontend
    Write-Host "📤 Pushing frontend..." -ForegroundColor Yellow
    docker push "$DockerHubUsername/f1app-frontend:$VERSION"
    docker push "$DockerHubUsername/f1app-frontend:latest"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error haciendo push del frontend" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "🎉 ¡Deploy completado exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Imágenes disponibles en Docker Hub:" -ForegroundColor Cyan
    Write-Host "   🔗 https://hub.docker.com/r/$DockerHubUsername/f1app-backend" -ForegroundColor Blue
    Write-Host "   🔗 https://hub.docker.com/r/$DockerHubUsername/f1app-frontend" -ForegroundColor Blue
    Write-Host ""
    Write-Host "📋 Para usar en producción:" -ForegroundColor Cyan
    Write-Host "   docker pull $DockerHubUsername/f1app-backend:$VERSION" -ForegroundColor Gray
    Write-Host "   docker pull $DockerHubUsername/f1app-frontend:$VERSION" -ForegroundColor Gray
    
} else {
    Write-Host "⏸️  Push cancelado. Las imágenes están construidas localmente." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para hacer push más tarde:" -ForegroundColor Cyan
    Write-Host "   docker push $DockerHubUsername/f1app-backend:$VERSION" -ForegroundColor Gray
    Write-Host "   docker push $DockerHubUsername/f1app-frontend:$VERSION" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✨ Cambios incluidos en v3.0:" -ForegroundColor Green
Write-Host "   ✅ Sistema de ofertas FIA mejorado" -ForegroundColor White
Write-Host "   ✅ Correcciones de base de datos y migraciones" -ForegroundColor White
Write-Host "   ✅ Optimizaciones de rendimiento" -ForegroundColor White
Write-Host "   ✅ Mejoras en la interfaz de usuario" -ForegroundColor White
Write-Host "   ✅ Corrección de bugs en el sistema de ligas" -ForegroundColor White
Write-Host "   ✅ Actualización de dependencias" -ForegroundColor White
Write-Host "   ✅ Mejoras en el sistema de autenticación" -ForegroundColor White 