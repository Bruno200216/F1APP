# Script para desplegar solo las aplicaciones (backend y frontend) sin tocar la base de datos
# Uso: .\deploy-apps-only.ps1 [comando]

param(
    [string]$Command = "help"
)

# Función para mostrar ayuda
function Show-Help {
    Write-Host "F1 Fantasy App - Despliegue de Aplicaciones (Sin BD)" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Uso: .\deploy-apps-only.ps1 [comando]" -ForegroundColor White
    Write-Host ""
    Write-Host "Comandos disponibles:" -ForegroundColor White
    Write-Host "  deploy        - Desplegar aplicaciones (backend + frontend)" -ForegroundColor Yellow
    Write-Host "  stop          - Parar solo las aplicaciones" -ForegroundColor Yellow
    Write-Host "  restart       - Reiniciar solo las aplicaciones" -ForegroundColor Yellow
    Write-Host "  logs          - Mostrar logs de las aplicaciones" -ForegroundColor Yellow
    Write-Host "  status        - Mostrar estado de las aplicaciones" -ForegroundColor Yellow
    Write-Host "  update        - Actualizar imágenes y desplegar" -ForegroundColor Yellow
    Write-Host "  help          - Mostrar esta ayuda" -ForegroundColor Yellow
    Write-Host ""
}

# Verificar que Docker esté instalado
function Test-Docker {
    try {
        docker info | Out-Null
        Write-Host "✅ Docker está funcionando" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Docker no está instalado o no está funcionando" -ForegroundColor Red
        return $false
    }
}

# Verificar que las imágenes existan
function Test-Images {
    Write-Host "🔍 Verificando imágenes locales..." -ForegroundColor Blue
    
    $backendImage = docker images | Select-String "f1app-backend"
    $frontendImage = docker images | Select-String "f1app-frontend"
    
    if (-not $backendImage) {
        Write-Host "❌ Error: Imagen f1app-backend no encontrada" -ForegroundColor Red
        Write-Host "💡 Ejecuta primero: .\build-images.ps1" -ForegroundColor Yellow
        return $false
    }
    
    if (-not $frontendImage) {
        Write-Host "❌ Error: Imagen f1app-frontend no encontrada" -ForegroundColor Red
        Write-Host "💡 Ejecuta primero: .\build-images.ps1" -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "✅ Imágenes verificadas" -ForegroundColor Green
    return $true
}

# Crear docker-compose para apps
function New-DockerComposeApps {
    $dockerComposeContent = @"
services:
  # Backend API en Go
  backend:
    image: f1app-backend:latest
    container_name: f1app-backend
    restart: unless-stopped
    environment:
      DB_HOST: `${DB_HOST:-localhost}
      DB_PORT: `${DB_PORT:-3306}
      DB_USER: `${DB_USER:-f1user}
      DB_PASSWORD: `${DB_PASSWORD:-f1password}
      DB_NAME: `${DB_NAME:-f1fantasy}
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
"@

    $dockerComposeContent | Out-File -FilePath "docker-compose.apps.yml" -Encoding UTF8
    Write-Host "📄 Archivo docker-compose.apps.yml creado" -ForegroundColor Green
}

# Desplegar aplicaciones
function Deploy-Apps {
    Write-Host "🚀 Desplegando aplicaciones (sin tocar la base de datos)..." -ForegroundColor Yellow
    
    # Crear docker-compose
    New-DockerComposeApps
    
    # Cargar variables de entorno
    if (Test-Path ".env") {
        Get-Content ".env" | ForEach-Object {
            if ($_ -match '^([^#][^=]+)=(.*)$') {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
            }
        }
    }
    elseif (Test-Path "env.production") {
        Get-Content "env.production" | ForEach-Object {
            if ($_ -match '^([^#][^=]+)=(.*)$') {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
            }
        }
    }
    
    # Desplegar
    docker-compose -f docker-compose.apps.yml up -d
    
    Write-Host "✅ Aplicaciones desplegadas!" -ForegroundColor Green
    Write-Host "🌐 Frontend: http://localhost" -ForegroundColor Blue
    Write-Host "🔧 Backend: http://localhost:8080" -ForegroundColor Blue
    Write-Host "📋 Para ver logs: .\deploy-apps-only.ps1 logs" -ForegroundColor Blue
}

# Parar aplicaciones
function Stop-Apps {
    Write-Host "🛑 Parando aplicaciones..." -ForegroundColor Yellow
    docker-compose -f docker-compose.apps.yml down
    Write-Host "✅ Aplicaciones paradas!" -ForegroundColor Green
}

# Reiniciar aplicaciones
function Restart-Apps {
    Write-Host "🔄 Reiniciando aplicaciones..." -ForegroundColor Yellow
    docker-compose -f docker-compose.apps.yml down
    docker-compose -f docker-compose.apps.yml up -d
    Write-Host "✅ Aplicaciones reiniciadas!" -ForegroundColor Green
}

# Mostrar logs
function Show-Logs {
    Write-Host "📋 Mostrando logs de las aplicaciones (Ctrl+C para salir)..." -ForegroundColor Blue
    docker-compose -f docker-compose.apps.yml logs -f
}

# Mostrar estado
function Show-Status {
    Write-Host "📊 Estado de las aplicaciones:" -ForegroundColor Blue
    docker-compose -f docker-compose.apps.yml ps
}

# Actualizar y desplegar
function Update-Apps {
    Write-Host "🔄 Actualizando imágenes y desplegando..." -ForegroundColor Yellow
    
    # Construir nuevas imágenes
    Write-Host "🔨 Construyendo nuevas imágenes..." -ForegroundColor Blue
    .\build-images.ps1
    
    # Parar aplicaciones actuales
    Write-Host "🛑 Parando aplicaciones actuales..." -ForegroundColor Blue
    docker-compose -f docker-compose.apps.yml down
    
    # Desplegar con nuevas imágenes
    Write-Host "🚀 Desplegando con nuevas imágenes..." -ForegroundColor Blue
    Deploy-Apps
    
    Write-Host "✅ Actualización completada!" -ForegroundColor Green
}

# Procesar comandos
switch ($Command.ToLower()) {
    "deploy" {
        if (Test-Docker -and Test-Images) {
            Deploy-Apps
        }
    }
    "stop" {
        if (Test-Docker) {
            Stop-Apps
        }
    }
    "restart" {
        if (Test-Docker) {
            Restart-Apps
        }
    }
    "logs" {
        if (Test-Docker) {
            Show-Logs
        }
    }
    "status" {
        if (Test-Docker) {
            Show-Status
        }
    }
    "update" {
        if (Test-Docker) {
            Update-Apps
        }
    }
    default {
        Show-Help
    }
} 