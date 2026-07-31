@echo off
REM Inicia la app Angular en http://localhost:4200 y abre el navegador.
REM Se usa "node ng.js" directamente para evitar el npm roto del sistema.
cd /d "%~dp0frontend"
echo Iniciando frontend en http://localhost:4200 ...
node "node_modules\@angular\cli\bin\ng.js" serve --open
