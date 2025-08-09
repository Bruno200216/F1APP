# Script para probar el scraper corregido
Write-Host "=== PROBANDO SCRAPER CORREGIDO ===" -ForegroundColor Green

# Compilar el scraper
Write-Host "Compilando scraper..." -ForegroundColor Yellow
go build -o f1_scraper_final.exe f1_scraper_final.go

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Compilación exitosa" -ForegroundColor Green
    
    # Ejecutar el scraper
    Write-Host "Ejecutando scraper..." -ForegroundColor Yellow
    ./f1_scraper_final.exe
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Scraper ejecutado exitosamente" -ForegroundColor Green
    } else {
        Write-Host "✗ Error ejecutando scraper (código: $LASTEXITCODE)" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Error en la compilación" -ForegroundColor Red
}

Write-Host "=== FIN DE PRUEBA ===" -ForegroundColor Green 