# =====================================================
# SCRIPT DE PRUEBA: Scraper con cálculo de puntos
# =====================================================

Write-Host "🚀 Iniciando prueba del scraper con cálculo de puntos..." -ForegroundColor Green

# Verificar que el ejecutable existe
if (-not (Test-Path ".\f1_scraper_final.exe")) {
    Write-Host "❌ Error: No se encontró f1_scraper_final.exe" -ForegroundColor Red
    Write-Host "💡 Ejecuta 'go build -o f1_scraper_final.exe .' primero" -ForegroundColor Yellow
    exit 1
}

# Ejecutar el scraper para un GP específico (ejemplo: chinese)
Write-Host "📊 Ejecutando scraper para Chinese GP..." -ForegroundColor Cyan
.\f1_scraper_final.exe chinese

Write-Host "✅ Prueba completada!" -ForegroundColor Green
Write-Host "🎯 Verifica en la base de datos que:" -ForegroundColor Yellow
Write-Host "   - Se han capturado 20 pilotos por modalidad" -ForegroundColor White
Write-Host "   - Los puntos se han calculado correctamente" -ForegroundColor White
Write-Host "   - Las posiciones esperadas y deltas se han actualizado" -ForegroundColor White 