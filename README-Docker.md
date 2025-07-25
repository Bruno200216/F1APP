# F1 Fantasy App - Configuración Docker

Este documento explica cómo ejecutar la aplicación F1 Fantasy usando Docker.

## Prerrequisitos

- Docker
- Docker Compose

## Estructura de Docker

La aplicación está dividida en 3 servicios:

1. **database**: MySQL 8.0
2. **backend**: API en Go (puerto 8080)
3. **frontend**: React con Nginx (puerto 80)

## Configuración

1. **Copia el archivo de configuración:**
   ```bash
   cp env.example .env
   ```

2. **Edita las variables de entorno** en `.env` si es necesario:
   ```
   DB_HOST=database
   DB_PORT=3306
   DB_USER=f1user
   DB_PASSWORD=f1password
   DB_NAME=f1fantasy
   DB_ROOT_PASSWORD=rootpassword
   PORT=8080
   ```

## Comandos para ejecutar

### Construir y ejecutar toda la aplicación
```bash
docker-compose up --build
```

### Ejecutar en segundo plano
```bash
docker-compose up -d --build
```

### Ver logs
```bash
docker-compose logs -f
```

### Parar los servicios
```bash
docker-compose down
```

### Parar y eliminar volúmenes (base de datos)
```bash
docker-compose down -v
```

## Acceso a la aplicación

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8080
- **Base de datos**: localhost:3306

## Inicialización de la base de datos

Si tienes archivos SQL de inicialización (como `complete_setup_2025.sql`), puedes:

1. **Copiarlos al directorio raíz** del proyecto
2. **Modificar el archivo `init.sql`** para incluir tus scripts:
   ```sql
   SOURCE /docker-entrypoint-initdb.d/complete_setup_2025.sql;
   ```
3. **Montar el archivo en docker-compose.yml:**
   ```yaml
   volumes:
     - mysql_data:/var/lib/mysql
     - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
     - ./complete_setup_2025.sql:/docker-entrypoint-initdb.d/complete_setup_2025.sql:ro
   ```

## Comandos útiles de desarrollo

### Reconstruir solo un servicio
```bash
docker-compose build backend
docker-compose build frontend
```

### Ejecutar comandos dentro de un contenedor
```bash
docker-compose exec backend sh
docker-compose exec database mysql -u root -p
```

### Ver el estado de los contenedores
```bash
docker-compose ps
```

## Solución de problemas

### La base de datos no se conecta
- Verifica que las variables de entorno sean correctas
- Espera a que el healthcheck de MySQL sea exitoso

### El frontend no puede conectar al backend
- Verifica que el nginx.conf tenga la configuración correcta del proxy
- Asegúrate de que el backend esté funcionando en el puerto 8080

### Problemas de permisos
```bash
sudo chown -R $USER:$USER .
```

### Limpiar completamente Docker (cuidado!)
```bash
docker system prune -a
docker volume prune
```

## Push a Docker Hub

Para subir las imágenes a Docker Hub y poder usarlas en otros servidores:

### Opción 1: Script automático (Recomendado)

**Windows:**
```powershell
.\docker-push.ps1 <tu-usuario-dockerhub>
```

**Linux/Mac:**
```bash
chmod +x docker-push.sh
./docker-push.sh <tu-usuario-dockerhub>
```

### Opción 2: Manual

1. **Construir con tags específicos:**
   ```bash
   docker build -t tu-usuario/f1app-backend:latest ./backend/
   docker build -t tu-usuario/f1app-frontend:latest ./frontend/
   ```

2. **Login en Docker Hub:**
   ```bash
   docker login
   ```

3. **Push:**
   ```bash
   docker push tu-usuario/f1app-backend:latest
   docker push tu-usuario/f1app-frontend:latest
   ```

### Usar imágenes de Docker Hub

Una vez subidas, puedes usar `docker-compose.prod.yml`:

```bash
# Configurar tu usuario en .env
echo "DOCKERHUB_USERNAME=tu-usuario" >> .env

# Ejecutar desde Docker Hub
docker-compose -f docker-compose.prod.yml up -d
``` 