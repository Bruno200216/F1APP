# 🚀 Cómo ejecutar el Backend de F1 Fantasy App

## 📋 Prerrequisitos

- Go 1.19 o superior
- MySQL/MariaDB
- Variables de entorno configuradas (ver `.env.example`)

## 🛠️ Configuración

1. **Variables de entorno**: Copia el archivo `env.example` a `.env` y configura tus variables:

```bash
cp env.example .env
```

2. **Base de datos**: Asegúrate de que tu base de datos MySQL esté ejecutándose y accesible.

## 🚀 Ejecutar el Backend

### Opción 1: Script de PowerShell (Recomendado)

```powershell
# Ejecutar en modo producción
.\run-backend.ps1

# Ejecutar en modo desarrollo (con hot reload)
.\run-dev.ps1
```

### Opción 2: Comandos manuales

```bash
# Compilar y ejecutar
go build -o main.exe .
./main.exe

# O directamente con go run
go run .
```

### Opción 3: Modo desarrollo con hot reload

```bash
# Instalar air (solo la primera vez)
go install github.com/cosmtrek/air@latest

# Ejecutar con hot reload
air
```

## 📡 Endpoints disponibles

Una vez ejecutado, el servidor estará disponible en:

- **API**: http://localhost:8080
- **Health Check**: http://localhost:8080/
- **API Docs**: http://localhost:8080/api/docs (si está configurado)

## 🔧 Solución de problemas

### Error: "main redeclared in this block"

Este error ocurre cuando hay múltiples archivos con función `main()` en el mismo paquete. Los archivos de prueba han sido movidos a la carpeta `tests/` para evitar conflictos.

### Error de conexión a la base de datos

1. Verifica que MySQL esté ejecutándose
2. Confirma que las variables de entorno estén correctas
3. Asegúrate de que la base de datos exista

### Error de compilación

```bash
# Limpiar cache de Go
go clean -cache

# Verificar dependencias
go mod tidy
```

## 📁 Estructura del proyecto

```
backend/
├── main.go              # Archivo principal
├── run-backend.ps1      # Script de ejecución
├── run-dev.ps1          # Script de desarrollo
├── tests/               # Archivos de prueba
├── models/              # Modelos de datos
├── database/            # Configuración de BD
└── migrations/          # Migraciones de BD
```

## 🐳 Docker (Opcional)

Si prefieres usar Docker:

```bash
# Construir imagen
docker build -t f1-fantasy-backend .

# Ejecutar contenedor
docker run -p 8080:8080 f1-fantasy-backend
```

## 📝 Logs

Los logs se muestran en la consola. Para desarrollo, puedes usar:

```bash
# Ver logs en tiempo real
Get-Content -Path "build-errors.log" -Wait
``` 