@echo off
cd /d "%~dp0"

set "PATH=C:\Program Files\nodejs;%PATH%"

echo =====================================
echo WhatsHub - modo desenvolvimento
echo =====================================
echo.

echo Verificando Node.js e npm...
node -v
npm -v
echo.

echo Instalando dependencias...
call npm install
if errorlevel 1 goto erro

echo.
echo Iniciando WhatsHub...
call npm run dev
if errorlevel 1 goto erro

goto fim

:erro
echo.
echo ERRO: algo falhou. Copie a mensagem acima.
pause
exit /b 1

:fim
pause