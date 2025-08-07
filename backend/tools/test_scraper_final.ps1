# Script para probar el scraper final
# Uso: .\test_scraper_final.ps1 <gp_key>

param(
    [string]$gpKey = "belgian"
)

Write-Host "🧪 Probando F1 Scraper Final..." -ForegroundColor Cyan
Write-Host "GP: $gpKey" -ForegroundColor Green

# Compilar el scraper final
Write-Host "🔨 Compilando scraper final..." -ForegroundColor Yellow
go build -o f1_scraper_final.exe f1_scraper_final.go

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error compilando el scraper final" -ForegroundColor Red
    exit 1
}

# Ejecutar en modo test
Write-Host "🏎️ Ejecutando scraper en modo TEST..." -ForegroundColor Green
.\f1_scraper_final.exe $gpKey test

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Prueba completada exitosamente" -ForegroundColor Green
    Write-Host "💡 Para ejecutar con base de datos:" -ForegroundColor Magenta
    Write-Host "   .\f1_scraper_final.exe $gpKey" -ForegroundColor White
} else {
    Write-Host "❌ Error ejecutando la prueba" -ForegroundColor Red
}

# Limpiar
Remove-Item "f1_scraper_final.exe" -ErrorAction SilentlyContinue 