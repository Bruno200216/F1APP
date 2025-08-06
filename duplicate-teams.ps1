# Script PowerShell para duplicar team constructors para todos los GPs
Write-Host "Duplicando team constructors para todos los GPs..." -ForegroundColor Green

# Ejecutar el script SQL
mysql -u root -p123456 f1app -e "source duplicate_team_constructors.sql"

Write-Host "Duplicación completada." -ForegroundColor Green 