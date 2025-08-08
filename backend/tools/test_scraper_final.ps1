# Script de prueba para el F1 Scraper Final
Write-Host "🧪 Iniciando prueba del F1 Scraper Final..." -ForegroundColor Green

# Verificar que el ejecutable existe
if (-not (Test-Path "f1_scraper_final.exe")) {
    Write-Host "❌ Error: f1_scraper_final.exe no encontrado" -ForegroundColor Red
    Write-Host "🔧 Compilando el scraper..." -ForegroundColor Yellow
    go build -o f1_scraper_final.exe .
    if (-not (Test-Path "f1_scraper_final.exe")) {
        Write-Host "❌ Error: No se pudo compilar el scraper" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Ejecutable encontrado/compilado" -ForegroundColor Green

# Ejecutar el scraper para el GP chinese
Write-Host "🏎️ Ejecutando scraper para GP: chinese" -ForegroundColor Cyan
Write-Host "📊 Esto procesará: Race, Qualifying y Practice" -ForegroundColor Cyan

# Ejecutar el scraper
.\f1_scraper_final.exe chinese

Write-Host "🎉 Prueba completada" -ForegroundColor Green
Write-Host "📋 Revisa los logs arriba para ver los resultados" -ForegroundColor Yellow 