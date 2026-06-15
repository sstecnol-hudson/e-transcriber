@echo off
rem ------------------------------------------------------------
rem  deploy.bat - Deploy automatico do e-transciber no Vercel
rem ------------------------------------------------------------

rem 1. Instalar a CLI da Vercel (se ainda nao estiver instalada)
npm install -g vercel

rem 2. Deploy de producao
vercel --prod

rem 3. Mensagem final
echo Deploy concluido. URL publica: https://e-transcriber.vercel.app
pause
