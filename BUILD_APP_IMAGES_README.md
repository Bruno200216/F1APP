# 🚀 F1 Fantasy App - Build Images (Solo Aplicaciones)

Este directorio contiene scripts para construir las imágenes Docker del **Frontend** y **Backend** de la aplicación F1 Fantasy **sin tocar la base de datos**.

## 📋 Características

- ✅ Construye imágenes Docker del Frontend (React) y Backend (Go)
- ✅ **No incluye la base de datos** - Solo aplicaciones
- ✅ Crea un `docker-compose.app.yml` para ejecutar solo las apps
- ✅ Opción de push a Docker Hub
- ✅ Scripts para Windows (PowerShell) y Linux/Mac (Bash)
- ✅ Verificaciones automáticas de dependencias
- ✅ Output colorido y informativo

## 🛠️ Requisitos

- Docker Desktop instalado y corriendo
- Git (opcional, para versionado)
- Acceso a internet para descargar dependencias

## 📁 Estructura de archivos

```
F1APP/
├── build-app-images.sh          # Script para Linux/Mac
├── build-app-images.ps1         # Script para Windows
├── docker-compose.app.yml       # Generado automáticamente
└── BUILD_APP_IMAGES_README.md   # Este archivo
```

## 🚀 Uso

### Windows (PowerShell)

```powershell
# Construir solo las imágenes (sin push)
.\build-app-images.ps1

# Construir y hacer push a Docker Hub
.\build-app-images.ps1 "tu-usuario-dockerhub"
```

### Linux/Mac (Bash)

```bash
# Hacer ejecutable (solo la primera vez)
chmod +x build-app-images.sh

# Construir solo las imágenes (sin push)
./build-app-images.sh

# Construir y hacer push a Docker Hub
./build-app-images.sh tu-usuario-dockerhub
```

## 📦 Imágenes generadas

El script construirá las siguientes imágenes:

- `f1app-backend:latest` - API en Go
- `f1app-frontend:latest` - Aplicación React con Nginx

## 🐳 Ejecutar las aplicaciones

### Solo aplicaciones (sin base de datos)

```bash
# Ejecutar
docker-compose -f docker-compose.app.yml up -d

# Ver logs
docker-compose -f docker-compose.app.yml logs -f

# Parar
docker-compose -f docker-compose.app.yml down
```

### Con base de datos completa

```bash
# Ejecutar todo (incluyendo BD)
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar todo
docker-compose down
```

## 🔧 Configuración de base de datos

Si ejecutas solo las aplicaciones, necesitarás configurar las variables de entorno para conectar a tu base de datos:

```bash
# Variables de entorno para conectar a BD externa
export DB_HOST=tu-servidor-bd
export DB_PORT=3306
export DB_USER=tu-usuario
export DB_PASSWORD=tu-password
export DB_NAME=f1fantasy
```

## 📊 Comandos útiles

### Verificar imágenes construidas
```bash
docker images | grep f1app
```

### Ver logs de contenedores
```bash
# Backend
docker logs f1app-backend

# Frontend
docker logs f1app-frontend
```

### Acceder a contenedores
```bash
# Backend
docker exec -it f1app-backend sh

# Frontend
docker exec -it f1app-frontend sh
```

### Limpiar imágenes
```bash
# Eliminar imágenes específicas
docker rmi f1app-backend:latest f1app-frontend:latest

# Limpiar imágenes no utilizadas
docker image prune -f
```

## 🔄 Push a Docker Hub

Si quieres subir las imágenes a Docker Hub:

1. **Login en Docker Hub:**
   ```bash
   docker login
   ```

2. **Ejecutar script con tu usuario:**
   ```bash
   ./build-app-images.sh tu-usuario-dockerhub
   ```

3. **Las imágenes estarán disponibles en:**
   - `https://hub.docker.com/r/tu-usuario/f1app-backend`
   - `https://hub.docker.com/r/tu-usuario/f1app-frontend`

## 🐛 Solución de problemas

### Error: "Docker no está corriendo"
- Inicia Docker Desktop
- Verifica que Docker esté funcionando con `docker info`

### Error: "Directorio ./backend no encontrado"
- Asegúrate de estar en el directorio raíz del proyecto
- Verifica que existan los directorios `./backend` y `./frontend`

### Error: "Dockerfile no encontrado"
- Verifica que existan los archivos `./backend/Dockerfile` y `./frontend/Dockerfile`

### Error de permisos en Linux/Mac
```bash
chmod +x build-app-images.sh
```

### Error de ejecución de scripts en Windows
```powershell
# Cambiar política de ejecución
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📝 Notas importantes

- ⚠️ **Las aplicaciones necesitan una base de datos MySQL** para funcionar
- 🔧 **Configura las variables de entorno** si usas una BD externa
- 📦 **Las imágenes se construyen localmente** por defecto
- 🚀 **El push a Docker Hub es opcional**
- 🔄 **Usa `docker-compose.app.yml`** para ejecutar solo las apps

## 🎯 Casos de uso

### Desarrollo local
```bash
# Construir imágenes
./build-app-images.sh

# Ejecutar con BD local
docker-compose up -d
```

### Producción con BD externa
```bash
# Construir imágenes
./build-app-images.sh

# Configurar variables de entorno
export DB_HOST=tu-servidor-produccion

# Ejecutar solo apps
docker-compose -f docker-compose.app.yml up -d
```

### CI/CD Pipeline
```bash
# Construir y push automático
./build-app-images.sh "tu-usuario-dockerhub"
```

---

**¡Listo!** 🎉 Ahora puedes construir las imágenes Docker del Frontend y Backend sin tocar la base de datos. 