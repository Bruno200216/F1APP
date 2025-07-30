C:\Users\User\OneDrive\Documentos\F1APP>ssh bruno200216@www.f1tasy.com "mkdir -p /opt/f1app"
bruno200216@www.f1tasy.com: Permission denied (publickey)# Script para subir archivos al servidor
param(
    [string]$Server = "www.f1tasy.com",
    [string]$RemoteUser = "bruno200216",
    [string]$RemotePath = "/opt/f1app"
)

Write-Host "📤 Subiendo archivos al servidor..." -ForegroundColor Blue
Write-Host "🌐 Servidor: $Server" -ForegroundColor Blue
Write-Host "👤 Usuario: $RemoteUser" -ForegroundColor Blue
Write-Host "📁 Ruta: $RemotePath" -ForegroundColor Blue
Write-Host ""

# Verificar que los archivos existan
$files = @(
    "docker-compose.prod-apps.yml",
    "f1app-backend.tar", 
    "f1app-frontend.tar",
    "env.production"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file encontrado" -ForegroundColor Green
    } else {
        Write-Host "❌ $file no encontrado" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🚀 Subiendo archivos..." -ForegroundColor Yellow

# Crear directorio en servidor
Write-Host "📁 Creando directorio en servidor..." -ForegroundColor Blue
ssh "${RemoteUser}@${Server}" "mkdir -p ${RemotePath}"

# Subir archivos
Write-Host "📤 Subiendo docker-compose.prod-apps.yml..." -ForegroundColor Blue
scp docker-compose.prod-apps.yml "${RemoteUser}@${Server}:${RemotePath}/"

Write-Host "📤 Subiendo f1app-backend.tar..." -ForegroundColor Blue
scp f1app-backend.tar "${RemoteUser}@${Server}:${RemotePath}/"

Write-Host "📤 Subiendo f1app-frontend.tar..." -ForegroundColor Blue
scp f1app-frontend.tar "${RemoteUser}@${Server}:${RemotePath}/"

Write-Host "📤 Subiendo env.production..." -ForegroundColor Blue
scp env.production "${RemoteUser}@${Server}:${RemotePath}/.env"

Write-Host ""
Write-Host "✅ Archivos subidos exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Ahora ejecuta en el servidor:" -ForegroundColor Yellow
Write-Host "   ssh ${RemoteUser}@${Server}" -ForegroundColor Cyan
Write-Host "   cd ${RemotePath}" -ForegroundColor Cyan
Write-Host "   docker load -i f1app-backend.tar" -ForegroundColor Cyan
Write-Host "   docker load -i f1app-frontend.tar" -ForegroundColor Cyan
Write-Host "   docker-compose -f docker-compose.prod-apps.yml up -d" -ForegroundColor Cyan
Write-Host "" 