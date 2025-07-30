# 🚀 Instrucciones de Despliegue Manual

## ✅ Archivos Preparados

Ya tienes estos archivos listos:
- ✅ `f1app-backend.tar` - Imagen del backend
- ✅ `f1app-frontend.tar` - Imagen del frontend  
- ✅ `docker-compose.prod-apps.yml` - Configuración de Docker Compose
- ✅ `env.production` - Variables de entorno

## 📋 Pasos para Desplegar

### 1. Conectar al servidor
```bash
ssh bruno200216@www.f1tasy.com
```

### 2. Crear directorio en el servidor
```bash
mkdir -p /opt/f1app
cd /opt/f1app
```

### 3. Subir archivos desde tu máquina local
```bash
# Desde tu máquina local (PowerShell)
scp docker-compose.prod-apps.yml bruno200216@www.f1tasy.com:/opt/f1app/
scp f1app-backend.tar bruno200216@www.f1tasy.com:/opt/f1app/
scp f1app-frontend.tar bruno200216@www.f1tasy.com:/opt/f1app/
scp env.production bruno200216@www.f1tasy.com:/opt/f1app/.env
```

### 4. En el servidor, cargar las imágenes
```bash
# En el servidor
cd /opt/f1app
docker load -i f1app-backend.tar
docker load -i f1app-frontend.tar
```

### 5. Desplegar las aplicaciones
```bash
# Parar contenedores existentes (si los hay)
docker-compose -f docker-compose.prod-apps.yml down

# Eliminar imágenes antiguas
docker rmi f1app-backend:latest f1app-frontend:latest 2>/dev/null || true

# Desplegar nuevas aplicaciones
docker-compose -f docker-compose.prod-apps.yml up -d
```

### 6. Verificar el despliegue
```bash
# Ver estado de contenedores
docker-compose -f docker-compose.prod-apps.yml ps

# Ver logs
docker-compose -f docker-compose.prod-apps.yml logs -f
```

## 🔧 Comandos Útiles

### Verificar estado
```bash
docker-compose -f docker-compose.prod-apps.yml ps
```

### Ver logs
```bash
# Logs del backend
docker logs f1app-backend

# Logs del frontend  
docker logs f1app-frontend

# Logs en tiempo real
docker-compose -f docker-compose.prod-apps.yml logs -f
```

### Reiniciar aplicaciones
```bash
docker-compose -f docker-compose.prod-apps.yml restart
```

### Parar aplicaciones
```bash
docker-compose -f docker-compose.prod-apps.yml down
```

## 🌐 URLs de Acceso

Una vez desplegado, tu aplicación estará disponible en:
- **Frontend**: http://www.f1tasy.com
- **Backend**: http://www.f1tasy.com:8080

## ⚠️ Importante

- ✅ **NO toca la base de datos** - Solo actualiza el código
- ✅ **NO borra datos** - Mantiene todos los usuarios y ligas
- ✅ **Zero-downtime** - Actualización sin interrumpir el servicio

## 🆘 Si hay problemas

1. **Verificar conexión a la base de datos**:
   ```bash
   docker exec f1app-backend env | grep DB
   ```

2. **Verificar logs de error**:
   ```bash
   docker-compose -f docker-compose.prod-apps.yml logs
   ```

3. **Reiniciar si es necesario**:
   ```bash
   docker-compose -f docker-compose.prod-apps.yml restart
   ```

## 🎉 ¡Listo!

Una vez completados estos pasos, tu aplicación estará actualizada con el código más reciente sin tocar ningún dato existente. 