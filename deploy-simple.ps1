# Script simplificado para desplegar a producción
param(
    [string]$Server = "www.f1tasy.com",
    [string]$RemoteUser = "bruno200216",
    [string]$RemotePath = "/opt/f1app"
)

Write-Host "🚀 Iniciando despliegue a producción..." -ForegroundColor Blue
Write-Host "🌐 Servidor: $Server" -ForegroundColor Blue
Write-Host "👤 Usuario: $RemoteUser" -ForegroundColor Blue
Write-Host "📁 Ruta: $RemotePath" -ForegroundColor Blue
Write-Host ""

# Verificar imágenes
Write-Host "🔍 Verificando imágenes locales..." -ForegroundColor Blue
$backendImage = docker images | Select-String "f1app-backend"
$frontendImage = docker images | Select-String "f1app-frontend"

if (-not $backendImage) {
    Write-Host "❌ Error: Imagen f1app-backend no encontrada" -ForegroundColor Red
    Write-Host "💡 Ejecuta primero: .\build-images.ps1" -ForegroundColor Yellow
    exit 1
}

if (-not $frontendImage) {
    Write-Host "❌ Error: Imagen f1app-frontend no encontrada" -ForegroundColor Red
    Write-Host "💡 Ejecuta primero: .\build-images.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Imágenes verificadas" -ForegroundColor Green

# Crear docker-compose
Write-Host "📄 Creando archivo docker-compose..." -ForegroundColor Blue
$dockerCompose = @"
services:
  backend:
    image: f1app-backend:latest
    container_name: f1app-backend
    restart: unless-stopped
    environment:
      DB_HOST: database
      DB_PORT: 3306
      DB_USER: f1user
      DB_PASSWORD: f1fantasy_password_2025
      DB_NAME: f1fantasy
      PORT: 8080
    ports:
      - "8080:8080"
    networks:
      - f1app-network

  frontend:
    image: f1app-frontend:latest
    container_name: f1app-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - f1app-network

networks:
  f1app-network:
    driver: bridge
"@

$dockerCompose | Out-File -FilePath "docker-compose.prod-apps.yml" -Encoding UTF8

# Guardar imágenes
Write-Host "💾 Guardando imágenes..." -ForegroundColor Blue
docker save f1app-backend:latest -o f1app-backend.tar
docker save f1app-frontend:latest -o f1app-frontend.tar
Write-Host "✅ Imágenes guardadas" -ForegroundColor Green

# Crear directorio en servidor
Write-Host "📁 Creando directorio en servidor..." -ForegroundColor Blue
ssh "${RemoteUser}@${Server}" "mkdir -p ${RemotePath}"

# Subir archivos
Write-Host "📤 Subiendo archivos..." -ForegroundColor Blue
scp docker-compose.prod-apps.yml "${RemoteUser}@${Server}:${RemotePath}/"
scp f1app-backend.tar "${RemoteUser}@${Server}:${RemotePath}/"
scp f1app-frontend.tar "${RemoteUser}@${Server}:${RemotePath}/"

# Subir archivo de entorno
if (Test-Path "env.production") {
    scp env.production "${RemoteUser}@${Server}:${RemotePath}/.env"
}

Write-Host "✅ Archivos subidos" -ForegroundColor Green

# Ejecutar despliegue en servidor
Write-Host "🚀 Ejecutando despliegue en servidor..." -ForegroundColor Blue

$deployCommands = @"
cd ${RemotePath}
docker-compose -f docker-compose.prod-apps.yml down || true
docker rmi f1app-backend:latest f1app-frontend:latest 2>/dev/null || true
docker load -i f1app-backend.tar
docker load -i f1app-frontend.tar
docker-compose -f docker-compose.prod-apps.yml up -d
sleep 10
docker-compose -f docker-compose.prod-apps.yml ps
echo "✅ Despliegue completado!"
"@

ssh "${RemoteUser}@${Server}" $deployCommands

# Limpiar archivos temporales
Write-Host "🧹 Limpiando archivos temporales..." -ForegroundColor Blue
Remove-Item -Path "f1app-backend.tar" -ErrorAction SilentlyContinue
Remove-Item -Path "f1app-frontend.tar" -ErrorAction SilentlyContinue
Remove-Item -Path "docker-compose.prod-apps.yml" -ErrorAction SilentlyContinue

Write-Host "✅ Despliegue completado exitosamente!" -ForegroundColor Green
Write-Host "🌐 Tu aplicación está disponible en: http://$Server" -ForegroundColor Blue 