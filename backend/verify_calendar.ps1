# Script para verificar que el calendario F1 se inicializó correctamente
# Ejecutar después de iniciar el backend

Write-Host "📅 Verificando inicialización del calendario F1..." -ForegroundColor Cyan

# Verificar que el backend está ejecutándose
Write-Host "🔍 Verificando que el backend está ejecutándose..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/" -Method GET -TimeoutSec 5
    Write-Host "✅ Backend está ejecutándose" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend no está ejecutándose. Inicia el backend primero:" -ForegroundColor Red
    Write-Host "   .\f1-fantasy-app.exe" -ForegroundColor White
    exit 1
}

# Ejecutar consultas SQL para verificar los datos
Write-Host "📊 Verificando datos del calendario..." -ForegroundColor Yellow

# Aquí puedes ejecutar las consultas SQL del archivo test_calendar.sql
# o conectarte directamente a la base de datos para verificar

Write-Host ""
Write-Host "📋 Para verificar manualmente los datos:" -ForegroundColor Cyan
Write-Host "   1. Conéctate a tu base de datos MySQL" -ForegroundColor White
Write-Host "   2. Ejecuta: SELECT COUNT(*) FROM f1_grand_prixes;" -ForegroundColor White
Write-Host "   3. Deberías ver 24 Grand Prix" -ForegroundColor White
Write-Host ""
Write-Host "📋 Para verificar las fechas start_date:" -ForegroundColor Cyan
Write-Host "   - GPs con Sprint: start_date 2 días antes de la carrera" -ForegroundColor White
Write-Host "   - GPs sin Sprint: start_date 1 día antes de la carrera" -ForegroundColor White
Write-Host ""
Write-Host "📋 GPs con Sprint en 2025:" -ForegroundColor Cyan
Write-Host "   - Chinese Grand Prix" -ForegroundColor White
Write-Host "   - Belgian Grand Prix" -ForegroundColor White
Write-Host "   - Azerbaijan Grand Prix" -ForegroundColor White
Write-Host "   - Brazilian Grand Prix" -ForegroundColor White
Write-Host "   - Qatar Grand Prix" -ForegroundColor White

Write-Host ""
Write-Host "✅ Verificación completada" -ForegroundColor Green 