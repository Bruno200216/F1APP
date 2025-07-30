# Script para ejecutar la migración de GORM para player_by_league
# Uso: .\run-migration.ps1

Write-Host "🔧 Ejecutando migración de GORM para player_by_league..." -ForegroundColor Cyan

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "backend")) {
    Write-Host "❌ Error: No se encontró el directorio backend" -ForegroundColor Red
    Write-Host "Ejecuta este script desde el directorio raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

# Verificar que Go esté instalado
try {
    $goVersion = go version
    Write-Host "✅ Go encontrado: $goVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Go no está instalado o no está en el PATH" -ForegroundColor Red
    exit 1
}

# Cambiar al directorio backend
Write-Host "📁 Cambiando al directorio backend..." -ForegroundColor Blue
Set-Location backend

# Crear un script temporal de migración
$migrationScript = @'
package main

import (
	"log"
	"os"

	"f1-fantasy-app/database"
)

func main() {
	// Cargar variables de entorno
	os.Setenv("DB_HOST", "localhost")
	os.Setenv("DB_PORT", "3306")
	os.Setenv("DB_USER", "f1user")
	os.Setenv("DB_PASSWORD", "f1password")
	os.Setenv("DB_NAME", "f1fantasy")

	// Conectar a la base de datos
	database.Connect()

	// Ejecutar migración específica
	database.MigratePlayerByLeague()

	log.Println("Migración de player_by_league completada exitosamente")
}
'@

# Guardar el script temporal
$migrationScript | Out-File -FilePath "temp_migration.go" -Encoding UTF8

# Compilar y ejecutar la migración
Write-Host "🔨 Compilando migración..." -ForegroundColor Blue
go build -o temp_migration.exe temp_migration.go

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Compilación exitosa" -ForegroundColor Green
    
    Write-Host "🚀 Ejecutando migración..." -ForegroundColor Blue
    .\temp_migration.exe
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migración completada exitosamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Error ejecutando la migración" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Error compilando la migración" -ForegroundColor Red
}

# Limpiar archivos temporales
if (Test-Path "temp_migration.exe") {
    Remove-Item "temp_migration.exe"
}
if (Test-Path "temp_migration.go") {
    Remove-Item "temp_migration.go"
}
Write-Host "🧹 Archivos temporales eliminados" -ForegroundColor Yellow

# Volver al directorio raíz
Set-Location ..

Write-Host "Proceso completado" -ForegroundColor Cyan 