# Script para desplegar con manejo de SSH
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

# Verificar conexión SSH
Write-Host "🔐 Verificando conexión SSH..." -ForegroundColor Blue
try {
    $sshTest = ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "${RemoteUser}@${Server}" "echo 'SSH connection successful'" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Conexión SSH exitosa" -ForegroundColor Green
    } else {
        throw "SSH connection failed"
    }
} catch {
    Write-Host "❌ Error de conexión SSH" -ForegroundColor Red
    Write-Host "💡 Opciones para resolver:" -ForegroundColor Yellow
    Write-Host "   1. Verifica que tienes acceso SSH al servidor" -ForegroundColor White
    Write-Host "   2. Asegúrate de que tu clave SSH esté configurada" -ForegroundColor White
    Write-Host "   3. O usa el despliegue manual que te mostraré" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "¿Quieres continuar con despliegue manual? (s/n)"
    if ($choice -eq "s" -or $choice -eq "S") {
        Show-ManualDeploy
    } else {
        Write-Host "❌ Despliegue cancelado" -ForegroundColor Red
        exit 1
    }
    return
}

# Crear directorio en servidor
Write-Host "📁 Creando directorio en servidor..." -ForegroundColor Blue
ssh -o StrictHostKeyChecking=no "${RemoteUser}@${Server}" "mkdir -p ${RemotePath}"

# Subir archivos
Write-Host "📤 Subiendo archivos..." -ForegroundColor Blue
scp -o StrictHostKeyChecking=no docker-compose.prod-apps.yml "${RemoteUser}@${Server}:${RemotePath}/"
scp -o StrictHostKeyChecking=no f1app-backend.tar "${RemoteUser}@${Server}:${RemotePath}/"
scp -o StrictHostKeyChecking=no f1app-frontend.tar "${RemoteUser}@${Server}:${RemotePath}/"

# Subir archivo de entorno
if (Test-Path "env.production") {
    scp -o StrictHostKeyChecking=no env.production "${RemoteUser}@${Server}:${RemotePath}/.env"
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

ssh -o StrictHostKeyChecking=no "${RemoteUser}@${Server}" $deployCommands

# Limpiar archivos temporales
Write-Host "🧹 Limpiando archivos temporales..." -ForegroundColor Blue
Remove-Item -Path "f1app-backend.tar" -ErrorAction SilentlyContinue
Remove-Item -Path "f1app-frontend.tar" -ErrorAction SilentlyContinue
Remove-Item -Path "docker-compose.prod-apps.yml" -ErrorAction SilentlyContinue

Write-Host "✅ Despliegue completado exitosamente!" -ForegroundColor Green
Write-Host "🌐 Tu aplicación está disponible en: http://$Server" -ForegroundColor Blue

function Show-ManualDeploy {
    Write-Host "📋 INSTRUCCIONES DE DESPLIEGUE MANUAL:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Conecta al servidor:" -ForegroundColor White
    Write-Host "   ssh bruno200216@www.f1tasy.com" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Crea el directorio:" -ForegroundColor White
    Write-Host "   mkdir -p /opt/f1app" -ForegroundColor Cyan
    Write-Host "   cd /opt/f1app" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. En tu máquina local, ejecuta estos comandos:" -ForegroundColor White
    Write-Host "   scp docker-compose.prod-apps.yml bruno200216@www.f1tasy.com:/opt/f1app/" -ForegroundColor Cyan
    Write-Host "   scp f1app-backend.tar bruno200216@www.f1tasy.com:/opt/f1app/" -ForegroundColor Cyan
    Write-Host "   scp f1app-frontend.tar bruno200216@www.f1tasy.com:/opt/f1app/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4. En el servidor, ejecuta:" -ForegroundColor White
    Write-Host "   docker load -i f1app-backend.tar" -ForegroundColor Cyan
    Write-Host "   docker load -i f1app-frontend.tar" -ForegroundColor Cyan
    Write-Host "   docker-compose -f docker-compose.prod-apps.yml up -d" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "5. Verifica el estado:" -ForegroundColor White
    Write-Host "   docker-compose -f docker-compose.prod-apps.yml ps" -ForegroundColor Cyan
    Write-Host ""
} 