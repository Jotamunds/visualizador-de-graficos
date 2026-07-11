/* =============================================================================
   aggregate.js  —  Filtra as linhas e agrega por categoria.
   -----------------------------------------------------------------------------
   Recebe os dados resolvidos (cabecalhos, linhas, tipos) + a configuração do
   gráfico e devolve algo pronto para o Chart.js:
       { labels: [...], series: [ { indice, nome, valores: [...] } ] }

   Duas formas de trabalhar:
   - agregar = true : agrupa por valor da coluna X e aplica soma/média/etc.
   - agregar = false: usa cada linha como um ponto (bom para série temporal).
   ============================================================================= */

window.App = window.App || {};

App.Aggregate = (function () {

  // ---- Filtros --------------------------------------------------------------
  function comparaNumero(a, op, b, b2) {
    switch (op) {
      case 'eq':  return a === b;
      case 'ne':  return a !== b;
      case 'gt':  return a >  b;
      case 'gte': return a >= b;
      case 'lt':  return a <  b;
      case 'lte': return a <= b;
      case 'between': return a >= b && a <= b2;
      default: return true;
    }
  }
  function comparaTexto(a, op, b) {
    const A = String(a ?? '').toLowerCase();
    const B = String(b ?? '').toLowerCase();
    switch (op) {
      case 'eq':       return A === B;
      case 'ne':       return A !== B;
      case 'contains': return A.includes(B);
      default: return true;
    }
  }

  function passaFiltro(valor, f, tipoCol) {
    if (valor === null || valor === '') return false;
    if (tipoCol === 'number' && f.op !== 'contains') {
      const a = Number(valor), b = Number(f.valor), b2 = Number(f.valor2);
      if (isNaN(a) || isNaN(b)) return false;
      return comparaNumero(a, f.op, b, b2);
    }
    return comparaTexto(valor, f.op, f.valor);
  }

  function aplicarFiltros(dados, filtros) {
    if (!filtros || filtros.length === 0) return dados.linhas;
    return dados.linhas.filter(linha =>
      filtros.every(f => passaFiltro(linha[f.col], f, dados.tipos[f.col]))
    );
  }

  // ---- Agregação de um conjunto de valores ----------------------------------
  function agregarValores(valores, fn) {
    const nums = valores.filter(v => typeof v === 'number' && isFinite(v));
    if (fn === 'count') return valores.filter(v => v !== null && v !== '').length;
    if (nums.length === 0) return 0;
    switch (fn) {
      case 'sum': return nums.reduce((s, v) => s + v, 0);
      case 'avg': return nums.reduce((s, v) => s + v, 0) / nums.length;
      case 'min': return Math.min(...nums);
      case 'max': return Math.max(...nums);
      default:    return nums.reduce((s, v) => s + v, 0);
    }
  }

  // ---- Cálculo principal ----------------------------------------------------
  function calcular(dados, cfg) {
    const linhas = aplicarFiltros(dados, cfg.filtros);
    const xCol = cfg.xCol;
    const series = (cfg.seriesCols || []);

    if (!cfg.agregar) {
      // Sem agregação: cada linha é um ponto.
      const labels = linhas.map(l => rotulo(l[xCol]));
      return {
        labels,
        series: series.map(idx => ({
          indice: idx,
          nome: dados.cabecalhos[idx],
          valores: linhas.map(l => numOuNulo(l[idx])),
        })),
      };
    }

    // Com agregação: agrupa por valor de X (mantém ordem de aparição).
    const grupos = new Map(); // rotuloX -> { [serieIdx]: [valores] }
    linhas.forEach(l => {
      const chave = rotulo(l[xCol]);
      if (!grupos.has(chave)) grupos.set(chave, {});
      const g = grupos.get(chave);
      series.forEach(idx => { (g[idx] = g[idx] || []).push(l[idx]); });
    });

    const labels = Array.from(grupos.keys());
    return {
      labels,
      series: series.map(idx => ({
        indice: idx,
        nome: dados.cabecalhos[idx],
        valores: labels.map(chave => agregarValores(grupos.get(chave)[idx] || [], cfg.funcaoAgregacao)),
      })),
    };
  }

  function rotulo(v) { return v === null || v === undefined ? '(vazio)' : String(v); }
  function numOuNulo(v) { return typeof v === 'number' && isFinite(v) ? v : null; }

  return { calcular, aplicarFiltros };
})();
