#!/usr/bin/env bash
# Abre o Visualizador de Dados com salvamento automatico ativo.
# Requer Python instalado. Se nao tiver, basta abrir o index.html no navegador.
cd "$(dirname "$0")"
( sleep 1; (command -v xdg-open >/dev/null && xdg-open http://localhost:8000) || (command -v open >/dev/null && open http://localhost:8000) ) &
python3 -m http.server 8000
