# Script de comandos para migración de base de datos
# F1 Fantasy App - Database Commands v2.0

param(
    [string]$Command = "help",
    [string]$BackupFile = ""
)

# Configuración de base de datos
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "3306" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "f1user" }
$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "f1password" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "f1fantasy" }

Write-Host "🏎️  F1 Fantasy App - Database Commands" -ForegroundColor Blue
Write-Host "==============================================" -ForegroundColor Blue

# Función para mostrar progreso
function Show-Progress {
    param([string]$Message)
    Write-Host "🔄 $Message" -ForegroundColor Blue
}

# Función para mostrar éxito
function Show-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

# Función para mostrar error
function Show-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Función para mostrar información
function Show-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Yellow
}

# Verificar conexión a la base de datos
function Test-DbConnection {
    Show-Progress "Verificando conexión a la base de datos..."
    
    try {
        $result = mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD -e "SELECT 1;" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Show-Success "Conexión a la base de datos exitosa"
            return $true
        } else {
            Show-Error "No se pudo conectar a la base de datos"
            Show-Info "Verifica las credenciales y que MySQL esté corriendo"
            return $false
        }
    } catch {
        Show-Error "Error verificando la conexión: $_"
        return $false
    }
}

# Ejecutar migración completa
function Invoke-CompleteMigration {
    Show-Progress "Ejecutando migración completa de la base de datos..."
    
    try {
        mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD < database-migration-complete.sql
        if ($LASTEXITCODE -eq 0) {
            Show-Success "Migración completa ejecutada exitosamente"
        } else {
            Show-Error "Error ejecutando la migración completa"
            return $false
        }
    } catch {
        Show-Error "Error ejecutando la migración completa: $_"
        return $false
    }
}

# Ejecutar migración inicial
function Invoke-InitialMigration {
    Show-Progress "Ejecutando migración inicial..."
    
    try {
        mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD < init.sql
        if ($LASTEXITCODE -eq 0) {
            Show-Success "Migración inicial ejecutada exitosamente"
        } else {
            Show-Error "Error ejecutando la migración inicial"
            return $false
        }
    } catch {
        Show-Error "Error ejecutando la migración inicial: $_"
        return $false
    }
}

# Ejecutar setup completo 2025
function Invoke-Setup2025 {
    Show-Progress "Ejecutando setup completo 2025..."
    
    try {
        mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < complete_setup_2025.sql
        if ($LASTEXITCODE -eq 0) {
            Show-Success "Setup 2025 ejecutado exitosamente"
        } else {
            Show-Error "Error ejecutando el setup 2025"
            return $false
        }
    } catch {
        Show-Error "Error ejecutando el setup 2025: $_"
        return $false
    }
}

# Ejecutar migraciones individuales
function Invoke-IndividualMigrations {
    Show-Progress "Ejecutando migraciones individuales..."
    
    $migrations = @(
        "create_lineups_table.sql",
        "add_start_date_column.sql",
        "add_lineup_points_column.sql",
        "add_is_admin_column.sql",
        "add_is_in_market_column.sql",
        "add_points_by_gp_column.sql",
        "update_lineups_table_structure.sql",
        "add_missing_fk_lineups.sql",
        "fix_player_by_league_table.sql",
        "update_existing_grand_prix_table.sql",
        "update_grand_prix_2025.sql",
        "populate_start_dates_2025.sql"
    )
    
    foreach ($migration in $migrations) {
        if (Test-Path $migration) {
            Show-Progress "Ejecutando $migration..."
            try {
                mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < $migration
                if ($LASTEXITCODE -eq 0) {
                    Show-Success "$migration ejecutado exitosamente"
                } else {
                    Show-Error "Error ejecutando $migration"
                    return $false
                }
            } catch {
                Show-Error "Error ejecutando $migration : $_"
                return $false
            }
        } else {
            Show-Info "Archivo $migration no encontrado, saltando..."
        }
    }
}

# Verificar estado de la base de datos
function Get-DatabaseStatus {
    Show-Progress "Verificando estado de la base de datos..."
    
    $query = @"
    SELECT 
        '📊 Estadísticas de la base de datos:' as info;
    SELECT 
        'Grand Prix' as table_name,
        COUNT(*) as count 
    FROM f1_grand_prixes
    UNION ALL
    SELECT 
        'Pilotos' as table_name,
        COUNT(*) as count 
    FROM pilots
    UNION ALL
    SELECT 
        'Constructores' as table_name,
        COUNT(*) as count 
    FROM constructors
    UNION ALL
    SELECT 
        'Ingenieros Jefe' as table_name,
        COUNT(*) as count 
    FROM chief_engineers
    UNION ALL
    SELECT 
        'Ingenieros de Pista' as table_name,
        COUNT(*) as count 
    FROM track_engineers
    UNION ALL
    SELECT 
        'Usuarios' as table_name,
        COUNT(*) as count 
    FROM players
    UNION ALL
    SELECT 
        'Ligas' as table_name,
        COUNT(*) as count 
    FROM leagues;
"@
    
    try {
        mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e $query
    } catch {
        Show-Error "Error verificando el estado de la base de datos: $_"
    }
}

