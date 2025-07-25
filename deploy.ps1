# Script de despliegue para F1 Fantasy App (PowerShell)
# Uso: .\deploy.ps1 [comando]

param(
    [string]$Command = "help"
)

# Función para mostrar ayuda
function Show-Help {
    Write-Host "F1 Fantasy App - Script de Despliegue" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Uso: .\deploy.ps1 [comando]"
    Write-Host ""
    Write-Host "Comandos disponibles:" -ForegroundColor Yellow
    Write-Host "  start         - Construir y ejecutar la aplicación"
    Write-Host "  stop          - Parar todos los servicios"
    Write-Host "  restart       - Reiniciar todos los servicios"
    Write-Host "  logs          - Mostrar logs en vivo"
    Write-Host "  status        - Mostrar estado de contenedores"
    Write-Host "  clean         - Limpiar contenedores y volúmenes"
    Write-Host "  reset         - Reiniciar completamente (limpia la BD)"
    Write-Host "  setup         - Configuración inicial"
    Write-Host "  help          - Mostrar esta ayuda"
    Write-Host ""
}

# Función para verificar si Docker está instalado
function Test-Docker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "Error: Docker no está instalado" -ForegroundColor Red
        exit 1
    }
    
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Host "Error: Docker Compose no está instalado" -ForegroundColor Red
        exit 1
    }
}

# Función para configuración inicial
function Start-Setup {
    Write-Host "Configurando F1 Fantasy App..." -ForegroundColor Yellow
    
    # Crear archivo .env si no existe
    if (-not (Test-Path .env)) {
        Write-Host "Creando archivo .env..." -ForegroundColor Blue
        Copy-Item env.example .env
        Write-Host "Archivo .env creado. Puedes editarlo si necesitas cambiar la configuración." -ForegroundColor Green
    } else {
        Write-Host "El archivo .env ya existe." -ForegroundColor Yellow
    }
    
    Write-Host "Setup completado!" -ForegroundColor Green
}

# Función para iniciar la aplicación
function Start-App {
    Write-Host "Iniciando F1 Fantasy App..." -ForegroundColor Yellow
    docker-compose up --build -d
    Write-Host "Aplicación iniciada!" -ForegroundColor Green
    Write-Host "Frontend: http://localhost" -ForegroundColor Blue
    Write-Host "Backend: http://localhost:8080" -ForegroundColor Blue
    Write-Host "Para ver logs: .\deploy.ps1 logs" -ForegroundColor Blue
}

# Función para parar la aplicación
function Stop-App {
    Write-Host "Parando F1 Fantasy App..." -ForegroundColor Yellow
    docker-compose down
    Write-Host "Aplicación parada!" -ForegroundColor Green
}

# Función para reiniciar
function Restart-App {
    Write-Host "Reiniciando F1 Fantasy App..." -ForegroundColor Yellow
    docker-compose down
    docker-compose up --build -d
    Write-Host "Aplicación reiniciada!" -ForegroundColor Green
}

# Función para mostrar logs
function Show-Logs {
    Write-Host "Mostrando logs (Ctrl+C para salir)..." -ForegroundColor Blue
    docker-compose logs -f
}

# Función para mostrar estado
function Show-Status {
    Write-Host "Estado de los contenedores:" -ForegroundColor Blue
    docker-compose ps
}

# Función para limpiar
function Start-Clean {
    Write-Host "Limpiando contenedores..." -ForegroundColor Yellow
    docker-compose down
    docker-compose down --rmi all
    Write-Host "Limpieza completada!" -ForegroundColor Green
}

# Función para reset completo
function Start-Reset {
    $response = Read-Host "¿Estás seguro de que quieres hacer un reset completo? Esto eliminará la base de datos. (y/N)"
    if ($response -match "^[yY]([eE][sS])?$") {
        Write-Host "Haciendo reset completo..." -ForegroundColor Yellow
        docker-compose down -v
        docker-compose down --rmi all
        Write-Host "Reset completado!" -ForegroundColor Green
    } else {
        Write-Host "Reset cancelado." -ForegroundColor Blue
    }
}

# Verificar Docker
Test-Docker

# Procesar comando
switch ($Command.ToLower()) {
    "start" {
        Start-Setup
        Start-App
    }
    "stop" {
        Stop-App
    }
    "restart" {
        Restart-App
    }
    "logs" {
        Show-Logs
    }
    "status" {
        Show-Status
    }
    "clean" {
        Start-Clean
    }
    "reset" {
        Start-Reset
    }
    "setup" {
        Start-Setup
    }
    default {
        Show-Help
    }
} 