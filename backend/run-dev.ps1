# Script para ejecutar el backend en modo desarrollo con hot reload
Write-Host "🚀 Iniciando F1 Fantasy App Backend en modo desarrollo..." -ForegroundColor Green

# Verificar si existe el archivo .env
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  No se encontró archivo .env, usando variables de entorno del sistema" -ForegroundColor Yellow
}

# Verificar si air está instalado
$airInstalled = Get-Command air -ErrorAction SilentlyContinue
if (-not $airInstalled) {
    Write-Host "📦 Instalando air para hot reload..." -ForegroundColor Blue
    go install github.com/cosmtrek/air@latest
}

# Crear archivo de configuración de air si no existe
if (-not (Test-Path ".air.toml")) {
    Write-Host "📝 Creando configuración de air..." -ForegroundColor Blue
    @"
root = "."
test_delay = 0
log = "build-errors.log"

[build]
  args_bin = []
  bin = "./tmp/main"
  cmd = "go build -o ./tmp/main ."
  delay = 1000
  exclude_dir = ["assets", "tmp", "vendor", "tests"]
  exclude_file = []
  exclude_regex = ["_test.go"]
  exclude_unchanged = false
  follow_symlink = false
  full_bin = ""
  include_dir = []
  include_ext = ["go", "tpl", "tmpl", "html"]
  include_file = []
  kill_delay = "0s"
  log = "build-errors.log"
  poll = false
  poll_interval = 0
  rerun = false
  rerun_delay = 500
  send_interrupt = false
  stop_on_root = false

[color]
  app = ""
  build = "yellow"
  main = "magenta"
  runner = "green"
  watcher = "cyan"

[log]
  main_only = false
  time = false

[misc]
  clean_on_exit = false

[screen]
  clear_on_rebuild = false
  keep_scroll = true
"@ | Out-File -FilePath ".air.toml" -Encoding UTF8
}

Write-Host "✅ Configuración de air creada" -ForegroundColor Green
Write-Host "📡 El servidor estará disponible en: http://localhost:8080" -ForegroundColor Cyan
Write-Host "🔄 Los cambios se recargarán automáticamente" -ForegroundColor Yellow
Write-Host "🛑 Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host ""

# Ejecutar air
air 