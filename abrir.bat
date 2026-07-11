@echo off
REM Abre o Visualizador de Dados com salvamento automatico ativo.
REM Requer Python instalado. Se nao tiver, basta dar duplo-clique no index.html.
cd /d "%~dp0"
start "" http://localhost:8000
python -m http.server 8000
