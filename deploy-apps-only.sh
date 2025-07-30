#!/bin/bash

# Script para desplegar solo las aplicaciones (backend y frontend) sin tocar la base de datos
# Uso: ./deploy-apps-only.sh [comando]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo -e "${BLUE}F1 Fantasy App - Despliegue de Aplicaciones (Sin BD)${NC}"
    echo
    echo "Uso: ./deploy-apps-only.sh [comando]"
    echo
    echo "Comandos disponibles:"
    echo "  deploy        - Desplegar aplicaciones (backend + frontend)"
    echo "  stop          - Parar solo las aplicaciones"
    echo "  restart       - Reiniciar solo las aplicaciones"
    echo "  logs          - Mostrar logs de las aplicaciones"
    echo "  status        - Mostrar estado de las aplicaciones"
    echo "  update        - Actualizar imágenes y desplegar"
    echo "  help          - Mostrar esta ayuda"
    echo
}

# Verificar que Docker esté instalado
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

# Verificar que las imágenes existan
check_images() {
    echo -e "${BLUE}Verificando imágenes locales...${NC}"
    
    if ! docker images | grep -q "f1app-backend"; then
        echo -e "${RED}Error: Imagen f1app-backend no encontrada${NC}"
        echo -e "${YELLOW}Ejecuta primero: ./build-images.sh${NC}"
        exit 1
    fi
    
    if ! docker images | grep -q "f1app-frontend"; then
        echo -e "${RED}Error: Imagen f1app-frontend no encontrada${NC}"
        echo -e "${YELLOW}Ejecuta primero: ./build-images.sh${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Imágenes verificadas${NC}"
}

# Desplegar aplicaciones
deploy() {
    echo -e "${YELLOW}Desplegando aplicaciones (sin tocar la base de datos)...${NC}"
    
    # Crear docker-compose solo para apps
    cat > docker-compose.apps.yml << 'EOF'
services:
  # Backend API en Go
  backend:
    image: f1app-backend:latest
    container_name: f1app-backend
    restart: unless-stopped
    environment:
      DB_HOST: ${DB_HOST:-localhost}
      DB_PORT: ${DB_PORT:-3306}
      DB_USER: ${DB_USER:-f1user}
      DB_PASSWORD: ${DB_PASSWORD:-f1password}
      DB_NAME: ${DB_NAME:-f1fantasy}
      PORT: 8080
    ports:
      - "8080:8080"
    networks:
      - f1app-network

  # Frontend React
  frontend:
    image: f1app-frontend:latest
    container_name: f1app-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - f1app-network

networks:
  f1app-network:
    driver: bridge
EOF

    # Cargar variables de entorno
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    elif [ -f env.production ]; then
        export $(cat env.production | grep -v '^#' | xargs)
    fi
    
    # Desplegar
    docker-compose -f docker-compose.apps.yml up -d
    
    echo -e "${GREEN}Aplicaciones desplegadas!${NC}"
    echo -e "${BLUE}Frontend: http://localhost${NC}"
    echo -e "${BLUE}Backend: http://localhost:8080${NC}"
    echo -e "${BLUE}Para ver logs: ./deploy-apps-only.sh logs${NC}"
}

# Parar aplicaciones
stop() {
    echo -e "${YELLOW}Parando aplicaciones...${NC}"
    docker-compose -f docker-compose.apps.yml down
    echo -e "${GREEN}Aplicaciones paradas!${NC}"
}

# Reiniciar aplicaciones
restart() {
    echo -e "${YELLOW}Reiniciando aplicaciones...${NC}"
    docker-compose -f docker-compose.apps.yml down
    docker-compose -f docker-compose.apps.yml up -d
    echo -e "${GREEN}Aplicaciones reiniciadas!${NC}"
}

# Mostrar logs
logs() {
    echo -e "${BLUE}Mostrando logs de las aplicaciones (Ctrl+C para salir)...${NC}"
    docker-compose -f docker-compose.apps.yml logs -f
}

# Mostrar estado
status() {
    echo -e "${BLUE}Estado de las aplicaciones:${NC}"
    docker-compose -f docker-compose.apps.yml ps
}

# Actualizar y desplegar
update() {
    echo -e "${YELLOW}Actualizando imágenes y desplegando...${NC}"
    
    # Construir nuevas imágenes
    echo -e "${BLUE}Construyendo nuevas imágenes...${NC}"
    ./build-images.sh
    
    # Parar aplicaciones actuales
    echo -e "${BLUE}Parando aplicaciones actuales...${NC}"
    docker-compose -f docker-compose.apps.yml down
    
    # Desplegar con nuevas imágenes
    echo -e "${BLUE}Desplegando con nuevas imágenes...${NC}"
    deploy
    
    echo -e "${GREEN}Actualización completada!${NC}"
}

# Procesar comandos
case "${1:-help}" in
    deploy)
        check_docker
        check_images
        deploy
        ;;
    stop)
        check_docker
        stop
        ;;
    restart)
        check_docker
        restart
        ;;
    logs)
        check_docker
        logs
        ;;
    status)
        check_docker
        status
        ;;
    update)
        check_docker
        update
        ;;
    help|*)
        show_help
        ;;
esac 