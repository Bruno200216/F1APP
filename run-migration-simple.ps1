# Script simple para ejecutar la migración de GORM
Write-Host "Ejecutando migracion de GORM..." -ForegroundColor Cyan

# Cambiar al directorio backend
Set-Location backend

# Crear script temporal
$script = @'
package main

import (
    "log"
    "os"
    "f1-fantasy-app/database"
)

func main() {
    os.Setenv("DB_HOST", "localhost")
    os.Setenv("DB_PORT", "3306")
    os.Setenv("DB_USER", "f1user")
    os.Setenv("DB_PASSWORD", "f1password")
    os.Setenv("DB_NAME", "f1fantasy")
    
    database.Connect()
    database.MigratePlayerByLeague()
    log.Println("Migracion completada")
}
'@

# Guardar y ejecutar
$script | Out-File -FilePath "temp.go" -Encoding UTF8
go build -o temp.exe temp.go
.\temp.exe

# Limpiar
Remove-Item "temp.go" -ErrorAction SilentlyContinue
Remove-Item "temp.exe" -ErrorAction SilentlyContinue

# Volver al directorio raíz
Set-Location ..

Write-Host "Proceso completado" -ForegroundColor Green 