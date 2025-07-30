# Script simple para construir imágenes Docker del Frontend y Backend
# Uso: .\build-images.ps1

Write-Host "🔨 Construyendo imágenes Docker..." -ForegroundColor Blue

# Verificar que Docker esté corriendo
try {
    docker info | Out-Null
    Write-Host "✅ Docker está corriendo" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker no está corriendo. Inicia Docker y vuelve a intentar." -ForegroundColor Red
    exit 1
}

# Construir imagen del Backend
Write-Host "🔨 Construyendo imagen del Backend..." -ForegroundColor Yellow
docker build -t f1app-backend:latest ./backend/

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend construido exitosamente" -ForegroundColor Green
}
else {
    Write-Host "❌ Error construyendo Backend" -ForegroundColor Red
    exit 1
}

# Construir imagen del Frontend
Write-Host "🔨 Construyendo imagen del Frontend..." -ForegroundColor Yellow
docker build -t f1app-frontend:latest ./frontend/

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend construido exitosamente" -ForegroundColor Green
}
else {
    Write-Host "❌ Error construyendo Frontend" -ForegroundColor Red
    exit 1
}

# Mostrar imágenes creadas
Write-Host "📋 Imágenes creadas:" -ForegroundColor Blue
docker images | Select-String "f1app"

Write-Host "✅ Construcción completada exitosamente!" -ForegroundColor Green 