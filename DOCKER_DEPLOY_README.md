# 🐳 Docker Deploy - F1 Fantasy App

Guía para construir y subir las imágenes de Docker de la aplicación F1 Fantasy.

## 📋 Scripts Disponibles

### 🚀 Deploy Rápido (Recomendado)
```powershell
# Windows PowerShell
.\quick-deploy.ps1 <tu-usuario-dockerhub>
```

### 🔧 Deploy Completo con Confirmación
```powershell
# Windows PowerShell
.\build-and-push-v3.ps1 <tu-usuario-dockerhub>
```

```bash
# Linux/Mac
./build-and-push-v3.sh <tu-usuario-dockerhub>
```

## 🎯 Versión Actual: v3.0

### ✨ Cambios Incluidos
- ✅ Sistema de ofertas FIA mejorado
- ✅ Correcciones de base de datos y migraciones
- ✅ Optimizaciones de rendimiento
- ✅ Mejoras en la interfaz de usuario
- ✅ Corrección de bugs en el sistema de ligas
- ✅ Actualización de dependencias
- ✅ Mejoras en el sistema de autenticación

## 🛠️ Requisitos Previos

1. **Docker Desktop** instalado y corriendo
2. **Cuenta en Docker Hub** con acceso para subir imágenes
3. **Login en Docker Hub** (se solicitará automáticamente)

## 📦 Imágenes que se Construyen

### Backend (Go)
- **Imagen**: `f1app-backend:v3.0`
- **Puerto**: 8080
- **Base**: Alpine Linux
- **Características**: API REST, conexión a MySQL

### Frontend (React + Nginx)
- **Imagen**: `f1app-frontend:v3.0`
- **Puerto**: 80
- **Base**: Nginx Alpine
- **Características**: SPA React, configuración optimizada

## 🚀 Comandos de Uso

### 1. Deploy Rápido (Automático)
```powershell
.\quick-deploy.ps1 bruno200216
```

### 2. Deploy con Confirmación
```powershell
.\build-and-push-v3.ps1 bruno200216
```

### 3. Verificar Imágenes Locales
```powershell
docker images | findstr "f1app"
```

### 4. Probar Localmente
```powershell
docker-compose up -d
```

## 🌐 URLs de Docker Hub

Después del deploy, las imágenes estarán disponibles en:
- **Backend**: https://hub.docker.com/r/bruno200216/f1app-backend
- **Frontend**: https://hub.docker.com/r/bruno200216/f1app-frontend

## 📋 Comandos de Producción

### Descargar Imágenes
```bash
docker pull bruno200216/f1app-backend:v3.0
docker pull bruno200216/f1app-frontend:v3.0
```

### Ejecutar en Producción
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 Troubleshooting

### Error: Docker no está corriendo
```powershell
# Iniciar Docker Desktop
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### Error: Login requerido
```powershell
docker login
# Ingresa tu usuario y contraseña de Docker Hub
```

### Error: Permisos de PowerShell
```powershell
# Ejecutar PowerShell como Administrador
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Limpiar Imágenes Antiguas
```powershell
docker image prune -f
docker system prune -f
```

## 📊 Monitoreo

### Ver Logs
```powershell
# Backend
docker logs f1app-backend

# Frontend
docker logs f1app-frontend
```

### Ver Estado de Contenedores
```powershell
docker ps
```

## 🔄 Actualización de Versiones

Para crear una nueva versión:

1. Actualizar el código
2. Cambiar `$VERSION` en los scripts
3. Ejecutar el deploy
4. Actualizar `docker-compose.prod.yml` si es necesario

## 📞 Soporte

Si encuentras problemas:
1. Verifica que Docker esté corriendo
2. Asegúrate de estar logueado en Docker Hub
3. Revisa los logs de construcción
4. Verifica la conectividad a internet

---

**Nota**: Los scripts están optimizados para Windows PowerShell, pero también funcionan en Linux/Mac con bash. 