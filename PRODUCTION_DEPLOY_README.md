# 🚀 Despliegue a Producción - F1 Fantasy App

Este documento explica cómo desplegar las aplicaciones (backend y frontend) a producción **sin tocar la base de datos**.

## 📋 Requisitos Previos

### En tu máquina local:
- Docker instalado y funcionando
- SSH configurado para acceder al servidor
- Imágenes Docker construidas localmente

### En el servidor de producción:
- Docker instalado
- Docker Compose instalado
- Puerto 80 y 8080 disponibles
- Base de datos MySQL funcionando

## 🔨 Paso 1: Construir Imágenes

Primero, construye las imágenes Docker localmente:

```bash
# Windows
.\build-images.ps1

# Linux/Mac
./build-images.sh
```

## 🚀 Paso 2: Desplegar a Producción

### Opción A: Despliegue Automático (Recomendado)

```bash
# Configurar variables de entorno
export REMOTE_USER=tu-usuario
export REMOTE_PATH=/opt/f1app

# Ejecutar despliegue
./deploy-to-production.sh tu-servidor.com
```

### Opción B: Despliegue Manual

#### 1. Crear archivos de configuración

```bash
# Crear docker-compose para producción
cat > docker-compose.prod-apps.yml << 'EOF'
services:
  backend:
    image: f1app-backend:latest
    container_name: f1app-backend
    restart: unless-stopped
    environment:
      DB_HOST: ${DB_HOST:-localhost}
      DB_PORT: ${DB_PORT:-3306}
      DB_USER: ${DB_USER:-f1user}
      DB_PASSWORD: ${DB_PASSWORD:-f1password}
      DB_NAME: ${DB_NAME:-f1fantasy}
      PORT: 8080
    ports:
      - "8080:8080"
    networks:
      - f1app-network

  frontend:
    image: f1app-frontend:latest
    container_name: f1app-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - f1app-network

networks:
  f1app-network:
    driver: bridge
EOF
```

#### 2. Guardar imágenes como archivos tar

```bash
docker save f1app-backend:latest -o f1app-backend.tar
docker save f1app-frontend:latest -o f1app-frontend.tar
```

#### 3. Subir archivos al servidor

```bash
# Crear directorio en servidor
ssh usuario@servidor "mkdir -p /opt/f1app"

# Subir archivos
scp docker-compose.prod-apps.yml usuario@servidor:/opt/f1app/
scp f1app-backend.tar usuario@servidor:/opt/f1app/
scp f1app-frontend.tar usuario@servidor:/opt/f1app/
scp env.production usuario@servidor:/opt/f1app/.env
```

#### 4. Ejecutar en el servidor

```bash
# Conectar al servidor
ssh usuario@servidor

# Navegar al directorio
cd /opt/f1app

# Cargar imágenes
docker load -i f1app-backend.tar
docker load -i f1app-frontend.tar

# Desplegar
docker-compose -f docker-compose.prod-apps.yml up -d
```

## 🔧 Configuración de Variables de Entorno

Crea un archivo `.env` en el servidor con la configuración de tu base de datos:

```bash
# Configuración de Base de Datos
DB_HOST=tu-host-bd
DB_PORT=3306
DB_NAME=f1fantasy
DB_USER=f1user
DB_PASSWORD=tu-password

# Puerto del backend
BACKEND_PORT=8080
```

## 📊 Verificar Despliegue

### Verificar contenedores
```bash
docker-compose -f docker-compose.prod-apps.yml ps
```

### Verificar logs
```bash
# Logs del backend
docker logs f1app-backend

# Logs del frontend
docker logs f1app-frontend

# Logs en tiempo real
docker-compose -f docker-compose.prod-apps.yml logs -f
```

### Verificar conectividad
```bash
# Backend
curl http://localhost:8080/health

# Frontend
curl http://localhost
```

## 🛠️ Comandos Útiles

### Parar aplicaciones
```bash
docker-compose -f docker-compose.prod-apps.yml down
```

### Reiniciar aplicaciones
```bash
docker-compose -f docker-compose.prod-apps.yml restart
```

### Actualizar aplicaciones
```bash
# 1. Construir nuevas imágenes localmente
./build-images.sh

# 2. Subir nuevas imágenes al servidor
./deploy-to-production.sh tu-servidor.com
```

## 🐛 Troubleshooting

### Problemas Comunes

1. **Error de conexión a la base de datos**
   ```bash
   # Verificar que la BD esté accesible
   docker exec f1app-backend ping tu-host-bd
   
   # Verificar variables de entorno
   docker exec f1app-backend env | grep DB
   ```

2. **Puertos ocupados**
   ```bash
   # Verificar puertos en uso
   netstat -tulpn | grep :80
   netstat -tulpn | grep :8080
   
   # Cambiar puertos en docker-compose si es necesario
   ```

3. **Contenedores no inician**
   ```bash
   # Ver logs detallados
   docker-compose -f docker-compose.prod-apps.yml logs
   
   # Verificar recursos del sistema
   docker system df
   ```

### Logs de Debug

```bash
# Logs del backend con timestamps
docker logs --timestamps f1app-backend

# Logs del frontend con timestamps
docker logs --timestamps f1app-frontend

# Logs de Docker Compose
docker-compose -f docker-compose.prod-apps.yml logs --timestamps
```

## 🔄 Actualización Continua

Para actualizar las aplicaciones sin interrumpir el servicio:

```bash
# 1. Construir nuevas imágenes
./build-images.sh

# 2. Desplegar con zero-downtime
./deploy-to-production.sh tu-servidor.com
```

## 📝 Notas Importantes

- ✅ **No toca la base de datos**: Solo actualiza las aplicaciones
- ✅ **Zero-downtime**: Las aplicaciones se actualizan sin interrumpir el servicio
- ✅ **Rollback fácil**: Puedes volver a versiones anteriores fácilmente
- ✅ **Health checks**: Los contenedores verifican su salud automáticamente
- ✅ **Logs centralizados**: Fácil monitoreo y debugging

## 🆘 Soporte

Si tienes problemas:

1. Verifica los logs: `docker-compose -f docker-compose.prod-apps.yml logs`
2. Verifica el estado: `docker-compose -f docker-compose.prod-apps.yml ps`
3. Verifica recursos: `docker system df`
4. Reinicia si es necesario: `docker-compose -f docker-compose.prod-apps.yml restart` 