# Build stage
FROM node:18 AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Instalar react-scripts globalmente primero
RUN npm install -g react-scripts@5.0.1

# Copiar archivos de configuración
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm ci || npm install

# Copiar el código fuente
COPY . .

# Construir la aplicación
RUN react-scripts build

# Production stage
FROM nginx:alpine

# Copiar los archivos compilados al directorio de nginx
COPY --from=builder /app/build /usr/share/nginx/html

# Copiar configuración personalizada de nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Exponer el puerto
EXPOSE 80

# Ejecutar nginx
CMD ["nginx", "-g", "daemon off;"] 