#!/bin/bash

# Script de despliegue para F1 Fantasy App
# Uso: ./deploy.sh [comando]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo -e "${BLUE}F1 Fantasy App - Script de Despliegue${NC}"
    echo
    echo "Uso: ./deploy.sh [comando]"
    echo
    echo "Comandos disponibles:"
    echo "  start         - Construir y ejecutar la aplicación"
    echo "  stop          - Parar todos los servicios"
    echo "  restart       - Reiniciar todos los servicios"
    echo "  logs          - Mostrar logs en vivo"
    echo "  status        - Mostrar estado de contenedores"
    echo "  clean         - Limpiar contenedores y volúmenes"
    echo "  reset         - Reiniciar completamente (limpia la BD)"
    echo "  setup         - Configuración inicial"
    echo "  help          - Mostrar esta ayuda"
    echo
}

# Función para verificar si Docker está instalado
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker no está instalado${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}Error: Docker Compose no está instalado${NC}"
        exit 1
    fi
}

# Función para configuración inicial
setup() {
    echo -e "${YELLOW}Configurando F1 Fantasy App...${NC}"
    
    # Crear archivo .env si no existe
    if [ ! -f .env ]; then
        echo -e "${BLUE}Creando archivo .env...${NC}"
        cp env.example .env
        echo -e "${GREEN}Archivo .env creado. Puedes editarlo si necesitas cambiar la configuración.${NC}"
    else
        echo -e "${YELLOW}El archivo .env ya existe.${NC}"
    fi
    
    echo -e "${GREEN}Setup completado!${NC}"
}

# Función para iniciar la aplicación
start() {
    echo -e "${YELLOW}Iniciando F1 Fantasy App...${NC}"
    docker-compose up --build -d
    echo -e "${GREEN}Aplicación iniciada!${NC}"
    echo -e "${BLUE}Frontend: http://localhost${NC}"
    echo -e "${BLUE}Backend: http://localhost:8080${NC}"
    echo -e "${BLUE}Para ver logs: ./deploy.sh logs${NC}"
}

# Función para parar la aplicación
stop() {
    echo -e "${YELLOW}Parando F1 Fantasy App...${NC}"
    docker-compose down
    echo -e "${GREEN}Aplicación parada!${NC}"
}

# Función para reiniciar
restart() {
    echo -e "${YELLOW}Reiniciando F1 Fantasy App...${NC}"
    docker-compose down
    docker-compose up --build -d
    echo -e "${GREEN}Aplicación reiniciada!${NC}"
}

# Función para mostrar logs
logs() {
    echo -e "${BLUE}Mostrando logs (Ctrl+C para salir)...${NC}"
    docker-compose logs -f
}

# Función para mostrar estado
status() {
    echo -e "${BLUE}Estado de los contenedores:${NC}"
    docker-compose ps
}

# Función para limpiar
clean() {
    echo -e "${YELLOW}Limpiando contenedores...${NC}"
    docker-compose down
    docker-compose down --rmi all
    echo -e "${GREEN}Limpieza completada!${NC}"
}

# Función para reset completo
reset() {
    echo -e "${RED}¿Estás seguro de que quieres hacer un reset completo? Esto eliminará la base de datos. (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "${YELLOW}Haciendo reset completo...${NC}"
        docker-compose down -v
        docker-compose down --rmi all
        echo -e "${GREEN}Reset completado!${NC}"
    else
        echo -e "${BLUE}Reset cancelado.${NC}"
    fi
}

# Verificar Docker
check_docker

# Procesar comando
case "${1:-help}" in
    start)
        setup
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    clean)
        clean
        ;;
    reset)
        reset
        ;;
    setup)
        setup
        ;;
    help|*)
        show_help
        ;;
esac 