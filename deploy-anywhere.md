# Desplegar F1 Fantasy App desde Docker Hub

## 🌍 Despliega en cualquier servidor con Docker

### Requisitos:
- Docker y Docker Compose instalados
- Puerto 80 y 8080 disponibles

### Pasos:

1. **Crear directorio:**
```bash
mkdir f1-fantasy-app
cd f1-fantasy-app
```

2. **Crear docker-compose.yml:**
```yaml
services:
  database:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: f1fantasy
      MYSQL_USER: f1user
      MYSQL_PASSWORD: f1password
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10

  backend:
    image: bruno200216/f1app-backend:latest
    restart: unless-stopped
    environment:
      DB_HOST: database
      DB_PORT: 3306
      DB_USER: f1user
      DB_PASSWORD: f1password
      DB_NAME: f1fantasy
      PORT: 8080
    ports:
      - "8080:8080"
    depends_on:
      database:
        condition: service_healthy

  frontend:
    image: bruno200216/f1app-frontend:latest
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mysql_data:
```

3. **Ejecutar:**
```bash
docker compose up -d
```

4. **Acceder:**
- Frontend: http://localhost
- API: http://localhost:8080

## 🔄 Actualizar a nueva versión:
```bash
docker compose pull
docker compose up -d
```

## 📊 Ver logs:
```bash
docker compose logs -f
```

## 🛑 Parar:
```bash
docker compose down
```

¡Listo! Tu aplicación F1 Fantasy funcionará en cualquier servidor con Docker. 