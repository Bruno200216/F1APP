# Script PowerShell para ejecutar el SQL de team constructors
Write-Host "Ejecutando script de team constructors..." -ForegroundColor Green

# Ejecutar el script SQL
mysql -u root -p123456 f1app -e "source create_team_constructors.sql"

Write-Host "Script ejecutado. Verificando resultados..." -ForegroundColor Green

# Verificar que se crearon los team constructors
mysql -u root -p123456 f1app -e "SELECT 'Team Constructors por GP:' as info; SELECT gp_index, COUNT(*) as count FROM teamconstructor GROUP BY gp_index ORDER BY gp_index;"

Write-Host "Verificación completada." -ForegroundColor Green 