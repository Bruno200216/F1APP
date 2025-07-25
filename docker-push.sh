#!/bin/bash

# Script para hacer push de las imágenes F1 Fantasy App a Docker Hub
# Uso: ./docker-push.sh <tu-usuario-dockerhub>

if [ $# -eq 0 ]; then
    echo "❌ Error: Debes proporcionar tu nombre de usuario de Docker Hub"
    echo "Uso: ./docker-push.sh <tu-usuario-dockerhub>"
    exit 1
fi

DOCKERHUB_USERNAME=$1

echo "🐳 F1 Fantasy App - Push to Docker Hub"
echo "Usuario Docker Hub: $DOCKERHUB_USERNAME"
echo ""

# Verificar que Docker esté corriendo
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker no está corriendo"
    exit 1
fi

# Reconstruir las imágenes con tags específicos
echo "🔨 Reconstruyendo imágenes..."

# Backend
echo "📦 Construyendo backend..."
docker build -t "f1app-backend:latest" -t "${DOCKERHUB_USERNAME}/f1app-backend:latest" -t "${DOCKERHUB_USERNAME}/f1app-backend:v1.0" ./backend/

if [ $? -ne 0 ]; then
    echo "❌ Error construyendo backend"
    exit 1
fi

# Frontend 
echo "📦 Construyendo frontend..."
docker build -t "f1app-frontend:latest" -t "${DOCKERHUB_USERNAME}/f1app-frontend:latest" -t "${DOCKERHUB_USERNAME}/f1app-frontend:v1.0" ./frontend/

if [ $? -ne 0 ]; then
    echo "❌ Error construyendo frontend"
    exit 1
fi

# Mostrar imágenes construidas
echo "📋 Imágenes construidas:"
docker images | grep $DOCKERHUB_USERNAME

# Verificar login
echo "🔐 Verificando login en Docker Hub..."
if ! docker info 2>&1 | grep -q "Username"; then
    echo "⚠️  No estás logueado en Docker Hub"
    echo "Ejecutando docker login..."
    docker login
    if [ $? -ne 0 ]; then
        echo "❌ Error en login"
        exit 1
    fi
fi

# Push de las imágenes
echo "🚀 Haciendo push a Docker Hub..."

echo "📤 Pushing backend..."
docker push "${DOCKERHUB_USERNAME}/f1app-backend:latest"
docker push "${DOCKERHUB_USERNAME}/f1app-backend:v1.0"

echo "📤 Pushing frontend..."  
docker push "${DOCKERHUB_USERNAME}/f1app-frontend:latest"
docker push "${DOCKERHUB_USERNAME}/f1app-frontend:v1.0"

if [ $? -eq 0 ]; then
    echo "✅ ¡Push completado exitosamente!"
    echo ""
    echo "🌐 Tus imágenes están disponibles en:"
    echo "   - https://hub.docker.com/r/${DOCKERHUB_USERNAME}/f1app-backend"
    echo "   - https://hub.docker.com/r/${DOCKERHUB_USERNAME}/f1app-frontend"
    echo ""
    echo "📋 Para usar en otro lugar:"
    echo "   docker pull ${DOCKERHUB_USERNAME}/f1app-backend:latest"
    echo "   docker pull ${DOCKERHUB_USERNAME}/f1app-frontend:latest"
else
    echo "❌ Error durante el push"
    exit 1
fi 