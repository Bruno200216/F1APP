#!/bin/bash

# =====================================================
# SCRIPT: Ejecutar migración finish_cars
# =====================================================

echo "🚀 Ejecutando migración para añadir columna finish_cars..."

# Ejecutar la migración SQL
if mysql -u root -p -e "source add_finish_cars_column.sql;"; then
    echo "✅ Migración completada exitosamente"
    echo "📊 La columna finish_cars ha sido añadida a la tabla team_races"
    echo "🎯 Ahora puedes usar el campo en Admin Scores para registrar cuántos coches acabaron la carrera"
else
    echo "❌ Error ejecutando la migración"
    echo "💡 Asegúrate de tener MySQL instalado y configurado correctamente"
    exit 1
fi

echo ""
echo "📋 Resumen de cambios:"
echo "• Nueva columna: finish_cars (TINYINT, DEFAULT 0)"
echo "• Valores posibles: 0, 1, 2 coches acabaron la carrera"
echo "• Modelo GORM actualizado en backend/models/models.go"
echo "• Endpoint actualizado en backend/main.go"
echo "• Frontend actualizado en AdminScoresPage.jsx" 