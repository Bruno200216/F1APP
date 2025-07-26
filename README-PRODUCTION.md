# 🏎️ F1 Fantasy App - Guía de Producción

Esta guía te ayudará a compilar las imágenes de Docker y configurar la base de datos para producción.

## 📋 Prerrequisitos

- Docker Desktop instalado y corriendo
- MySQL instalado (para comandos de base de datos)
- Git (para clonar el repositorio)

## 🐳 Compilación de Imágenes Docker

### Opción 1: Script Bash (Linux/macOS/WSL)

```bash
# Dar permisos de ejecución (solo en Linux/macOS)
chmod +x build-production.sh

# Ejecutar el script de compilación
./build-production.sh

# O especificar tu usuario de Docker Hub
DOCKERHUB_USERNAME=tuusuario ./build-production.sh
```

### Opción 2: Script PowerShell (Windows)

```powershell
# Ejecutar el script de compilación
.\build-production.ps1

# O especificar parámetros
.\build-production.ps1 -DockerHubUsername "tuusuario" -Version "v2.0"
```

### Opción 3: Comandos Manuales

```bash
# Compilar Backend
cd backend
docker build -t tuusuario/f1app-backend:v2.0 .
docker build -t tuusuario/f1app-backend:latest .
cd ..

# Compilar Frontend
cd frontend
docker build -t tuusuario/f1app-frontend:v2.0 .
docker build -t tuusuario/f1app-frontend:latest .
cd ..
```

## 📤 Subir a Docker Hub

```bash
# Login a Docker Hub
docker login

# Subir imágenes
docker push tuusuario/f1app-backend:v2.0
docker push tuusuario/f1app-backend:latest
docker push tuusuario/f1app-frontend:v2.0
docker push tuusuario/f1app-frontend:latest
```

## 🗄️ Configuración de Base de Datos

### Scripts Automatizados

#### Opción 1: Bash (Linux/macOS/WSL)

```bash
# Dar permisos de ejecución
chmod +x database-commands.sh

# Verificar conexión
./database-commands.sh check

# Ejecutar migración completa
./database-commands.sh migrate

# Verificar estado
./database-commands.sh status

# Crear backup
./database-commands.sh backup

# Restaurar backup
./database-commands.sh restore f1fantasy_backup_20241201_143022.sql
```

#### Opción 2: PowerShell (Windows)

```powershell
# Verificar conexión
.\database-commands.ps1 check

# Ejecutar migración completa
.\database-commands.ps1 migrate

# Verificar estado
.\database-commands.ps1 status

# Crear backup
.\database-commands.ps1 backup

# Restaurar backup
.\database-commands.ps1 restore f1fantasy_backup_20241201_143022.sql
```

### Comandos Manuales

```bash
# Configurar variables de entorno
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=f1user
export DB_PASSWORD=f1password
export DB_NAME=f1fantasy

# Ejecutar migración completa
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD < database-migration-complete.sql

# Verificar tablas creadas
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SHOW TABLES;"
```

## 🚀 Despliegue en Producción

### 1. Configurar Variables de Entorno

Crea un archivo `.env` en el directorio raíz:

```env
# Base de datos
DB_ROOT_PASSWORD=tu_password_root
DB_NAME=f1fantasy
DB_USER=f1user
DB_PASSWORD=tu_password_seguro

# Docker Hub
DOCKERHUB_USERNAME=tuusuario

# Puerto del backend (opcional)
BACKEND_PORT=8080
```

### 2. Desplegar con Docker Compose

```bash
# Desplegar en producción
docker-compose -f docker-compose.prod.yml up -d

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Parar servicios
docker-compose -f docker-compose.prod.yml down

# Reconstruir y desplegar
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. Verificar el Despliegue

```bash
# Verificar contenedores corriendo
docker ps

# Verificar logs del backend
docker logs f1app-backend

# Verificar logs del frontend
docker logs f1app-frontend

# Verificar logs de la base de datos
docker logs f1app-database
```

## 📊 Comandos de Base de Datos Disponibles

### Verificar Estado

```bash
# Bash
./database-commands.sh status

# PowerShell
.\database-commands.ps1 status
```

### Migraciones

```bash
# Migración completa (recomendado para nueva instalación)
./database-commands.sh migrate

# Migración inicial
./database-commands.sh init

# Setup específico 2025
./database-commands.sh setup2025

# Migraciones individuales
./database-commands.sh individual
```

### Backup y Restauración

```bash
# Crear backup
./database-commands.sh backup

# Restaurar backup
./database-commands.sh restore archivo_backup.sql
```

## 🔧 Solución de Problemas

### Error de Conexión a Base de Datos

```bash
# Verificar que MySQL esté corriendo
sudo systemctl status mysql

# Verificar credenciales
mysql -u f1user -p -h localhost

# Verificar puerto
netstat -tlnp | grep 3306
```

### Error de Docker

```bash
# Verificar que Docker esté corriendo
docker info

# Limpiar imágenes no utilizadas
docker system prune -a

# Verificar espacio en disco
docker system df
```

### Error de Permisos (Linux/macOS)

```bash
# Dar permisos de ejecución
chmod +x *.sh

# Verificar permisos
ls -la *.sh
```

## 📁 Estructura de Archivos

```
F1APP/
├── build-production.sh          # Script de compilación (Bash)
├── build-production.ps1         # Script de compilación (PowerShell)
├── database-commands.sh         # Comandos de BD (Bash)
├── database-commands.ps1        # Comandos de BD (PowerShell)
├── database-migration-complete.sql  # Migración completa
├── docker-compose.prod.yml      # Configuración de producción
├── backend/
│   └── Dockerfile              # Dockerfile del backend
├── frontend/
│   └── Dockerfile              # Dockerfile del frontend
└── *.sql                       # Archivos de migración individuales
```

## 🔐 Seguridad

### Variables de Entorno

- **NUNCA** subas archivos `.env` al repositorio
- Usa contraseñas fuertes para producción
- Cambia las credenciales por defecto

### Base de Datos

```bash
# Cambiar contraseña root
mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED BY 'nueva_password_segura';

# Crear usuario específico para la aplicación
CREATE USER 'f1user'@'%' IDENTIFIED BY 'password_seguro';
GRANT ALL PRIVILEGES ON f1fantasy.* TO 'f1user'@'%';
FLUSH PRIVILEGES;
```

## 📞 Soporte

Si encuentras problemas:

1. Verifica los logs: `docker-compose -f docker-compose.prod.yml logs`
2. Revisa la conectividad de red
3. Verifica las credenciales de base de datos
4. Asegúrate de que todos los puertos estén disponibles

## 🎯 Próximos Pasos

1. **Compilar imágenes**: Ejecuta `build-production.sh` o `build-production.ps1`
2. **Subir a Docker Hub**: Usa `docker push` con tus credenciales
3. **Configurar BD**: Ejecuta `database-commands.sh migrate`
4. **Desplegar**: Usa `docker-compose -f docker-compose.prod.yml up -d`
5. **Verificar**: Accede a `http://localhost` para el frontend

¡Tu aplicación F1 Fantasy estará lista para producción! 🏁 