#!/bin/bash

# Script para limpiar pujas antiguas de la FIA
# Ejecutar después de finalizar las subastas

echo "🧹 Iniciando limpieza de pujas FIA..."

# Configuración de la base de datos
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="f1_fantasy"
DB_USER="root"
DB_PASS=""

# Leer configuración desde archivo .env si existe
if [ -f ".env" ]; then
    source .env
fi

# Función para ejecutar SQL
execute_sql() {
    local query="$1"
    
    if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "$query" 2>/dev/null; then
        echo "✅ SQL ejecutado correctamente"
        return 0
    else
        echo "❌ Error ejecutando SQL"
        return 1
    fi
}

# Limpiar pujas de la FIA
echo "📊 Limpiando pujas de la FIA..."

queries=(
    "UPDATE pilot_by_league SET bids = '[]' WHERE bids IS NOT NULL AND bids != '[]' AND bids != 'null' AND JSON_CONTAINS(bids, '{\"player_id\": 999999}');"
    "UPDATE track_engineer_by_league SET bids = '[]' WHERE bids IS NOT NULL AND bids != '[]' AND bids != 'null' AND JSON_CONTAINS(bids, '{\"player_id\": 999999}');"
    "UPDATE chief_engineer_by_league SET bids = '[]' WHERE bids IS NOT NULL AND bids != '[]' AND bids != 'null' AND JSON_CONTAINS(bids, '{\"player_id\": 999999}');"
    "UPDATE team_constructor_by_league SET bids = '[]' WHERE bids IS NOT NULL AND bids != '[]' AND bids != 'null' AND JSON_CONTAINS(bids, '{\"player_id\": 999999}');"
)

for query in "${queries[@]}"; do
    echo "Ejecutando: $query"
    execute_sql "$query"
done

# Verificar resultados
echo "🔍 Verificando resultados..."

verification_query="
SELECT 'Pilotos con pujas FIA' as tipo, COUNT(*) as cantidad
FROM pilot_by_league 
WHERE bids IS NOT NULL 
  AND bids != '[]' 
  AND bids != 'null'
  AND JSON_CONTAINS(bids, '{\"player_id\": 999999}')
UNION ALL
SELECT 'Track Engineers con pujas FIA' as tipo, COUNT(*) as cantidad
FROM track_engineer_by_league 
WHERE bids IS NOT NULL 
  AND bids != '[]' 
  AND bids != 'null'
  AND JSON_CONTAINS(bids, '{\"player_id\": 999999}')
UNION ALL
SELECT 'Chief Engineers con pujas FIA' as tipo, COUNT(*) as cantidad
FROM chief_engineer_by_league 
WHERE bids IS NOT NULL 
  AND bids != '[]' 
  AND bids != 'null'
  AND JSON_CONTAINS(bids, '{\"player_id\": 999999}')
UNION ALL
SELECT 'Team Constructors con pujas FIA' as tipo, COUNT(*) as cantidad
FROM team_constructor_by_league 
WHERE bids IS NOT NULL 
  AND bids != '[]' 
  AND bids != 'null'
  AND JSON_CONTAINS(bids, '{\"player_id\": 999999}');
"

result=$(execute_sql "$verification_query")
if [ $? -eq 0 ]; then
    echo "📋 Resultados de la verificación:"
    echo "$result"
else
    echo "❌ No se pudieron verificar los resultados"
fi

echo "✨ Limpieza de pujas FIA completada" 