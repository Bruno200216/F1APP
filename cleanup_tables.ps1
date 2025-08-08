# =====================================================
# SCRIPT POWERSHELL: Limpiar registros con ID > 40
# =====================================================

# Configuración de la base de datos
$DB_HOST = "127.0.0.1"
$DB_PORT = "3307"
$DB_USER = "root"
$DB_PASSWORD = "123456"
$DB_NAME = "f1_fantasy_db"

# Comandos SQL para limpiar las tablas
$SQL_COMMANDS = @"
-- Verificar registros antes de borrar
SELECT 'pilot_races' as table_name, COUNT(*) as total_records, COUNT(CASE WHEN id > 40 THEN 1 END) as records_to_delete FROM pilot_races
UNION ALL
SELECT 'pilot_qualies' as table_name, COUNT(*) as total_records, COUNT(CASE WHEN id > 40 THEN 1 END) as records_to_delete FROM pilot_qualies
UNION ALL
SELECT 'pilot_practices' as table_name, COUNT(*) as total_records, COUNT(CASE WHEN id > 40 THEN 1 END) as records_to_delete FROM pilot_practices;

-- Borrar registros con ID > 40
DELETE FROM pilot_races WHERE id > 40;
DELETE FROM pilot_qualies WHERE id > 40;
DELETE FROM pilot_practices WHERE id > 40;

-- Verificar registros después de borrar
SELECT 'pilot_races' as table_name, COUNT(*) as remaining_records FROM pilot_races
UNION ALL
SELECT 'pilot_qualies' as table_name, COUNT(*) as remaining_records FROM pilot_qualies
UNION ALL
SELECT 'pilot_practices' as table_name, COUNT(*) as remaining_records FROM pilot_practices;

-- Verificar que no quedan registros con ID > 40
SELECT 'pilot_races' as table_name, MAX(id) as max_id FROM pilot_races
UNION ALL
SELECT 'pilot_qualies' as table_name, MAX(id) as max_id FROM pilot_qualies
UNION ALL
SELECT 'pilot_practices' as table_name, MAX(id) as max_id FROM pilot_practices;
"@

Write-Host "🔍 Limpiando registros con ID > 40 en las tablas..." -ForegroundColor Yellow

# Ejecutar comandos SQL usando mysql
try {
    # Crear archivo temporal con los comandos SQL
    $tempFile = [System.IO.Path]::GetTempFileName()
    $SQL_COMMANDS | Out-File -FilePath $tempFile -Encoding UTF8

    # Ejecutar comandos SQL
    $mysqlCommand = "mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < `"$tempFile`""
    
    Write-Host "📝 Ejecutando comandos SQL..." -ForegroundColor Green
    Invoke-Expression $mysqlCommand

    # Limpiar archivo temporal
    if (Test-Path $tempFile) {
        Remove-Item $tempFile
    }

    Write-Host "✅ Limpieza completada exitosamente!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error ejecutando comandos SQL: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Asegúrate de que MySQL esté instalado y accesible desde PowerShell" -ForegroundColor Yellow
}

Write-Host "🎯 Verifica los resultados en DBeaver" -ForegroundColor Cyan 