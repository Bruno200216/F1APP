# 🚀 Crear Imagen Docker v2.0 - Guía Completa

## 📋 **Resumen de cambios en v2.0**

Esta nueva versión incluye **todas las correcciones críticas** para la creación de ligas:

- ✅ **PlayerByLeague**: Creación robusta con rollback automático
- ✅ **MarketItems**: Validación y conteo detallado  
- ✅ **Logs mejorados**: Seguimiento completo del proceso
- ✅ **Debug endpoint**: `/api/debug/league/:id` para diagnosticar
- ✅ **Tipos corregidos**: uint/uint64 en `/api/my-leagues`
- ✅ **RefreshMarket**: Eliminada llamada duplicada

---

## 🎯 **Opciones para Crear la Imagen**

### **🔥 Opción 1: Script Automatizado (RECOMENDADO)**

#### **Windows (PowerShell):**
```powershell
.\build-and-push-v2.ps1 tu-usuario-dockerhub
```

#### **Linux/Mac:**
```bash
./build-and-push-v2.sh tu-usuario-dockerhub
```

**✅ Ventajas:**
- Proceso completamente automatizado
- Verificaciones de seguridad incluidas
- Logs detallados y coloridos
- Manejo de errores robusto
- Opción interactiva para confirmar push

---

### **🔧 Opción 2: Comandos Manuales**

Si prefieres control total, sigue los comandos en `comandos-docker-v2.md`:

```bash
# 1. Login
docker login

# 2. Construir backend
docker build -t tu-usuario/f1app-backend:v2.0 ./backend/

# 3. Construir frontend  
docker build -t tu-usuario/f1app-frontend:v2.0 ./frontend/

# 4. Push
docker push tu-usuario/f1app-backend:v2.0
docker push tu-usuario/f1app-frontend:v2.0
```

---

### **🐳 Opción 3: Docker Compose (Local)**

Para desarrollo y pruebas locales:

```bash
# Construir y ejecutar todo
docker-compose up --build -d

# Ver logs
docker-compose logs -f backend
```

---

## 📁 **Archivos Creados**

| Archivo | Descripción | Uso |
|---------|-------------|-----|
| `build-and-push-v2.ps1` | Script Windows automatizado | Windows PowerShell |
| `build-and-push-v2.sh` | Script Linux/Mac automatizado | Linux/Mac Terminal |
| `comandos-docker-v2.md` | Guía manual paso a paso | Referencia/Manual |
| `mejoras-creacion-ligas.md` | Documentación de cambios | Información técnica |

---

## 🚀 **Pasos Rápidos para Empezar**

### **1. Preparación**
```bash
# Verificar Docker
docker --version
docker info

# Login en Docker Hub (si no lo has hecho)
docker login
```

### **2. Ejecución (elige una):**

**Automático (Windows):**
```powershell
.\build-and-push-v2.ps1 tu-usuario-dockerhub
```

**Automático (Linux/Mac):**
```bash
./build-and-push-v2.sh tu-usuario-dockerhub
```

### **3. Verificación**
```bash
# Ver imágenes creadas
docker images | grep f1app

# Verificar en Docker Hub
# https://hub.docker.com/r/tu-usuario-dockerhub/f1app-backend
```

---

## 🌐 **Deploy en Producción**

### **1. Actualizar servidor**
```bash
# En tu servidor de producción
docker pull tu-usuario-dockerhub/f1app-backend:v2.0
docker pull tu-usuario-dockerhub/f1app-frontend:v2.0
```

### **2. Aplicar migración SQL**
```bash
# Ejecutar la migración para is_in_market
mysql -u user -p database < fix-production-issues.sql
```

### **3. Actualizar docker-compose.prod.yml**
```yaml
services:
  backend:
    image: tu-usuario-dockerhub/f1app-backend:v2.0
  frontend:
    image: tu-usuario-dockerhub/f1app-frontend:v2.0
```

### **4. Reiniciar servicios**
```bash
docker-compose down
docker-compose up -d
```

### **5. Verificar funcionamiento**
```bash
# Probar API
curl http://tu-servidor:8080/

# Probar debug endpoint  
curl http://tu-servidor:8080/api/debug/users

# Ver logs
docker-compose logs backend | tail -50
```

---

## 🔍 **Debugging y Troubleshooting**

### **Si algo no funciona:**

1. **Verificar logs de construcción:**
   ```bash
   docker build --no-cache ./backend/
   ```

2. **Verificar conectividad:**
   ```bash
   docker run --rm tu-usuario/f1app-backend:v2.0 ping google.com
   ```

3. **Probar localmente:**
   ```bash
   docker-compose up
   # Ir a http://localhost:3000
   ```

4. **Usar endpoint debug:**
   ```bash
   curl http://localhost:8080/api/debug/users
   curl http://localhost:8080/api/debug/league/1
   ```

---

## 📞 **¿Necesitas Ayuda?**

1. **Revisa los logs** del script de build
2. **Verifica** que Docker esté corriendo
3. **Confirma** que tienes permisos en Docker Hub
4. **Prueba** la construcción manual paso a paso
5. **Usa** los endpoints de debug para diagnosticar

---

## 🎉 **¡Listo!**

Una vez que completes cualquiera de las opciones, tendrás:

- ✅ **Imagen v2.0** con todas las correcciones
- ✅ **Backend robusto** que crea ligas correctamente  
- ✅ **Mercado funcional** que se llena apropiadamente
- ✅ **Logs detallados** para debugging
- ✅ **Herramientas de diagnóstico** incluidas

**¡La imagen está lista para usar en producción! 🚀** 