# Backup de la base de datos
function New-DatabaseBackup {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "f1fantasy_backup_$timestamp.sql"
    Show-Progress "Creando backup de la base de datos: $backupFile"
    
    try {
        mysqldump -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME > $backupFile
        if ($LASTEXITCODE -eq 0) {
            Show-Success "Backup creado exitosamente: $backupFile"
        } else {
            Show-Error "Error creando el backup"
            return $false
        }
    } catch {
        Show-Error "Error creando el backup: $_"
        return $false
    }
}

# Restaurar base de datos
function Restore-Database {
    param([string]$BackupFile)
    
    if (-not $BackupFile) {
        Show-Error "Debes especificar un archivo de backup"
        Show-Info "Uso: .\database-commands.ps1 restore <archivo_backup.sql>"
        return $false
    }
    
    if (-not (Test-Path $BackupFile)) {
        Show-Error "Archivo de backup no encontrado: $BackupFile"
        return $false
    }
    
    Show-Progress "Restaurando base de datos desde: $BackupFile"
    
    try {
        mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < $BackupFile
        if ($LASTEXITCODE -eq 0) {
            Show-Success "Base de datos restaurada exitosamente"
        } else {
            Show-Error "Error restaurando la base de datos"
            return $false
        }
    } catch {
        Show-Error "Error restaurando la base de datos: $_"
        return $false
    }
}

# Mostrar ayuda
function Show-Help {
    Write-Host "Comandos disponibles:" -ForegroundColor Blue
    Write-Host ""
    Write-Host "  check     - Verificar conexión a la base de datos" -ForegroundColor Yellow
    Write-Host "  migrate   - Ejecutar migración completa" -ForegroundColor Yellow
    Write-Host "  init      - Ejecutar migración inicial" -ForegroundColor Yellow
    Write-Host "  setup2025 - Ejecutar setup completo 2025" -ForegroundColor Yellow
    Write-Host "  individual - Ejecutar migraciones individuales" -ForegroundColor Yellow
    Write-Host "  status    - Verificar estado de la base de datos" -ForegroundColor Yellow
    Write-Host "  backup    - Crear backup de la base de datos" -ForegroundColor Yellow
    Write-Host "  restore   - Restaurar base de datos desde backup" -ForegroundColor Yellow
    Write-Host "  help      - Mostrar esta ayuda" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Variables de entorno:" -ForegroundColor Blue
    Write-Host "  DB_HOST     - Host de la base de datos (default: localhost)" -ForegroundColor White
    Write-Host "  DB_PORT     - Puerto de la base de datos (default: 3306)" -ForegroundColor White
    Write-Host "  DB_USER     - Usuario de la base de datos (default: f1user)" -ForegroundColor White
    Write-Host "  DB_PASSWORD - Contraseña de la base de datos (default: f1password)" -ForegroundColor White
    Write-Host "  DB_NAME     - Nombre de la base de datos (default: f1fantasy)" -ForegroundColor White
    Write-Host ""
    Write-Host "Ejemplos:" -ForegroundColor Blue
    Write-Host "  .\database-commands.ps1 migrate" -ForegroundColor Gray
    Write-Host "  .\database-commands.ps1 status" -ForegroundColor Gray
    Write-Host "  .\database-commands.ps1 backup" -ForegroundColor Gray
    Write-Host "  .\database-commands.ps1 restore f1fantasy_backup_20241201_143022.sql" -ForegroundColor Gray
}

# Función principal
function Main {
    param([string]$Command, [string]$BackupFile)
    
    switch ($Command.ToLower()) {
        "check" {
            Test-DbConnection
        }
        "migrate" {
            if (Test-DbConnection) { Invoke-CompleteMigration }
        }
        "init" {
            if (Test-DbConnection) { Invoke-InitialMigration }
        }
        "setup2025" {
            if (Test-DbConnection) { Invoke-Setup2025 }
        }
        "individual" {
            if (Test-DbConnection) { Invoke-IndividualMigrations }
        }
        "status" {
            if (Test-DbConnection) { Get-DatabaseStatus }
        }
        "backup" {
            if (Test-DbConnection) { New-DatabaseBackup }
        }
        "restore" {
            if (Test-DbConnection) { Restore-Database $BackupFile }
        }
        "help" {
            Show-Help
        }
        default {
            Show-Error "Comando no reconocido: $Command"
            Show-Help
            exit 1
        }
    }
}

# Ejecutar función principal
Main -Command $Command -BackupFile $BackupFile 