#!/bin/bash

# Script para compilar y subir las imágenes de Docker a producción
# F1 Fantasy App - Build Production v2.0

set -e  # Exit on any error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
DOCKERHUB_USERNAME=${DOCKERHUB_USERNAME:-"tuusuario"}
BACKEND_IMAGE="f1app-backend"
FRONTEND_IMAGE="f1app-frontend"
VERSION="v2.0"

echo -e "${BLUE}🏎️  F1 Fantasy App - Build Production ${VERSION}${NC}"
echo "=================================================="

# Verificar que Docker esté corriendo
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker no está corriendo. Por favor inicia Docker Desktop.${NC}"
    exit 1
fi

# Verificar que estemos en el directorio correcto
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}❌ No se encontró docker-compose.prod.yml. Ejecuta este script desde el directorio raíz del proyecto.${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Configuración:${NC}"
echo "  Usuario Docker Hub: $DOCKERHUB_USERNAME"
echo "  Backend Image: $BACKEND_IMAGE"
echo "  Frontend Image: $FRONTEND_IMAGE"
echo "  Versión: $VERSION"
echo ""

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

# 1. Construir imagen del Backend
show_progress "Construyendo imagen del Backend..."
cd backend

# Limpiar build anterior si existe
if [ -f "main" ]; then
    rm main
fi

# Construir la imagen
docker build -t $DOCKERHUB_USERNAME/$BACKEND_IMAGE:$VERSION .
docker build -t $DOCKERHUB_USERNAME/$BACKEND_IMAGE:latest .

if [ $? -eq 0 ]; then
    show_success "Backend construido exitosamente"
else
    show_error "Error construyendo el Backend"
    exit 1
fi

cd ..

# 2. Construir imagen del Frontend
show_progress "Construyendo imagen del Frontend..."
cd frontend

# Limpiar build anterior si existe
if [ -d "build" ]; then
    rm -rf build
fi

# Construir la imagen
docker build -t $DOCKERHUB_USERNAME/$FRONTEND_IMAGE:$VERSION .
docker build -t $DOCKERHUB_USERNAME/$FRONTEND_IMAGE:latest .

if [ $? -eq 0 ]; then
    show_success "Frontend construido exitosamente"
else
    show_error "Error construyendo el Frontend"
    exit 1
fi

cd ..

# 3. Mostrar imágenes construidas
show_progress "Imágenes construidas:"
docker images | grep $DOCKERHUB_USERNAME

echo ""
echo -e "${GREEN}🎉 ¡Build completado exitosamente!${NC}"
echo ""
echo -e "${YELLOW}📋 Próximos pasos:${NC}"
echo "1. Para subir a Docker Hub:"
echo "   docker push $DOCKERHUB_USERNAME/$BACKEND_IMAGE:$VERSION"
echo "   docker push $DOCKERHUB_USERNAME/$BACKEND_IMAGE:latest"
echo "   docker push $DOCKERHUB_USERNAME/$FRONTEND_IMAGE:$VERSION"
echo "   docker push $DOCKERHUB_USERNAME/$FRONTEND_IMAGE:latest"
echo ""
echo "2. Para desplegar en producción:"
echo "   docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "3. Para ver logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f" 