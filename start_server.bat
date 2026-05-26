@echo off
echo ===================================================
echo Iniciando Servidor Local para o E-Transcriber...
echo ===================================================
echo.
echo O navegador abrira automaticamente em http://localhost:8000
echo.
echo Pressione CTRL+C nesta janela para encerrar o servidor quando terminar.
echo.

start http://localhost:8000

python -m http.server 8000
