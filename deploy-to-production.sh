#!/bin/bash

# Script para desplegar aplicaciones a producción sin tocar la base de datos
# Uso: ./deploy-to-production.sh [servidor]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración por defecto
SERVER=${1:-"tu-servidor.com"}
REMOTE_USER=${REMOTE_USER:-"root"}
REMOTE_PATH=${REMOTE_PATH:-"/opt/f1app"}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-""}

# Función para mostrar ayuda
show_help() {
    echo -e "${BLUE}F1 Fantasy App - Despliegue a Producción${NC}"
    echo
    echo "Uso: ./deploy-to-production.sh [servidor]"
    echo
    echo "Variables de entorno opcionales:"
    echo "  REMOTE_USER     - Usuario SSH (default: root)"
    echo "  REMOTE_PATH     - Ruta en servidor (default: /opt/f1app)"
    echo "  DOCKER_REGISTRY - Registro Docker (opcional)"
    echo
    echo "Ejemplo:"
    echo "  REMOTE_USER=ubuntu ./deploy-to-production.sh mi-servidor.com"
    echo
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

# Crear archivos de despliegue
create_deploy_files() {
    echo -e "${BLUE}Creando archivos de despliegue...${NC}"
    
    # Crear docker-compose para producción
    cat > docker-compose.prod-apps.yml << 'EOF'
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
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Frontend React
  frontend:
    image: f1app-frontend:latest
    container_name: f1app-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - f1app-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  f1app-network:
    driver: bridge
EOF

    # Crear script de despliegue para el servidor
    cat > deploy-on-server.sh << 'EOF'
#!/bin/bash

# Script para desplegar en el servidor
set -e

echo "🚀 Desplegando aplicaciones en producción..."

# Cargar variables de entorno
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Parar contenedores existentes
echo "🛑 Parando contenedores existentes..."
docker-compose -f docker-compose.prod-apps.yml down || true

# Eliminar imágenes antiguas
echo "🧹 Limpiando imágenes antiguas..."
docker rmi f1app-backend:latest f1app-frontend:latest 2>/dev/null || true

# Desplegar nuevas aplicaciones
echo "🚀 Desplegando nuevas aplicaciones..."
docker-compose -f docker-compose.prod-apps.yml up -d

# Verificar estado
echo "📊 Verificando estado..."
sleep 10
docker-compose -f docker-compose.prod-apps.yml ps

echo "✅ Despliegue completado!"
echo "🌐 Frontend: http://$(hostname -I | awk '{print $1}')"
echo "🔧 Backend: http://$(hostname -I | awk '{print $1}'):8080"
EOF

    chmod +x deploy-on-server.sh
    
    echo -e "${GREEN}Archivos de despliegue creados${NC}"
}

# Guardar imágenes como tar
save_images() {
    echo -e "${BLUE}Guardando imágenes como archivos tar...${NC}"
    
    docker save f1app-backend:latest -o f1app-backend.tar
    docker save f1app-frontend:latest -o f1app-frontend.tar
    
    echo -e "${GREEN}Imágenes guardadas${NC}"
}

# Subir archivos al servidor
upload_files() {
    echo -e "${BLUE}Subiendo archivos al servidor...${NC}"
    
    # Crear directorio en servidor
    ssh ${REMOTE_USER}@${SERVER} "mkdir -p ${REMOTE_PATH}"
    
    # Subir archivos
    scp docker-compose.prod-apps.yml ${REMOTE_USER}@${SERVER}:${REMOTE_PATH}/
    scp deploy-on-server.sh ${REMOTE_USER}@${SERVER}:${REMOTE_PATH}/
    scp f1app-backend.tar ${REMOTE_USER}@${SERVER}:${REMOTE_PATH}/
    scp f1app-frontend.tar ${REMOTE_USER}@${SERVER}:${REMOTE_PATH}/
    
    # Subir archivo de entorno si existe
    if [ -f .env ]; then
        scp .env ${REMOTE_USER}@${SERVER}:${REMOTE_PATH}/
    elif [ -f env.production ]; then
        scp env.production ${REMOTE_USER}@${SERVER}:${REMOTE_PATH}/.env
    fi
    
    echo -e "${GREEN}Archivos subidos${NC}"
}

# Ejecutar despliegue en servidor
deploy_on_server() {
    echo -e "${BLUE}Ejecutando despliegue en servidor...${NC}"
    
    ssh ${REMOTE_USER}@${SERVER} "cd ${REMOTE_PATH} && chmod +x deploy-on-server.sh && ./deploy-on-server.sh"
    
    echo -e "${GREEN}Despliegue completado en servidor!${NC}"
}

# Limpiar archivos temporales
cleanup() {
    echo -e "${BLUE}Limpiando archivos temporales...${NC}"
    
    rm -f f1app-backend.tar f1app-frontend.tar
    rm -f docker-compose.prod-apps.yml deploy-on-server.sh
    
    echo -e "${GREEN}Limpieza completada${NC}"
}

# Función principal
main() {
    if [ "$1" = "help" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_help
        exit 0
    fi
    
    echo -e "${BLUE}🚀 Iniciando despliegue a producción...${NC}"
    echo -e "${BLUE}Servidor: ${SERVER}${NC}"
    echo -e "${BLUE}Usuario: ${REMOTE_USER}${NC}"
    echo -e "${BLUE}Ruta: ${REMOTE_PATH}${NC}"
    echo
    
    check_images
    create_deploy_files
    save_images
    upload_files
    deploy_on_server
    cleanup
    
    echo -e "${GREEN}✅ Despliegue completado exitosamente!${NC}"
    echo -e "${BLUE}🌐 Tu aplicación está disponible en: http://${SERVER}${NC}"
}

# Ejecutar función principal
main "$@" 