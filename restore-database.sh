#!/bin/bash

echo "🔄 Restaurando base de datos F1 Fantasy..."

# Variables
DB_NAME="f1fantasy"
DB_USER="f1user"
DB_PASSWORD="f1password"
DB_ROOT_PASSWORD="rootpassword"

# Crear contenedor de base de datos
echo "📦 Creando contenedor de base de datos..."
docker run -d \
  --name f1app-database \
  --network f1app-network \
  -e MYSQL_ROOT_PASSWORD=$DB_ROOT_PASSWORD \
  -e MYSQL_DATABASE=$DB_NAME \
  -e MYSQL_USER=$DB_USER \
  -e MYSQL_PASSWORD=$DB_PASSWORD \
  -p 3306:3306 \
  mysql:8.0

echo "⏳ Esperando que MySQL esté listo..."
sleep 30

# Verificar que MySQL esté corriendo
echo "🔍 Verificando conexión a MySQL..."
docker exec f1app-database mysqladmin ping -h localhost -u root -p$DB_ROOT_PASSWORD

if [ $? -eq 0 ]; then
    echo "✅ MySQL está funcionando correctamente"
else
    echo "❌ Error: MySQL no está respondiendo"
    exit 1
fi

# Crear las tablas básicas
echo "🗄️ Creando estructura de base de datos..."

# Copiar archivos SQL al contenedor
docker cp init.sql f1app-database:/tmp/
docker cp database-migration-complete.sql f1app-database:/tmp/
docker cp complete_setup_2025.sql f1app-database:/tmp/

# Ejecutar scripts SQL
echo "📝 Ejecutando scripts de inicialización..."
docker exec f1app-database mysql -u root -p$DB_ROOT_PASSWORD $DB_NAME < init.sql
docker exec f1app-database mysql -u root -p$DB_ROOT_PASSWORD $DB_NAME < database-migration-complete.sql
docker exec f1app-database mysql -u root -p$DB_ROOT_PASSWORD $DB_NAME < complete_setup_2025.sql

echo "✅ Base de datos restaurada exitosamente!"

# Verificar tablas creadas
echo "📋 Tablas en la base de datos:"
docker exec f1app-database mysql -u root -p$DB_ROOT_PASSWORD -e "USE $DB_NAME; SHOW TABLES;"

echo ""
echo "🎉 ¡Base de datos restaurada!"
echo "📊 Para verificar:"
echo "   docker exec -it f1app-database mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME"
echo ""
echo "🚀 Ahora puedes levantar la aplicación:"
echo "   docker-compose -f docker-compose.prod.yml up -d" 