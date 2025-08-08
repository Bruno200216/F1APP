# =====================================================
# SCRIPT DE PRUEBA: Verificar cálculo de puntos
# =====================================================

Write-Host "🚀 Iniciando prueba del cálculo de puntos..." -ForegroundColor Green

# Verificar que el ejecutable existe
if (-not (Test-Path ".\f1_scraper_final.exe")) {
    Write-Host "❌ Error: No se encontró f1_scraper_final.exe" -ForegroundColor Red
    Write-Host "💡 Ejecuta 'go build -o f1_scraper_final.exe .' primero" -ForegroundColor Yellow
    exit 1
}

# Ejecutar el scraper para un GP específico (ejemplo: chinese)
Write-Host "📊 Ejecutando scraper para Chinese GP..." -ForegroundColor Cyan
Write-Host "🔍 Verificando que los puntos se calculen correctamente..." -ForegroundColor Yellow

.\f1_scraper_final.exe chinese

Write-Host "✅ Prueba completada!" -ForegroundColor Green
Write-Host "🎯 Verifica en la base de datos que:" -ForegroundColor Yellow
Write-Host "   - Los puntos se han calculado según las reglas:" -ForegroundColor White
Write-Host "     * Race: 25,18,15,12,10,8,6,4,2,1 (posiciones 1-10)" -ForegroundColor White
Write-Host "     * Qualy: 10,9,8,7,6,5,4,3,2,1 (posiciones 1-10)" -ForegroundColor White
Write-Host "     * Practice: 5,5,4,4,3,3,2,2,1,1 (posiciones 1-10)" -ForegroundColor White
Write-Host "   - expected_position es 0 cuando no existe" -ForegroundColor White
Write-Host "   - delta_position se calcula correctamente" -ForegroundColor White
Write-Host "   - Los puntos se guardan en la columna 'points'" -ForegroundColor White 