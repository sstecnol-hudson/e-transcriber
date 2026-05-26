# run_server.ps1
# ------------------------------------------------------------
# Script para iniciar um servidor HTTP local usando Python.
# Este projeto é uma Progressive Web App (PWA) e requer um servidor
# para funcionar corretamente (Service Workers, CORS, etc.).
#
# Como o usuário está em Windows, este script PowerShell pode ser
# executado diretamente a partir do terminal "PowerShell" ou
# clicando duas vezes no arquivo (se a política de execução permitir).
#
# Uso rápido:
#   .\run_server.ps1          # inicia na porta padrão 8000
#   .\run_server.ps1 8080    # especifica outra porta
#
# O script verifica se o Python está disponível no PATH e, caso
# contrário, exibe uma mensagem de erro amigável.
# ------------------------------------------------------------
param(
    [int]$Port = 8000
)

function Write-Info($msg) {
    Write-Host "[INFO] $msg" -ForegroundColor Cyan
}
function Write-ErrorMsg($msg) {
    Write-Host "[ERRO] $msg" -ForegroundColor Red
}

# Verifica se o comando 'python' está acessível
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-ErrorMsg "Python não encontrado no PATH. Instale o Python 3.x ou adicione ao PATH."
    exit 1
}

# Inicia o servidor
Write-Info "Iniciando servidor HTTP local na porta $Port..."
Write-Info "Abra o navegador em http://localhost:$Port"

# Executa o módulo http.server do Python
# -u garante saída não bufferizada (útil para logs em tempo real)
$process = Start-Process -FilePath python -ArgumentList "-u", "-m", "http.server", "$Port" -NoNewWindow -PassThru

# Aguarda o processo terminar (Ctrl+C para interromper)
try {
    Wait-Process -Id $process.Id
} catch {
    Write-Info "Servidor interrompido."
}
