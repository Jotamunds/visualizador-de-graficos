/* =============================================================================
   project.js  —  Arquivo de projeto (o "banco de dados portátil").
   -----------------------------------------------------------------------------
   Um projeto é um .json autossuficiente: guarda a planilha lida (todas as abas)
   + a configuração de cada gráfico + o layout. Ao abrir, os gráficos voltam
   exatamente como estavam, com os dados atrás — sem precisar reimportar a
   planilha. É também o formato usado no salvamento automático (IndexedDB).

   Estrutura:
     { schema, app, versao, modelo:{...}, dashboard:{ colunas, charts[], grid[] } }
   ============================================================================= */

window.App = window.App || {};

App.Project = (function () {
  const SCHEMA = 1;

  function montar(modelo, dashboard) {
    return {
      schema: SCHEMA,
      app: App.Config.nomeApp,
      versao: App.Config.versao,
      modelo,                        // planilha inteira embutida
      dashboard: dashboard.serializar(),
    };
  }

  function baixar(objeto, nomeArquivo) {
    const blob = new Blob([JSON.stringify(objeto)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo || 'projeto.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Salva o projeto atual em arquivo (download).
  function salvarArquivo(modelo, dashboard) {
    const nome = (modelo.nomeArquivo || 'projeto').replace(/\.[^.]+$/, '');
    baixar(montar(modelo, dashboard), `${nome}.json`);
  }

  // Lê um arquivo de projeto e valida. Devolve Promise<projeto>.
  function abrirArquivo(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('leitura'));
      reader.onload = (e) => {
        try {
          const obj = JSON.parse(e.target.result);
          if (!obj || obj.schema !== SCHEMA || !obj.modelo || !obj.dashboard) throw new Error('formato');
          resolve(obj);
        } catch { reject(new Error('formato')); }
      };
      reader.readAsText(file);
    });
  }

  return { montar, salvarArquivo, abrirArquivo };
})();
