# Build stage
FROM golang:1.21-alpine AS builder

# Instalar git (necesario para algunas dependencias de Go)
RUN apk add --no-cache git

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos go.mod y go.sum
COPY go.mod go.sum ./

# Descargar dependencias
RUN go mod download

# Copiar el código fuente
COPY . .

# Compilar la aplicación
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Production stage
FROM alpine:latest

# Instalar ca-certificates para HTTPS
RUN apk --no-cache add ca-certificates

# Crear directorio de trabajo
WORKDIR /root/

# Copiar el binario compilado desde la etapa de build
COPY --from=builder /app/main .

# Exponer el puerto
EXPOSE 8080

# Ejecutar la aplicación
CMD ["./main"] 