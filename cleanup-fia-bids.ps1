# Script para limpiar pujas antiguas de la FIA
# Ejecutar después de finalizar las subastas

Write-Host "🧹 Iniciando limpieza de pujas FIA..." -ForegroundColor Yellow

# Configuración de la base de datos
$DB_HOST = "localhost"
$DB_PORT = "3306"
$DB_NAME = "f1_fantasy"
$DB_USER = "root"
$DB_PASS = ""

# Leer configuración desde archivo .env si existe
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            $varName = $matches[1]
            $varValue = $matches[2]
            Set-Variable -Name $varName -Value $varValue
        }
    }
}

# Función para ejecutar SQL
function Execute-SQL {
    param(
        [string]$Query
    )
    
    try {
        $result = mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME -e $Query 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ SQL ejecutado correctamente" -ForegroundColor Green
            return $result
        } else {
            Write-Host "❌ Error ejecutando SQL: $result" -ForegroundColor Red
            return $null
        }
    } catch {
        Write-Host "❌ Error de conexión a la base de datos: $_" -ForegroundColor Red
        return $null
    }
}

# Limpiar pujas de la FIA
Write-Host "📊 Limpiando pujas de la FIA..." -ForegroundColor Cyan

$queries = @(
    "UPDATE pilot_by_league SET bids = '[]' WHERE bids IS NOT NULL AND bids != '[]' AND bids != 'null' AND JSON_CONTAINS(bids, '{\"player_id\": 999999}');",
    "UPDATE track_engineer_by_league SET bids = '[]' WHERE bids IS NOT NULL AND bids != '[]' AND bids != 'null' AND JSON_CONTAINS(bids, '{\"player_id\": 999999}');",
    "UPDATE chief_engineer_by_league SET bids = '[]' WHERE bids IS NOT NULL AND bids != '[]' AND bids != 'null' AND JSON_CONTAINS(bids, '{\"player_id\": 999999}');",
    "UPDATE team_constructor_by_league SET bids = '[]' WHERE bids IS NOT NULL AND bids != '[]' AND bids != 'null' AND JSON_CONTAINS(bids, '{\"player_id\": 999999}');"
)

foreach ($query in $queries) {
    Write-Host "Ejecutando: $query" -ForegroundColor Gray
    Execute-SQL -Query $query
}

# Verificar resultados
Write-Host "🔍 Verificando resultados..." -ForegroundColor Cyan

$verificationQuery = @"
SELECT 'Pilotos con pujas FIA' as tipo, COUNT(*) as cantidad
FROM pilot_by_league 
WHERE bids IS NOT NULL 
  AND bids != '[]' 
  AND bids != 'null'
  AND JSON_CONTAINS(bids, '{"player_id": 999999}')
UNION ALL
SELECT 'Track Engineers con pujas FIA' as tipo, COUNT(*) as cantidad
FROM track_engineer_by_league 
WHERE bids IS NOT NULL 
  AND bids != '[]' 
  AND bids != 'null'
  AND JSON_CONTAINS(bids, '{"player_id": 999999}')
UNION ALL
SELECT 'Chief Engineers con pujas FIA' as tipo, COUNT(*) as cantidad
FROM chief_engineer_by_league 
WHERE bids IS NOT NULL 
  AND bids != '[]' 
  AND bids != 'null'
  AND JSON_CONTAINS(bids, '{"player_id": 999999}')
UNION ALL
SELECT 'Team Constructors con pujas FIA' as tipo, COUNT(*) as cantidad
FROM team_constructor_by_league 
WHERE bids IS NOT NULL 
  AND bids != '[]' 
  AND bids != 'null'
  AND JSON_CONTAINS(bids, '{"player_id": 999999}');
"@

$result = Execute-SQL -Query $verificationQuery
if ($result) {
    Write-Host "📋 Resultados de la verificación:" -ForegroundColor Green
    Write-Host $result -ForegroundColor White
} else {
    Write-Host "❌ No se pudieron verificar los resultados" -ForegroundColor Red
}

Write-Host "✨ Limpieza de pujas FIA completada" -ForegroundColor Green 