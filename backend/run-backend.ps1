# Script para ejecutar el backend de F1 Fantasy App
Write-Host "🚀 Iniciando F1 Fantasy App Backend..." -ForegroundColor Green

# Verificar si existe el archivo .env
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  No se encontró archivo .env, usando variables de entorno del sistema" -ForegroundColor Yellow
}

# Compilar el proyecto
Write-Host "🔨 Compilando el proyecto..." -ForegroundColor Blue
go build -o main.exe .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al compilar el proyecto" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Compilación exitosa" -ForegroundColor Green

# Ejecutar el backend
Write-Host "🚀 Ejecutando el backend..." -ForegroundColor Blue
Write-Host "📡 El servidor estará disponible en: http://localhost:8080" -ForegroundColor Cyan
Write-Host "🛑 Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host ""

./main.exe 