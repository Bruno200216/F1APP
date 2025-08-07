# Script para ejecutar el scraper final con base de datos
# Uso: .\run_scraper_final.ps1 <gp_key>

param(
    [string]$gpKey = "belgian"
)

Write-Host "🏎️ Ejecutando F1 Scraper Final con base de datos..." -ForegroundColor Cyan
Write-Host "GP: $gpKey" -ForegroundColor Green

# Verificar que el ejecutable existe
if (-not (Test-Path "f1_scraper_final.exe")) {
    Write-Host "🔨 Compilando scraper final..." -ForegroundColor Yellow
    go build -o f1_scraper_final.exe f1_scraper_final.go
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error compilando el scraper final" -ForegroundColor Red
        exit 1
    }
}

# Ejecutar el scraper con base de datos
Write-Host "🏎️ Ejecutando scraper con base de datos..." -ForegroundColor Green
.\f1_scraper_final.exe $gpKey

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Scraper ejecutado exitosamente" -ForegroundColor Green
    Write-Host "💡 Los datos han sido guardados en la base de datos" -ForegroundColor Magenta
} else {
    Write-Host "❌ Error ejecutando el scraper" -ForegroundColor Red
}

Write-Host ""
Write-Host "📊 Para verificar los datos extraídos:" -ForegroundColor Cyan
Write-Host "   - Revisa las tablas pilot_races, pilot_qualies, pilot_practices" -ForegroundColor White
Write-Host "   - Verifica que los gp_index coincidan con tu base de datos" -ForegroundColor White 