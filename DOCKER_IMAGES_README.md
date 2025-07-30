# Docker Images - F1 Fantasy App

Este documento explica cómo construir y usar las imágenes de Docker para el backend y frontend de la aplicación F1 Fantasy.

## 📋 Imágenes Disponibles

- **f1app-backend**: API REST en Go
- **f1app-frontend**: Aplicación React con Nginx

## 🔨 Construir Imágenes

### Opción 1: Scripts Automatizados

#### Windows (PowerShell)
```powershell
.\build-images.ps1
```

#### Linux/Mac (Bash)
```bash
./build-images.sh
```

### Opción 2: Comandos Manuales

#### Backend
```bash
docker build -t f1app-backend:latest ./backend/
```

#### Frontend
```bash
docker build -t f1app-frontend:latest ./frontend/
```

## 🚀 Ejecutar Contenedores

### Backend
```bash
docker run -d \
  --name f1app-backend \
  -p 8080:8080 \
  -e DB_HOST=your-db-host \
  -e DB_PORT=5432 \
  -e DB_USER=your-user \
  -e DB_PASSWORD=your-password \
  -e DB_NAME=your-database \
  f1app-backend:latest
```

### Frontend
```bash
docker run -d \
  --name f1app-frontend \
  -p 80:80 \
  f1app-frontend:latest
```

## 🐳 Docker Compose

También puedes usar el archivo `docker-compose.yml` existente:

```bash
docker-compose up -d
```

## 📊 Verificar Imágenes

```bash
# Listar todas las imágenes f1app
docker images | grep f1app

# Ver detalles de una imagen específica
docker inspect f1app-backend:latest
```

## 🧹 Limpiar Imágenes

```bash
# Eliminar imágenes específicas
docker rmi f1app-backend:latest f1app-frontend:latest

# Eliminar todas las imágenes no utilizadas
docker image prune -a
```

## 🔧 Configuración de Entorno

### Variables de Entorno del Backend
- `DB_HOST`: Host de la base de datos
- `DB_PORT`: Puerto de la base de datos (default: 5432)
- `DB_USER`: Usuario de la base de datos
- `DB_PASSWORD`: Contraseña de la base de datos
- `DB_NAME`: Nombre de la base de datos
- `JWT_SECRET`: Clave secreta para JWT
- `PORT`: Puerto del servidor (default: 8080)

### Configuración del Frontend
El frontend está configurado para servir archivos estáticos a través de Nginx. La configuración se encuentra en `frontend/nginx.conf`.

## 🐛 Troubleshooting

### Problemas Comunes

1. **Error de permisos en Docker**
   - Asegúrate de que Docker Desktop esté ejecutándose
   - Verifica que tu usuario tenga permisos para Docker

2. **Error de puertos ocupados**
   - Cambia los puertos en los comandos de ejecución
   - Verifica qué servicios están usando los puertos: `netstat -an | findstr :8080`

3. **Error de conexión a la base de datos**
   - Verifica que las variables de entorno estén correctamente configuradas
   - Asegúrate de que la base de datos esté accesible desde el contenedor

### Logs de Contenedores

```bash
# Ver logs del backend
docker logs f1app-backend

# Ver logs del frontend
docker logs f1app-frontend

# Seguir logs en tiempo real
docker logs -f f1app-backend
```

## 📝 Notas Importantes

- Las imágenes están optimizadas para producción
- El backend usa multi-stage build para reducir el tamaño
- El frontend usa Nginx para servir archivos estáticos
- Las imágenes incluyen todas las dependencias necesarias

## 🔄 Actualizar Imágenes

Para actualizar las imágenes con cambios en el código:

1. Realiza los cambios en el código
2. Ejecuta el script de construcción correspondiente
3. Detén los contenedores existentes: `docker stop f1app-backend f1app-frontend`
4. Elimina los contenedores: `docker rm f1app-backend f1app-frontend`
5. Ejecuta los nuevos contenedores con las imágenes actualizadas 