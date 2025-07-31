#!/bin/bash

# =====================================================
# SCRIPT PARA AÑADIR GRAN PREMIO DE HUNGRÍA
# =====================================================

echo "Añadiendo Gran Premio de Hungría a la base de datos..."

# Configuración de la base de datos
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="f1fantasy"
DB_USER="root"
DB_PASS="password"

# Ejecutar el script SQL
if mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME -e "source add_hungary_gp.sql"; then
    echo "✅ Gran Premio de Hungría añadido correctamente"
    echo "📅 Fecha: 2 de Agosto de 2025"
    echo "🏁 Circuito: Hungaroring"
    echo "🇭🇺 País: Hungary"
else
    echo "❌ Error al añadir el Gran Premio de Hungría"
    echo "Asegúrate de que MySQL esté ejecutándose y las credenciales sean correctas"
fi

echo ""
read -p "Presiona Enter para continuar..." 