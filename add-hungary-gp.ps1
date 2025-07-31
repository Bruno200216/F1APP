# =====================================================
# SCRIPT PARA AÑADIR GRAN PREMIO DE HUNGRÍA
# =====================================================

Write-Host "Añadiendo Gran Premio de Hungría a la base de datos..." -ForegroundColor Green

# Configuración de la base de datos
$DB_HOST = "localhost"
$DB_PORT = "3306"
$DB_NAME = "f1fantasy"
$DB_USER = "root"
$DB_PASS = "password"

# Ejecutar el script SQL
try {
    mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME -e "source add_hungary_gp.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Gran Premio de Hungría añadido correctamente" -ForegroundColor Green
        Write-Host "📅 Fecha: 2 de Agosto de 2025" -ForegroundColor Yellow
        Write-Host "🏁 Circuito: Hungaroring" -ForegroundColor Yellow
        Write-Host "🇭🇺 País: Hungary" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Error al añadir el Gran Premio de Hungría" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error de conexión a la base de datos" -ForegroundColor Red
    Write-Host "Asegúrate de que MySQL esté ejecutándose y las credenciales sean correctas" -ForegroundColor Yellow
}

Write-Host "`nPresiona cualquier tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 