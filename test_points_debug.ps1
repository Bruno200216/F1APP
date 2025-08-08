# =====================================================
# SCRIPT DE PRUEBA: Debuggear cálculo de puntos
# =====================================================

Write-Host "🚀 Iniciando prueba de debug de puntos..." -ForegroundColor Green

# Verificar que el ejecutable existe
if (-not (Test-Path ".\f1_scraper_final.exe")) {
    Write-Host "❌ Error: No se encontró f1_scraper_final.exe" -ForegroundColor Red
    Write-Host "💡 Ejecuta 'go build -o f1_scraper_final.exe .' primero" -ForegroundColor Yellow
    exit 1
}

# Ejecutar el scraper para un GP específico con logging detallado
Write-Host "📊 Ejecutando scraper para Chinese GP con logging detallado..." -ForegroundColor Cyan
Write-Host "🔍 Verificando que los puntos se calculen y guarden correctamente..." -ForegroundColor Yellow

# Ejecutar el scraper
.\f1_scraper_final.exe chinese

Write-Host "✅ Prueba completada!" -ForegroundColor Green
Write-Host "🎯 Ahora ejecuta el script SQL 'debug_points.sql' en DBeaver para verificar:" -ForegroundColor Yellow
Write-Host "   - Si los puntos se han calculado correctamente" -ForegroundColor White
Write-Host "   - Si los puntos se han guardado en la base de datos" -ForegroundColor White
Write-Host "   - Cuántos registros tienen puntos NULL" -ForegroundColor White
Write-Host "   - La estructura de las tablas" -ForegroundColor White 