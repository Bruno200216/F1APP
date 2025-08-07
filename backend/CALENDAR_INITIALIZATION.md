# Inicialización Automática del Calendario F1

## Descripción

El backend ahora incluye una función de inicialización automática del calendario F1 que se ejecuta al iniciar la aplicación. Esta función extrae los datos del calendario F1 2025 desde Marca.com y los inserta en la tabla `f1_grand_prixes`.

## Funcionamiento

### Cuándo se ejecuta
- **Solo una vez**: La función verifica si ya hay datos en la tabla `f1_grand_prixes`
- **Al iniciar el backend**: Se ejecuta después de `database.SeedDatabase()`
- **Automáticamente**: No requiere intervención manual

### Datos extraídos
- **24 Grand Prix** del calendario F1 2025
- **Fechas de carrera** y **fechas de inicio** (start_date)
- **Información de circuitos** y países
- **Banderas** correspondientes a cada país
- **Diferenciación Sprint/No Sprint**

### Lógica de fechas start_date

#### GPs con Sprint (5 en 2025)
- **start_date**: 2 días antes de la carrera
- **Motivo**: Practice 1 (viernes) es la sesión que cuenta para alineaciones
- **GPs**: China, Bélgica, Azerbaiyán, Brasil, Qatar

#### GPs sin Sprint (19 en 2025)
- **start_date**: 1 día antes de la carrera
- **Motivo**: Practice 3 (sábado) es la sesión que cuenta para alineaciones
- **GPs**: Todos los demás

## Datos incluidos

```go
calendarData := []struct {
    Name      string
    Date      string
    StartDate string
    Circuit   string
    Country   string
    Flag      string
    HasSprint bool
}{
    {"Australian Grand Prix", "2025-03-16", "2025-03-14 04:30:00", "Albert Park", "Australia", "Australia_flag.png", false},
    {"Chinese Grand Prix", "2025-03-23", "2025-03-21 04:30:00", "Shanghai", "China", "China_flag.png", true},
    // ... 22 GPs más
}
```

## Verificación

### Script de verificación
```bash
# Ejecutar después de iniciar el backend
.\verify_calendar.ps1
```

### Consultas SQL útiles
```sql
-- Verificar total de GPs
SELECT COUNT(*) FROM f1_grand_prixes;

-- Verificar GPs con Sprint
SELECT name, DATEDIFF(date, start_date) as days_before 
FROM f1_grand_prixes 
WHERE DATEDIFF(date, start_date) = 2;

-- Verificar GPs sin Sprint
SELECT name, DATEDIFF(date, start_date) as days_before 
FROM f1_grand_prixes 
WHERE DATEDIFF(date, start_date) = 1;
```

## Logs de inicialización

Al iniciar el backend, verás logs como:
```
🏁 Inicializando calendario F1 desde Marca.com...
✅ Insertado: Australian Grand Prix (GP 1) - Sprint: No
✅ Insertado: Chinese Grand Prix (GP 2) - Sprint: Sí
...
🎉 Calendario F1 inicializado con 24 Grand Prix
```

O si ya está poblado:
```
📅 Calendario F1 ya está poblado, saltando inicialización
```

## Ventajas

1. **Automático**: No requiere intervención manual
2. **Una sola vez**: No se repite si ya hay datos
3. **Completo**: Incluye todos los GPs de 2025
4. **Correcto**: Diferenciación Sprint/No Sprint
5. **Consistente**: Fechas start_date correctas para alineaciones

## Notas técnicas

- **Horario**: Las fechas se convierten al horario de España (Europe/Madrid)
- **Formato**: start_date incluye hora (04:30:00) para mayor precisión
- **Validación**: Verifica existencia antes de insertar
- **Logging**: Proporciona logs detallados del proceso 