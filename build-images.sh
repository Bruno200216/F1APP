#!/bin/bash

# Script simple para construir imágenes Docker del Frontend y Backend
# Uso: ./build-images.sh

echo "🔨 Construyendo imágenes Docker..."

# Verificar que Docker esté corriendo
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker no está corriendo. Inicia Docker y vuelve a intentar."
    exit 1
fi

echo "✅ Docker está corriendo"

# Construir imagen del Backend
echo "🔨 Construyendo imagen del Backend..."
docker build -t f1app-backend:latest ./backend/

if [ $? -eq 0 ]; then
    echo "✅ Backend construido exitosamente"
else
    echo "❌ Error construyendo Backend"
    exit 1
fi

# Construir imagen del Frontend
echo "🔨 Construyendo imagen del Frontend..."
docker build -t f1app-frontend:latest ./frontend/

if [ $? -eq 0 ]; then
    echo "✅ Frontend construido exitosamente"
else
    echo "❌ Error construyendo Frontend"
    exit 1
fi

# Mostrar imágenes creadas
echo "📋 Imágenes creadas:"
docker images | grep f1app

echo "✅ Construcción completada exitosamente!" 