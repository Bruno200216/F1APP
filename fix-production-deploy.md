# Instrucciones para arreglar problemas en producción

## Problemas identificados:

1. **Las ligas no aparecen en frontend**: Error de conversión de tipos entre `uint` y `uint64` en `/api/my-leagues`
2. **El mercado no se llena**: Falta la columna `is_in_market` en la tabla `market_items`

## Pasos para solucionarlo:

### 1. Hacer deploy del código actualizado
```bash
# Si usas Docker
docker-compose down
docker-compose pull
docker-compose up -d

# O si usas script de deploy
./deploy.sh
```

### 2. Ejecutar la migración de base de datos
```bash
# Conectarse a la base de datos y ejecutar:
psql -U tu_usuario -d tu_base_de_datos -f fix-production-issues.sql

# O si usas Docker:
docker exec -i tu_postgres_container psql -U tu_usuario -d tu_base_de_datos < fix-production-issues.sql
```

### 3. Verificar que todo funciona
1. Crear una nueva liga
2. Verificar que aparece en la lista de ligas
3. Verificar que el mercado se llena correctamente

## Cambios realizados en el código:

### backend/main.go
- Arreglada conversión de tipos en `/api/my-leagues` (líneas ~2495-2520)
- Arreglada conversión de tipos en creación de liga (líneas ~548-575)
- Agregados logs adicionales para debugging

### SQL
- `add_is_in_market_column.sql`: Migración para agregar columna faltante
- `fix-production-issues.sql`: Script completo para arreglar todos los problemas

## Notas importantes:
- El problema del mercado se debe a que el código nuevo usa `is_in_market` pero la columna no existía en producción
- El problema de las ligas se debe a que `PlayerByLeague.PlayerID` es `uint64` pero se estaba comparando con `uint`
- Después de ejecutar la migración, todos los mercados se resetearán y se recrearán automáticamente

## Logs a monitorear:
Busca estos logs para verificar que todo funciona:
```
[MY-LEAGUES] Buscando ligas para player_id=X
[MY-LEAGUES] PlayerByLeague registros encontrados: X
[CREAR LIGA] Market_items poblado correctamente
[refreshMarketForLeague] Elementos seleccionados para el mercado: X
``` 