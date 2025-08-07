# Script para ejecutar el scraper de calendario F1
# Extrae datos desde Marca.com y los inserta en la base de datos

Write-Host "🏁 Ejecutando scraper de calendario F1..." -ForegroundColor Cyan
Write-Host "📅 Extrayendo datos desde Marca.com..." -ForegroundColor Green

# Compilar el scraper de calendario
Write-Host "🔨 Compilando scraper de calendario..." -ForegroundColor Yellow
go build -o f1_calendar_scraper.exe f1_calendar_scraper.go

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error compilando el scraper de calendario" -ForegroundColor Red
    exit 1
}

# Ejecutar el scraper
Write-Host "🌐 Ejecutando scraper..." -ForegroundColor Green
.\f1_calendar_scraper.exe

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Scraper de calendario ejecutado exitosamente" -ForegroundColor Green
    Write-Host "💡 Los datos han sido insertados en la tabla f1_grand_prixes" -ForegroundColor Magenta
} else {
    Write-Host "❌ Error ejecutando el scraper de calendario" -ForegroundColor Red
}

Write-Host ""
Write-Host "📊 Para verificar los datos insertados:" -ForegroundColor Cyan
Write-Host "   - Revisa la tabla f1_grand_prixes" -ForegroundColor White
Write-Host "   - Verifica que las fechas start_date sean correctas" -ForegroundColor White
Write-Host "   - Comprueba que los GPs con Sprint tengan start_date 2 días antes" -ForegroundColor White
Write-Host "   - Comprueba que los GPs sin Sprint tengan start_date 1 día antes" -ForegroundColor White

# Limpiar
Remove-Item f1_calendar_scraper.exe -ErrorAction SilentlyContinue 