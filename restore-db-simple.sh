#!/bin/bash

echo "Restaurando base de datos F1 Fantasy..."

# Crear red si no existe
docker network create f1app-network 2>/dev/null || true

# Crear contenedor de base de datos
echo "Creando contenedor de base de datos..."
docker run -d \
  --name f1app-database \
  --network f1app-network \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=f1fantasy \
  -e MYSQL_USER=f1user \
  -e MYSQL_PASSWORD=f1password \
  -p 3306:3306 \
  mysql:8.0

echo "Esperando que MySQL esté listo..."
sleep 30

# Verificar conexión
echo "Verificando MySQL..."
docker exec f1app-database mysqladmin ping -h localhost -u root -prootpassword

if [ $? -eq 0 ]; then
    echo "MySQL está funcionando"
else
    echo "Error: MySQL no responde"
    exit 1
fi

echo "Base de datos creada exitosamente!"
echo ""
echo "Ahora puedes levantar la aplicación:"
echo "docker-compose -f docker-compose.prod.yml up -d" 