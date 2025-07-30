# Script para desplegar aplicaciones a producción sin tocar la base de datos
# Uso: .\deploy-to-production.ps1 [servidor]

param(
    [string]$Server = "tu-servidor.com",
    [string]$RemoteUser = $env:REMOTE_USER,
    [string]$RemotePath = $env:REMOTE_PATH
)

# Configuración por defecto
if (-not $RemoteUser) { $RemoteUser = "root" }
if (-not $RemotePath) { $RemotePath = "/opt/f1app" }

# Función para mostrar ayuda
function Show-Help {
    Write-Host "F1 Fantasy App - Despliegue a Producción" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Uso: .\deploy-to-production.ps1 [servidor]" -ForegroundColor White
    Write-Host ""
    Write-Host "Variables de entorno opcionales:" -ForegroundColor White
    Write-Host "  REMOTE_USER     - Usuario SSH (default: root)" -ForegroundColor Yellow
    Write-Host "  REMOTE_PATH     - Ruta en servidor (default: /opt/f1app)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ejemplo:" -ForegroundColor White
    Write-Host "  `$env:REMOTE_USER='ubuntu'; .\deploy-to-production.ps1 mi-servidor.com" -ForegroundColor Yellow
    Write-Host ""
}

# Verificar que las imágenes existan
function Test-Images {
    Write-Host "🔍 Verificando imágenes locales..." -ForegroundColor Blue
    
    $backendImage = docker images | Select-String "f1app-backend"
    $frontendImage = docker images | Select-String "f1app-frontend"
    
    if (-not $backendImage) {
        Write-Host "❌ Error: Imagen f1app-backend no encontrada" -ForegroundColor Red
        Write-Host "💡 Ejecuta primero: .\build-images.ps1" -ForegroundColor Yellow
        return $false
    }
    
    if (-not $frontendImage) {
        Write-Host "❌ Error: Imagen f1app-frontend no encontrada" -ForegroundColor Red
        Write-Host "💡 Ejecuta primero: .\build-images.ps1" -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "✅ Imágenes verificadas" -ForegroundColor Green
    return $true
}

# Crear archivos de despliegue
function New-DeployFiles {
    Write-Host "📄 Creando archivos de despliegue..." -ForegroundColor Blue
    
    # Crear docker-compose para producción
    $dockerComposeContent = @'
services:
  # Backend API en Go
  backend:
    image: f1app-backend:latest
    container_name: f1app-backend
    restart: unless-stopped
    environment:
      DB_HOST: ${DB_HOST:-localhost}
      DB_PORT: ${DB_PORT:-3306}
      DB_USER: ${DB_USER:-f1user}
      DB_PASSWORD: ${DB_PASSWORD:-f1password}
      DB_NAME: ${DB_NAME:-f1fantasy}
      PORT: 8080
    ports:
      - "8080:8080"
    networks:
      - f1app-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Frontend React
  frontend:
    image: f1app-frontend:latest
    container_name: f1app-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - f1app-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  f1app-network:
    driver: bridge
'@

    $dockerComposeContent | Out-File -FilePath "docker-compose.prod-apps.yml" -Encoding UTF8
    
    # Crear script de despliegue para el servidor
    $deployScriptContent = @'
#!/bin/bash

# Script para desplegar en el servidor
set -e

echo "🚀 Desplegando aplicaciones en producción..."

# Cargar variables de entorno
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Parar contenedores existentes
echo "🛑 Parando contenedores existentes..."
docker-compose -f docker-compose.prod-apps.yml down || true

# Eliminar imágenes antiguas
echo "🧹 Limpiando imágenes antiguas..."
docker rmi f1app-backend:latest f1app-frontend:latest 2>/dev/null || true

# Cargar nuevas imágenes
echo "📦 Cargando nuevas imágenes..."
docker load -i f1app-backend.tar
docker load -i f1app-frontend.tar

# Desplegar nuevas aplicaciones
echo "🚀 Desplegando nuevas aplicaciones..."
docker-compose -f docker-compose.prod-apps.yml up -d

# Verificar estado
echo "📊 Verificando estado..."
sleep 10
docker-compose -f docker-compose.prod-apps.yml ps

echo "✅ Despliegue completado!"
echo "🌐 Frontend: http://$(hostname -I | awk '{print $1}')"
echo "🔧 Backend: http://$(hostname -I | awk '{print $1}'):8080"
'@

    $deployScriptContent | Out-File -FilePath "deploy-on-server.sh" -Encoding UTF8
    
    Write-Host "✅ Archivos de despliegue creados" -ForegroundColor Green
}

# Guardar imágenes como tar
function Save-Images {
    Write-Host "💾 Guardando imágenes como archivos tar..." -ForegroundColor Blue
    
    docker save f1app-backend:latest -o f1app-backend.tar
    docker save f1app-frontend:latest -o f1app-frontend.tar
    
    Write-Host "✅ Imágenes guardadas" -ForegroundColor Green
}

# Subir archivos al servidor
function Upload-Files {
    Write-Host "📤 Subiendo archivos al servidor..." -ForegroundColor Blue
    
    # Crear directorio en servidor
    ssh "${RemoteUser}@${Server}" "mkdir -p ${RemotePath}"
    
    # Subir archivos
    scp docker-compose.prod-apps.yml "${RemoteUser}@${Server}:${RemotePath}/"
    scp deploy-on-server.sh "${RemoteUser}@${Server}:${RemotePath}/"
    scp f1app-backend.tar "${RemoteUser}@${Server}:${RemotePath}/"
    scp f1app-frontend.tar "${RemoteUser}@${Server}:${RemotePath}/"
    
    # Subir archivo de entorno si existe
    if (Test-Path ".env") {
        scp .env "${RemoteUser}@${Server}:${RemotePath}/"
    }
    elseif (Test-Path "env.production") {
        scp env.production "${RemoteUser}@${Server}:${RemotePath}/.env"
    }
    
    Write-Host "✅ Archivos subidos" -ForegroundColor Green
}

# Ejecutar despliegue en servidor
function Deploy-OnServer {
    Write-Host "🚀 Ejecutando despliegue en servidor..." -ForegroundColor Blue
    
    ssh "${RemoteUser}@${Server}" "cd ${RemotePath} && chmod +x deploy-on-server.sh && ./deploy-on-server.sh"
    
    Write-Host "✅ Despliegue completado en servidor!" -ForegroundColor Green
}

# Limpiar archivos temporales
function Remove-TempFiles {
    Write-Host "🧹 Limpiando archivos temporales..." -ForegroundColor Blue
    
    Remove-Item -Path "f1app-backend.tar" -ErrorAction SilentlyContinue
    Remove-Item -Path "f1app-frontend.tar" -ErrorAction SilentlyContinue
    Remove-Item -Path "docker-compose.prod-apps.yml" -ErrorAction SilentlyContinue
    Remove-Item -Path "deploy-on-server.sh" -ErrorAction SilentlyContinue
    
    Write-Host "✅ Limpieza completada" -ForegroundColor Green
}

# Función principal
function Main {
    if ($Server -eq "help" -or $Server -eq "-h" -or $Server -eq "--help") {
        Show-Help
        return
    }
    
    Write-Host "🚀 Iniciando despliegue a producción..." -ForegroundColor Blue
    Write-Host "🌐 Servidor: ${Server}" -ForegroundColor Blue
    Write-Host "👤 Usuario: ${RemoteUser}" -ForegroundColor Blue
    Write-Host "📁 Ruta: ${RemotePath}" -ForegroundColor Blue
    Write-Host ""
    
    if (-not (Test-Images)) {
        return
    }
    
    New-DeployFiles
    Save-Images
    Upload-Files
    Deploy-OnServer
    Remove-TempFiles
    
    Write-Host "✅ Despliegue completado exitosamente!" -ForegroundColor Green
    Write-Host "🌐 Tu aplicación está disponible en: http://${Server}" -ForegroundColor Blue
}

# Ejecutar función principal
Main 