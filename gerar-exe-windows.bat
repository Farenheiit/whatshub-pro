@echo off
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo ========================================
echo WhatsHub - gerar instalador/executavel
Echo ========================================
echo.

echo Verificando Node.js e npm...
"C:\Program Files\nodejs\node.exe" -v
"C:\Program Files\nodejs\npm.cmd" -v

echo.
echo Instalando dependencias...
call "C:\Program Files\nodejs\npm.cmd" install

echo.
echo Gerando pacote Windows...
echo A primeira execucao pode demorar porque o Electron sera baixado.
call "C:\Program Files\nodejs\npm.cmd" run make

echo.
echo Finalizado. Verifique a pasta: out\make
pause
