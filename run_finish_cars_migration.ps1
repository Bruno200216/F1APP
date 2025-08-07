# =====================================================
# SCRIPT: Ejecutar migración finish_cars
# =====================================================

Write-Host "🚀 Ejecutando migración para añadir columna finish_cars..." -ForegroundColor Green

# Ejecutar la migración SQL
try {
    # Asumiendo que tienes MySQL instalado y configurado
    # Ajusta las credenciales según tu configuración
    $mysqlCommand = "mysql -u root -p -e `"source add_finish_cars_column.sql;`""
    
    Write-Host "📝 Ejecutando: $mysqlCommand" -ForegroundColor Yellow
    Invoke-Expression $mysqlCommand
    
    Write-Host "✅ Migración completada exitosamente" -ForegroundColor Green
    Write-Host "📊 La columna finish_cars ha sido añadida a la tabla team_races" -ForegroundColor Cyan
    Write-Host "🎯 Ahora puedes usar el campo en Admin Scores para registrar cuántos coches acabaron la carrera" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error ejecutando la migración: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Asegúrate de tener MySQL instalado y configurado correctamente" -ForegroundColor Yellow
}

Write-Host "`n📋 Resumen de cambios:" -ForegroundColor Magenta
Write-Host "• Nueva columna: finish_cars (TINYINT, DEFAULT 0)" -ForegroundColor White
Write-Host "• Valores posibles: 0, 1, 2 coches acabaron la carrera" -ForegroundColor White
Write-Host "• Modelo GORM actualizado en backend/models/models.go" -ForegroundColor White
Write-Host "• Endpoint actualizado en backend/main.go" -ForegroundColor White
Write-Host "• Frontend actualizado en AdminScoresPage.jsx" -ForegroundColor White 