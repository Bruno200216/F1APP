#!/bin/bash

# Script de comandos para migración de base de datos
# F1 Fantasy App - Database Commands v2.0

set -e  # Exit on any error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración de base de datos
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"3306"}
DB_USER=${DB_USER:-"f1user"}
DB_PASSWORD=${DB_PASSWORD:-"f1password"}
DB_NAME=${DB_NAME:-"f1fantasy"}

echo -e "${BLUE}🏎️  F1 Fantasy App - Database Commands${NC}"
echo "=============================================="

# Función para mostrar progreso
show_progress() {
    echo -e "${BLUE}🔄 $1${NC}"
}

# Función para mostrar éxito
show_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Función para mostrar error
show_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Función para mostrar información
show_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Verificar conexión a la base de datos
check_db_connection() {
    show_progress "Verificando conexión a la base de datos..."
    
    if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1; then
        show_success "Conexión a la base de datos exitosa"
        return 0
    else
        show_error "No se pudo conectar a la base de datos"
        show_info "Verifica las credenciales y que MySQL esté corriendo"
        return 1
    fi
}

# Ejecutar migración completa
run_complete_migration() {
    show_progress "Ejecutando migración completa de la base de datos..."
    
    if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" < database-migration-complete.sql; then
        show_success "Migración completa ejecutada exitosamente"
    else
        show_error "Error ejecutando la migración completa"
        return 1
    fi
}

# Ejecutar migración inicial
run_initial_migration() {
    show_progress "Ejecutando migración inicial..."
    
    if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" < init.sql; then
        show_success "Migración inicial ejecutada exitosamente"
    else
        show_error "Error ejecutando la migración inicial"
        return 1
    fi
}

# Ejecutar setup completo 2025
run_setup_2025() {
    show_progress "Ejecutando setup completo 2025..."
    
    if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < complete_setup_2025.sql; then
        show_success "Setup 2025 ejecutado exitosamente"
    else
        show_error "Error ejecutando el setup 2025"
        return 1
    fi
}

# Ejecutar migraciones individuales
run_individual_migrations() {
    show_progress "Ejecutando migraciones individuales..."
    
    local migrations=(
        "create_lineups_table.sql"
        "add_start_date_column.sql"
        "add_lineup_points_column.sql"
        "add_is_admin_column.sql"
        "add_is_in_market_column.sql"
        "add_points_by_gp_column.sql"
        "update_lineups_table_structure.sql"
        "add_missing_fk_lineups.sql"
        "fix_player_by_league_table.sql"
        "update_existing_grand_prix_table.sql"
        "update_grand_prix_2025.sql"
        "populate_start_dates_2025.sql"
    )
    
    for migration in "${migrations[@]}"; do
        if [ -f "$migration" ]; then
            show_progress "Ejecutando $migration..."
            if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$migration"; then
                show_success "$migration ejecutado exitosamente"
            else
                show_error "Error ejecutando $migration"
                return 1
            fi
        else
            show_info "Archivo $migration no encontrado, saltando..."
        fi
    done
}

# Verificar estado de la base de datos
check_database_status() {
    show_progress "Verificando estado de la base de datos..."
    
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
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
    "
}

# Backup de la base de datos
backup_database() {
    local backup_file="f1fantasy_backup_$(date +%Y%m%d_%H%M%S).sql"
    show_progress "Creando backup de la base de datos: $backup_file"
    
    if mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$backup_file"; then
        show_success "Backup creado exitosamente: $backup_file"
    else
        show_error "Error creando el backup"
        return 1
    fi
}

# Restaurar base de datos
restore_database() {
    local backup_file=$1
    if [ -z "$backup_file" ]; then
        show_error "Debes especificar un archivo de backup"
        show_info "Uso: $0 restore <archivo_backup.sql>"
        return 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        show_error "Archivo de backup no encontrado: $backup_file"
        return 1
    fi
    
    show_progress "Restaurando base de datos desde: $backup_file"
    
    if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$backup_file"; then
        show_success "Base de datos restaurada exitosamente"
    else
        show_error "Error restaurando la base de datos"
        return 1
    fi
}

# Mostrar ayuda
show_help() {
    echo -e "${BLUE}Comandos disponibles:${NC}"
    echo ""
    echo "  ${YELLOW}check${NC}     - Verificar conexión a la base de datos"
    echo "  ${YELLOW}migrate${NC}   - Ejecutar migración completa"
    echo "  ${YELLOW}init${NC}      - Ejecutar migración inicial"
    echo "  ${YELLOW}setup2025${NC} - Ejecutar setup completo 2025"
    echo "  ${YELLOW}individual${NC} - Ejecutar migraciones individuales"
    echo "  ${YELLOW}status${NC}    - Verificar estado de la base de datos"
    echo "  ${YELLOW}backup${NC}    - Crear backup de la base de datos"
    echo "  ${YELLOW}restore${NC}   - Restaurar base de datos desde backup"
    echo "  ${YELLOW}help${NC}      - Mostrar esta ayuda"
    echo ""
    echo -e "${BLUE}Variables de entorno:${NC}"
    echo "  DB_HOST     - Host de la base de datos (default: localhost)"
    echo "  DB_PORT     - Puerto de la base de datos (default: 3306)"
    echo "  DB_USER     - Usuario de la base de datos (default: f1user)"
    echo "  DB_PASSWORD - Contraseña de la base de datos (default: f1password)"
    echo "  DB_NAME     - Nombre de la base de datos (default: f1fantasy)"
    echo ""
    echo -e "${BLUE}Ejemplos:${NC}"
    echo "  $0 migrate"
    echo "  $0 status"
    echo "  $0 backup"
    echo "  $0 restore f1fantasy_backup_20241201_143022.sql"
}

# Función principal
main() {
    local command=$1
    local backup_file=$2
    
    case $command in
        "check")
            check_db_connection
            ;;
        "migrate")
            check_db_connection && run_complete_migration
            ;;
        "init")
            check_db_connection && run_initial_migration
            ;;
        "setup2025")
            check_db_connection && run_setup_2025
            ;;
        "individual")
            check_db_connection && run_individual_migrations
            ;;
        "status")
            check_db_connection && check_database_status
            ;;
        "backup")
            check_db_connection && backup_database
            ;;
        "restore")
            check_db_connection && restore_database "$backup_file"
            ;;
        "help"|"")
            show_help
            ;;
        *)
            show_error "Comando no reconocido: $command"
            show_help
            exit 1
            ;;
    esac
}

# Ejecutar función principal
main "$@" 