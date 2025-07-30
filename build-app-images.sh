#!/bin/bash

# Script para construir imágenes Docker del Frontend y Backend
# Sin tocar la base de datos - Solo aplicaciones
# Uso: ./build-app-images.sh [opcional: usuario-dockerhub]

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con colores
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que Docker esté corriendo
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker no está corriendo"
        echo "Inicia Docker y vuelve a intentar"
        exit 1
    fi
    print_success "Docker está corriendo"
}

# Verificar que los directorios existan
check_directories() {
    if [ ! -d "./backend" ]; then
        print_error "Directorio ./backend no encontrado"
        exit 1
    fi
    
    if [ ! -d "./frontend" ]; then
        print_error "Directorio ./frontend no encontrado"
        exit 1
    fi
    
    print_success "Directorios verificados"
}

# Construir imagen del Backend
build_backend() {
    print_status "🔨 Construyendo imagen del Backend..."
    
    # Verificar que existe el Dockerfile
    if [ ! -f "./backend/Dockerfile" ]; then
        print_error "Dockerfile no encontrado en ./backend/"
        exit 1
    fi
    
    # Construir la imagen
    docker build -t f1app-backend:latest \
                 --label "build-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                 --label "description=F1 Fantasy Backend API" \
                 ./backend/
    
    if [ $? -eq 0 ]; then
        print_success "Backend construido exitosamente"
    else
        print_error "Error construyendo Backend"
        exit 1
    fi
}

# Construir imagen del Frontend
build_frontend() {
    print_status "🔨 Construyendo imagen del Frontend..."
    
    # Verificar que existe el Dockerfile
    if [ ! -f "./frontend/Dockerfile" ]; then
        print_error "Dockerfile no encontrado en ./frontend/"
        exit 1
    fi
    
    # Verificar que existe nginx.conf
    if [ ! -f "./frontend/nginx.conf" ]; then
        print_warning "nginx.conf no encontrado en ./frontend/"
        print_status "Se usará la configuración por defecto de nginx"
    fi
    
    # Construir la imagen
    docker build -t f1app-frontend:latest \
                 --label "build-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                 --label "description=F1 Fantasy Frontend React App" \
                 ./frontend/
    
    if [ $? -eq 0 ]; then
        print_success "Frontend construido exitosamente"
    else
        print_error "Error construyendo Frontend"
        exit 1
    fi
}

# Mostrar información de las imágenes construidas
show_images() {
    print_status "📋 Imágenes construidas:"
    echo ""
    docker images | grep -E "f1app|REPOSITORY" || true
    echo ""
}

# Función para hacer push a Docker Hub (opcional)
push_to_dockerhub() {
    local username=$1
    
    if [ -z "$username" ]; then
        print_warning "No se proporcionó usuario de Docker Hub"
        print_status "Para hacer push más tarde, usa:"
        echo "   docker tag f1app-backend:latest $username/f1app-backend:latest"
        echo "   docker tag f1app-frontend:latest $username/f1app-frontend:latest"
        echo "   docker push $username/f1app-backend:latest"
        echo "   docker push $username/f1app-frontend:latest"
        return
    fi
    
    print_status "🔐 Verificando login en Docker Hub..."
    
    # Verificar si ya está logueado
    if docker info | grep -q "Username"; then
        local logged_user=$(docker info 2>/dev/null | grep "Username" | awk '{print $2}')
        print_success "Logueado como: $logged_user"
    else
        print_warning "Necesitas hacer login en Docker Hub"
        docker login
        if [ $? -ne 0 ]; then
            print_error "Error en login"
            return
        fi
    fi
    
    # Preguntar si hacer push
    echo ""
    read -p "¿Hacer push a Docker Hub? (y/N): " response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        
        print_status "🚀 Haciendo push a Docker Hub..."
        
        # Tag y push Backend
        print_status "📤 Pushing Backend..."
        docker tag f1app-backend:latest "$username/f1app-backend:latest"
        docker push "$username/f1app-backend:latest"
        
        # Tag y push Frontend
        print_status "📤 Pushing Frontend..."
        docker tag f1app-frontend:latest "$username/f1app-frontend:latest"
        docker push "$username/f1app-frontend:latest"
        
        print_success "Push completado exitosamente!"
        echo ""
        print_status "🌐 Imágenes disponibles en Docker Hub:"
        echo "   🔗 https://hub.docker.com/r/$username/f1app-backend"
        echo "   🔗 https://hub.docker.com/r/$username/f1app-frontend"
        
    else
        print_status "Push cancelado. Las imágenes están construidas localmente."
    fi
}

# Función para crear docker-compose sin base de datos
create_app_compose() {
    print_status "📝 Creando docker-compose.app.yml (sin base de datos)..."
    
    cat > docker-compose.app.yml << 'EOF'
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

    print_success "docker-compose.app.yml creado"
    print_status "Para ejecutar solo las aplicaciones:"
    echo "   docker-compose -f docker-compose.app.yml up -d"
}

# Función principal
main() {
    echo "🚀 F1 Fantasy App - Build Images (Solo Aplicaciones)"
    echo "📅 Fecha: $(date)"
    echo "🏷️  Versión: $(git describe --tags 2>/dev/null || echo 'latest')"
    echo ""
    
    # Verificaciones iniciales
    check_docker
    check_directories
    
    # Construir imágenes
    build_backend
    build_frontend
    
    # Mostrar resultados
    show_images
    
    # Crear docker-compose para solo aplicaciones
    create_app_compose
    
    # Push opcional a Docker Hub
    push_to_dockerhub "$1"
    
    echo ""
    print_success "✅ Construcción completada!"
    echo ""
    print_status "📋 Comandos útiles:"
    echo "   # Ejecutar solo las aplicaciones (sin BD):"
    echo "   docker-compose -f docker-compose.app.yml up -d"
    echo ""
    echo "   # Ver logs:"
    echo "   docker-compose -f docker-compose.app.yml logs -f"
    echo ""
    echo "   # Parar aplicaciones:"
    echo "   docker-compose -f docker-compose.app.yml down"
    echo ""
    echo "   # Ejecutar con base de datos completa:"
    echo "   docker-compose up -d"
}

# Ejecutar función principal con argumentos
main "$@" 