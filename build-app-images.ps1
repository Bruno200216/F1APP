# Script para construir imágenes Docker del Frontend y Backend
# Sin tocar la base de datos - Solo aplicaciones
# Uso: .\build-app-images.ps1 [opcional: usuario-dockerhub]

param(
    [string]$DockerHubUsername = ""
)

# Función para imprimir con colores
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Verificar que Docker esté corriendo
function Test-Docker {
    try {
        docker info | Out-Null
        Write-Success "Docker está corriendo"
        return $true
    }
    catch {
        Write-Error "Docker no está corriendo"
        Write-Host "Inicia Docker y vuelve a intentar"
        exit 1
    }
}

# Verificar que los directorios existan
function Test-Directories {
    if (-not (Test-Path "./backend")) {
        Write-Error "Directorio ./backend no encontrado"
        exit 1
    }
    
    if (-not (Test-Path "./frontend")) {
        Write-Error "Directorio ./frontend no encontrado"
        exit 1
    }
    
    Write-Success "Directorios verificados"
}

# Construir imagen del Backend
function Build-Backend {
    Write-Status "🔨 Construyendo imagen del Backend..."
    
    # Verificar que existe el Dockerfile
    if (-not (Test-Path "./backend/Dockerfile")) {
        Write-Error "Dockerfile no encontrado en ./backend/"
        exit 1
    }
    
    # Construir la imagen
    $buildDate = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    docker build -t f1app-backend:latest `
                 --label "build-date=$buildDate" `
                 --label "description=F1 Fantasy Backend API" `
                 ./backend/
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Backend construido exitosamente"
    }
    else {
        Write-Error "Error construyendo Backend"
        exit 1
    }
}

# Construir imagen del Frontend
function Build-Frontend {
    Write-Status "🔨 Construyendo imagen del Frontend..."
    
    # Verificar que existe el Dockerfile
    if (-not (Test-Path "./frontend/Dockerfile")) {
        Write-Error "Dockerfile no encontrado en ./frontend/"
        exit 1
    }
    
    # Verificar que existe nginx.conf
    if (-not (Test-Path "./frontend/nginx.conf")) {
        Write-Warning "nginx.conf no encontrado en ./frontend/"
        Write-Status "Se usará la configuración por defecto de nginx"
    }
    
    # Construir la imagen
    $buildDate = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    docker build -t f1app-frontend:latest `
                 --label "build-date=$buildDate" `
                 --label "description=F1 Fantasy Frontend React App" `
                 ./frontend/
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Frontend construido exitosamente"
    }
    else {
        Write-Error "Error construyendo Frontend"
        exit 1
    }
}

# Mostrar información de las imágenes construidas
function Show-Images {
    Write-Status "📋 Imágenes construidas:"
    Write-Host ""
    docker images | Select-String -Pattern "f1app|REPOSITORY" | ForEach-Object { Write-Host $_ }
    Write-Host ""
}

# Función para hacer push a Docker Hub (opcional)
function Push-ToDockerHub {
    param([string]$Username)
    
    if ([string]::IsNullOrEmpty($Username)) {
        Write-Warning "No se proporcionó usuario de Docker Hub"
        Write-Status "Para hacer push más tarde, usa:"
        Write-Host "   docker tag f1app-backend:latest $Username/f1app-backend:latest"
        Write-Host "   docker tag f1app-frontend:latest $Username/f1app-frontend:latest"
        Write-Host "   docker push $Username/f1app-backend:latest"
        Write-Host "   docker push $Username/f1app-frontend:latest"
        return
    }
    
    Write-Status "🔐 Verificando login en Docker Hub..."
    
    # Verificar si ya está logueado
    $dockerInfo = docker info 2>$null
    if ($dockerInfo -match "Username") {
        $loggedUser = ($dockerInfo | Select-String "Username").ToString().Split()[1]
        Write-Success "Logueado como: $loggedUser"
    }
    else {
        Write-Warning "Necesitas hacer login en Docker Hub"
        docker login
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Error en login"
            return
        }
    }
    
    # Preguntar si hacer push
    Write-Host ""
    $response = Read-Host "¿Hacer push a Docker Hub? (y/N)"
    if ($response -match "^[Yy]$") {
        
        Write-Status "🚀 Haciendo push a Docker Hub..."
        
        # Tag y push Backend
        Write-Status "📤 Pushing Backend..."
        docker tag f1app-backend:latest "$Username/f1app-backend:latest"
        docker push "$Username/f1app-backend:latest"
        
        # Tag y push Frontend
        Write-Status "📤 Pushing Frontend..."
        docker tag f1app-frontend:latest "$Username/f1app-frontend:latest"
        docker push "$Username/f1app-frontend:latest"
        
        Write-Success "Push completado exitosamente!"
        Write-Host ""
        Write-Status "🌐 Imágenes disponibles en Docker Hub:"
        Write-Host "   🔗 https://hub.docker.com/r/$Username/f1app-backend"
        Write-Host "   🔗 https://hub.docker.com/r/$Username/f1app-frontend"
        
    }
    else {
        Write-Status "Push cancelado. Las imágenes están construidas localmente."
    }
}

# Función para crear docker-compose sin base de datos
function Create-AppCompose {
    Write-Status "📝 Creando docker-compose.app.yml (sin base de datos)..."
    
    $composeContent = @'
services:
  # Backend API en Go
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

  # Frontend React
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
'@

    $composeContent | Out-File -FilePath "docker-compose.app.yml" -Encoding UTF8
    Write-Success "docker-compose.app.yml creado"
    Write-Status "Para ejecutar solo las aplicaciones:"
    Write-Host "   docker-compose -f docker-compose.app.yml up -d"
}

# Función principal
function Main {
    Write-Host "🚀 F1 Fantasy App - Build Images (Solo Aplicaciones)" -ForegroundColor Cyan
    Write-Host "📅 Fecha: $(Get-Date)" -ForegroundColor Cyan
    Write-Host "🏷️  Versión: $(git describe --tags 2>$null || 'latest')" -ForegroundColor Cyan
    Write-Host ""
    
    # Verificaciones iniciales
    Test-Docker
    Test-Directories
    
    # Construir imágenes
    Build-Backend
    Build-Frontend
    
    # Mostrar resultados
    Show-Images
    
    # Crear docker-compose para solo aplicaciones
    Create-AppCompose
    
    # Push opcional a Docker Hub
    Push-ToDockerHub $DockerHubUsername
    
    Write-Host ""
    Write-Success "✅ Construcción completada!"
    Write-Host ""
    Write-Status "📋 Comandos útiles:"
    Write-Host "   # Ejecutar solo las aplicaciones (sin BD):"
    Write-Host "   docker-compose -f docker-compose.app.yml up -d"
    Write-Host ""
    Write-Host "   # Ver logs:"
    Write-Host "   docker-compose -f docker-compose.app.yml logs -f"
    Write-Host ""
    Write-Host "   # Parar aplicaciones:"
    Write-Host "   docker-compose -f docker-compose.app.yml down"
    Write-Host ""
    Write-Host "   # Ejecutar con base de datos completa:"
    Write-Host "   docker-compose up -d"
}

# Ejecutar función principal
Main 