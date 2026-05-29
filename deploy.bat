@echo off
rem ------------------------------------------------------------
rem  deploy.bat – Deploy automático do e‑transciber no Vercel
rem ------------------------------------------------------------

rem 1. Permitir execução de scripts apenas nesta sessão
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

rem 2. Instalar a CLI da Vercel (se ainda não estiver instalada)
npm install -g vercel

rem 3. (Opcional) Login – será solicitado interativamente na primeira execução
rem vercel login

rem 4. Deploy de produção
vercel --prod

rem 5. Mensagem final
echo Deploy concluído. URL publica: https://e-transcriber.vercel.app
pause
