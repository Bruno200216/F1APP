#!/bin/bash

# Script para crear y subir la nueva versión con las correcciones
# Uso: ./build-and-push-v2.sh <tu-usuario-dockerhub>

if [ -z "$1" ]; then
    echo "❌ Error: Debes proporcionar tu usuario de Docker Hub"
    echo "Uso: ./build-and-push-v2.sh <tu-usuario-dockerhub>"
    exit 1
fi

DOCKER_HUB_USERNAME=$1
VERSION="v2.0"
BUILD_DATE=$(date +%Y-%m-%d)

echo "🚀 F1 Fantasy App - Build & Push v2.0"
echo "📅 Fecha: $BUILD_DATE"
echo "👤 Usuario Docker Hub: $DOCKER_HUB_USERNAME"
echo "🏷️  Versión: $VERSION"
echo ""

# Verificar que Docker esté corriendo
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker no está corriendo"
    echo "Inicia Docker y vuelve a intentar"
    exit 1
fi
echo "✅ Docker está corriendo"

# Limpiar imágenes anteriores (opcional)
echo "🧹 Limpiando imágenes anteriores..."
docker image prune -f

# Construir Backend con las correcciones
echo "🔨 Construyendo Backend v2.0..."
echo "   ➤ Incluye: Correcciones de PlayerByLeague, MarketItems, logs mejorados"

docker build -t "f1app-backend:$VERSION" \
             -t "f1app-backend:latest" \
             -t "${DOCKER_HUB_USERNAME}/f1app-backend:$VERSION" \
             -t "${DOCKER_HUB_USERNAME}/f1app-backend:latest" \
             --label "version=$VERSION" \
             --label "build-date=$BUILD_DATE" \
             --label "description=F1 Fantasy Backend with PlayerByLeague and Market fixes" \
             ./backend/

if [ $? -ne 0 ]; then
    echo "❌ Error construyendo backend"
    exit 1
fi
echo "   ✅ Backend construido exitosamente"

# Construir Frontend
echo "🔨 Construyendo Frontend v2.0..."

docker build -t "f1app-frontend:$VERSION" \
             -t "f1app-frontend:latest" \
             -t "${DOCKER_HUB_USERNAME}/f1app-frontend:$VERSION" \
             -t "${DOCKER_HUB_USERNAME}/f1app-frontend:latest" \
             --label "version=$VERSION" \
             --label "build-date=$BUILD_DATE" \
             --label "description=F1 Fantasy Frontend" \
             ./frontend/

if [ $? -ne 0 ]; then
    echo "❌ Error construyendo frontend"
    exit 1
fi
echo "   ✅ Frontend construido exitosamente"

# Mostrar imágenes construidas
echo ""
echo "📋 Imágenes construidas:"
docker images | grep -E "f1app|$DOCKER_HUB_USERNAME"

# Verificar login en Docker Hub
echo ""
echo "🔐 Verificando login en Docker Hub..."

if docker info | grep -q "Username"; then
    USERNAME=$(docker info 2>/dev/null | grep "Username" | awk '{print $2}')
    echo "✅ Logueado como: $USERNAME"
else
    echo "⚠️  Necesitas hacer login en Docker Hub"
    echo "Ejecutando docker login..."
    docker login
    if [ $? -ne 0 ]; then
        echo "❌ Error en login"
        exit 1
    fi
fi

# Preguntar si hacer push
echo ""
read -p "¿Hacer push a Docker Hub? (y/N): " response
if [[ "$response" =~ ^[Yy]$ ]]; then
    
    echo "🚀 Haciendo push a Docker Hub..."
    
    # Push Backend
    echo "📤 Pushing backend..."
    docker push "${DOCKER_HUB_USERNAME}/f1app-backend:$VERSION"
    docker push "${DOCKER_HUB_USERNAME}/f1app-backend:latest"
    
    if [ $? -ne 0 ]; then
        echo "❌ Error haciendo push del backend"
        exit 1
    fi
    
    # Push Frontend
    echo "📤 Pushing frontend..."
    docker push "${DOCKER_HUB_USERNAME}/f1app-frontend:$VERSION"
    docker push "${DOCKER_HUB_USERNAME}/f1app-frontend:latest"
    
    if [ $? -ne 0 ]; then
        echo "❌ Error haciendo push del frontend"
        exit 1
    fi
    
    echo ""
    echo "🎉 ¡Deploy completado exitosamente!"
    echo ""
    echo "🌐 Imágenes disponibles en Docker Hub:"
    echo "   🔗 https://hub.docker.com/r/${DOCKER_HUB_USERNAME}/f1app-backend"
    echo "   🔗 https://hub.docker.com/r/${DOCKER_HUB_USERNAME}/f1app-frontend"
    echo ""
    echo "📋 Para usar en producción:"
    echo "   docker pull ${DOCKER_HUB_USERNAME}/f1app-backend:$VERSION"
    echo "   docker pull ${DOCKER_HUB_USERNAME}/f1app-frontend:$VERSION"
    
else
    echo "⏸️  Push cancelado. Las imágenes están construidas localmente."
    echo ""
    echo "Para hacer push más tarde:"
    echo "   docker push ${DOCKER_HUB_USERNAME}/f1app-backend:$VERSION"
    echo "   docker push ${DOCKER_HUB_USERNAME}/f1app-frontend:$VERSION"
fi

echo ""
echo "✨ Cambios incluidos en v2.0:"
echo "   ✅ Corrección de PlayerByLeague con rollback"
echo "   ✅ Validación robusta de MarketItems"  
echo "   ✅ Logs detallados con contadores"
echo "   ✅ Endpoint de debug /api/debug/league/:id"
echo "   ✅ Corrección de tipos uint/uint64"
echo "   ✅ Eliminación de llamadas duplicadas a refreshMarketForLeague" 