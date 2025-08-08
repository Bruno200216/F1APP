# Script para descargar y analizar HTML de F1.com
Write-Host "🔍 Descargando HTML de F1.com para análisis..." -ForegroundColor Green

# URL de ejemplo (puedes cambiarla)
$url = "https://www.formula1.com/en/results/2025/races/1260/china/race-result"

Write-Host "📄 Descargando desde: $url" -ForegroundColor Cyan

try {
    # Descargar HTML
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing
    $html = $response.Content
    
    # Guardar en archivo
    $html | Out-File -FilePath "debug_f1_html.txt" -Encoding UTF8
    
    Write-Host "✅ HTML descargado y guardado en debug_f1_html.txt" -ForegroundColor Green
    Write-Host "📊 Tamaño del HTML: $($html.Length) caracteres" -ForegroundColor Yellow
    
    # Buscar patrones específicos
    Write-Host "`n🔍 Buscando patrones específicos..." -ForegroundColor Cyan
    
    # Buscar posiciones
    $positionMatches = [regex]::Matches($html, '\d{1,2}')
    Write-Host "📍 Números encontrados: $($positionMatches.Count)" -ForegroundColor Yellow
    
    # Buscar nombres de pilotos
    $pilotNames = @("Verstappen", "Norris", "Leclerc", "Sainz", "Russell", "Hamilton", "Piastri", "Alonso", "Stroll", "Gasly", "Ocon", "Albon", "Tsunoda", "Hulkenberg", "Bottas", "Zhou", "Magnussen", "Ricciardo", "Sargeant", "Bearman", "Lawson", "Antonelli", "Hadjar", "Colapinto", "Bortoleto")
    
    foreach ($pilot in $pilotNames) {
        $count = ([regex]::Matches($html, $pilot)).Count
        if ($count -gt 0) {
            Write-Host "👤 $pilot encontrado $count veces" -ForegroundColor Green
        }
    }
    
    # Buscar estructuras de tabla
    $tableMatches = [regex]::Matches($html, '<td[^>]*>(\d+)</td>')
    Write-Host "📋 Estructuras de tabla encontradas: $($tableMatches.Count)" -ForegroundColor Yellow
    
    # Mostrar las primeras 1000 caracteres
    Write-Host "`n📄 Primeros 1000 caracteres del HTML:" -ForegroundColor Cyan
    Write-Host $html.Substring(0, [Math]::Min(1000, $html.Length)) -ForegroundColor White
    
} catch {
    Write-Host "❌ Error descargando HTML: $($_.Exception.Message)" -ForegroundColor Red
} 