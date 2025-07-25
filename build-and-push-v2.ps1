# Script para crear y subir la nueva versión con las correcciones
# Uso: .\build-and-push-v2.ps1 <tu-usuario-dockerhub>

param(
    [Parameter(Mandatory=$true)]
    [string]$DockerHubUsername
)

$VERSION = "v2.0"
$BUILD_DATE = Get-Date -Format "yyyy-MM-dd"

Write-Host "🚀 F1 Fantasy App - Build & Push v2.0" -ForegroundColor Blue
Write-Host "📅 Fecha: $BUILD_DATE" -ForegroundColor Yellow
Write-Host "👤 Usuario Docker Hub: $DockerHubUsername" -ForegroundColor Yellow
Write-Host "🏷️  Versión: $VERSION" -ForegroundColor Green
Write-Host ""

# Verificar que Docker esté corriendo
try {
    docker info | Out-Null
    Write-Host "✅ Docker está corriendo" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Docker no está corriendo" -ForegroundColor Red
    Write-Host "Inicia Docker Desktop y vuelve a intentar" -ForegroundColor Yellow
    exit 1
}

# Limpiar imágenes anteriores (opcional)
Write-Host "🧹 Limpiando imágenes anteriores..." -ForegroundColor Yellow
docker image prune -f

# Construir Backend con las correcciones
Write-Host "🔨 Construyendo Backend v2.0..." -ForegroundColor Cyan
Write-Host "   ➤ Incluye: Correcciones de PlayerByLeague, MarketItems, logs mejorados" -ForegroundColor Gray

docker build -t "f1app-backend:$VERSION" `
             -t "f1app-backend:latest" `
             -t "${DockerHubUsername}/f1app-backend:$VERSION" `
             -t "${DockerHubUsername}/f1app-backend:latest" `
             --label "version=$VERSION" `
             --label "build-date=$BUILD_DATE" `
             --label "description=F1 Fantasy Backend with PlayerByLeague and Market fixes" `
             ./backend/

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error construyendo backend" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Backend construido exitosamente" -ForegroundColor Green

# Construir Frontend
Write-Host "🔨 Construyendo Frontend v2.0..." -ForegroundColor Cyan

docker build -t "f1app-frontend:$VERSION" `
             -t "f1app-frontend:latest" `
             -t "${DockerHubUsername}/f1app-frontend:$VERSION" `
             -t "${DockerHubUsername}/f1app-frontend:latest" `
             --label "version=$VERSION" `
             --label "build-date=$BUILD_DATE" `
             --label "description=F1 Fantasy Frontend" `
             ./frontend/

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error construyendo frontend" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Frontend construido exitosamente" -ForegroundColor Green

# Mostrar imágenes construidas
Write-Host ""
Write-Host "📋 Imágenes construidas:" -ForegroundColor Blue
docker images | Select-String "f1app\|$DockerHubUsername"

# Verificar login en Docker Hub
Write-Host ""
Write-Host "🔐 Verificando login en Docker Hub..." -ForegroundColor Yellow

try {
    $whoami = docker info --format '{{.Username}}' 2>$null
    if ($whoami) {
        Write-Host "✅ Logueado como: $whoami" -ForegroundColor Green
    } else {
        throw "No logueado"
    }
} catch {
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
if ($response -eq 'y' -or $response -eq 'Y') {
    
    Write-Host "🚀 Haciendo push a Docker Hub..." -ForegroundColor Green
    
    # Push Backend
    Write-Host "📤 Pushing backend..." -ForegroundColor Cyan
    docker push "${DockerHubUsername}/f1app-backend:$VERSION"
    docker push "${DockerHubUsername}/f1app-backend:latest"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error haciendo push del backend" -ForegroundColor Red
        exit 1
    }
    
    # Push Frontend
    Write-Host "📤 Pushing frontend..." -ForegroundColor Cyan
    docker push "${DockerHubUsername}/f1app-frontend:$VERSION"
    docker push "${DockerHubUsername}/f1app-frontend:latest"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error haciendo push del frontend" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "🎉 ¡Deploy completado exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Imágenes disponibles en Docker Hub:" -ForegroundColor Blue
    Write-Host "   🔗 https://hub.docker.com/r/${DockerHubUsername}/f1app-backend" -ForegroundColor Cyan
    Write-Host "   🔗 https://hub.docker.com/r/${DockerHubUsername}/f1app-frontend" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Para usar en producción:" -ForegroundColor Yellow
    Write-Host "   docker pull ${DockerHubUsername}/f1app-backend:$VERSION" -ForegroundColor Gray
    Write-Host "   docker pull ${DockerHubUsername}/f1app-frontend:$VERSION" -ForegroundColor Gray
    
} else {
    Write-Host "⏸️  Push cancelado. Las imágenes están construidas localmente." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para hacer push más tarde:" -ForegroundColor Cyan
    Write-Host "   docker push ${DockerHubUsername}/f1app-backend:$VERSION" -ForegroundColor Gray
    Write-Host "   docker push ${DockerHubUsername}/f1app-frontend:$VERSION" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✨ Cambios incluidos en v2.0:" -ForegroundColor Blue
Write-Host "   ✅ Corrección de PlayerByLeague con rollback" -ForegroundColor Green
Write-Host "   ✅ Validación robusta de MarketItems" -ForegroundColor Green  
Write-Host "   ✅ Logs detallados con contadores" -ForegroundColor Green
Write-Host "   ✅ Endpoint de debug /api/debug/league/:id" -ForegroundColor Green
Write-Host "   ✅ Corrección de tipos uint/uint64" -ForegroundColor Green
Write-Host "   ✅ Eliminación de llamadas duplicadas a refreshMarketForLeague" -ForegroundColor Green 