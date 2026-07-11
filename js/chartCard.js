/* =============================================================================
   chartCard.js  —  Um gráfico e todos os seus controles.
   -----------------------------------------------------------------------------
   Cada gráfico na tela é uma instância de ChartCard. Ela cuida de:
     - montar o HTML do cartão (barra lateral + painéis + canvas);
     - resolver os dados (via App.Parser) e agregar (via App.Aggregate);
     - desenhar/atualizar o Chart.js;
     - painel de CONFIGURAÇÕES (tipo, colunas, cores, títulos, legenda...);
     - painel de FILTROS;
     - EXPORTAR (menu PNG/JPEG/PDF);
     - EXCLUIR (com confirmação, delegada ao app).

   PARA ADICIONAR UMA NOVA OPÇÃO DE CONFIG:
     1) crie o campo no HTML dentro de _htmlConfig();
     2) leia/guarde o valor em this.cfg no _ligarConfig();
     3) use this.cfg no _opcoesChart()/_dadosChart().
   ============================================================================= */

window.App = window.App || {};

App.uid = App.uid || function () {
  return 'g' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
};

/* ---- Plugins do Chart.js registrados uma única vez ------------------------- */
(function registrarPlugins() {
  if (window.__pluginsChart) return;
  window.__pluginsChart = true;

  // Fundo branco (para PNG/JPEG/PDF não saírem transparentes).
  Chart.register({
    id: 'fundoBranco',
    beforeDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    },
  });

  // Rótulos de valor (opcional, controlado por options.plugins.valores.mostrar).
  Chart.register({
    id: 'valores',
    afterDatasetsDraw(chart, _args, opts) {
      if (!opts || !opts.mostrar) return;
      const { ctx } = chart;
      ctx.save();
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      chart.data.datasets.forEach((ds, di) => {
        const meta = chart.getDatasetMeta(di);
        if (meta.hidden) return;
        meta.data.forEach((pt, i) => {
          const v = ds.data[i];
          if (v == null) return;
          const num = typeof v === 'object' ? v.y : v;
          ctx.fillText(App.ChartCard.formatarNumero(num), pt.x, pt.y - 3);
        });
      });
      ctx.restore();
    },
  });
})();

App.ChartCard = class ChartCard {

  // Cria um gráfico novo com padrões sensatos a partir de uma fonte de dados.
  static novo(fonte, modelo, ctx) {
    const dados = App.Parser.resolveFonte(modelo, fonte); // pode lançar; quem chama trata
    const idxTexto = dados.tipos.findIndex(t => t === 'text');
    const idxNumero = dados.tipos.findIndex(t => t === 'number');
    const P = App.Config.padroes;
    const cfg = {
      id: App.uid(),
      titulo: 'Gráfico',
      fonte,
      tipo: P.tipoGrafico,
      xCol: idxTexto >= 0 ? idxTexto : 0,
      seriesCols: idxNumero >= 0 ? [idxNumero] : [Math.min(1, dados.cabecalhos.length - 1)],
      agregar: P.agregar,
      funcaoAgregacao: P.funcaoAgregacao,
      cores: {},
      eixoXtitulo: '',
      eixoYtitulo: '',
      mostrarLegenda: P.mostrarLegenda,
      mostrarValores: P.mostrarValores,
      filtros: [],
    };
    return new ChartCard(cfg, modelo, ctx);
  }

  static formatarNumero(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '';
    const abs = Math.abs(n);
    const casas = Number.isInteger(n) ? 0 : (abs < 10 ? 2 : 1);
    return n.toLocaleString('pt-BR', { maximumFractionDigits: casas });
  }

  constructor(cfg, modelo, ctx) {
    this.cfg = cfg;
    this.modelo = modelo;
    this.ctx = ctx || {};          // { onChange, confirmar, toast }
    this.chart = null;
    this.dados = null;             // dados resolvidos (cache)
    this.painelAberto = null;      // 'config' | 'filtro' | null
    this.el = null;
  }

  // -------------------------------------------------------------------------
  //  Construção do DOM
  // -------------------------------------------------------------------------
  montar() {
    const T = App.Config.TEXTOS;
    const el = document.createElement('div');
    el.className = 'cartao';
    el.dataset.id = this.cfg.id;
    el.innerHTML = `
      <div class="cartao__rail">
        <button class="rail-btn js-config" title="${T.tipConfig}" aria-label="${T.tipConfig}">${ICON.config}</button>
        <button class="rail-btn js-filtro" title="${T.tipFiltro}" aria-label="${T.tipFiltro}">${ICON.filtro}</button>
        <button class="rail-btn js-export" title="${T.tipExport}" aria-label="${T.tipExport}">${ICON.export}</button>
        <div class="rail-spacer"></div>
        <button class="rail-btn rail-btn--perigo js-excluir" title="${T.tipExcluir}" aria-label="${T.tipExcluir}">${ICON.excluir}</button>
        <span class="rail-arraste grid-arraste" title="Arraste para mover">${ICON.arraste}</span>
      </div>
      <div class="cartao__painel painel-config"><div class="painel-conteudo"></div></div>
      <div class="cartao__painel painel-filtro"><div class="painel-conteudo"></div></div>
      <div class="cartao__corpo">
        <input class="cartao__titulo js-titulo" value="${escapar(this.cfg.titulo)}" aria-label="Título do gráfico">
        <div class="cartao__canvas-area">
          <div class="cartao__selecao js-selecao" title="Selecionar">${ICON.check}</div>
          <canvas></canvas>
        </div>
      </div>`;
    this.el = el;

    // Referências
    this.$config = el.querySelector('.painel-config .painel-conteudo');
    this.$filtro = el.querySelector('.painel-filtro .painel-conteudo');
    this.canvas = el.querySelector('canvas');

    // Barra lateral
    el.querySelector('.js-config').addEventListener('click', () => this._togglePainel('config'));
    el.querySelector('.js-filtro').addEventListener('click', () => this._togglePainel('filtro'));
    el.querySelector('.js-export').addEventListener('click', (e) => this._menuExport(e.currentTarget));
    el.querySelector('.js-excluir').addEventListener('click', () => this._excluir());

    // Título
    el.querySelector('.js-titulo').addEventListener('input', (e) => {
      this.cfg.titulo = e.target.value;
      if (this.chart) { this.chart.options.plugins.title.text = this.cfg.titulo; this.chart.update(); }
      this._mudou();
    });

    // Seleção (modo imprimir vários)
    el.querySelector('.js-selecao').addEventListener('click', () => {
      el.classList.toggle('cartao--selecionado');
    });

    // Resolve os dados uma vez para montar os painéis (séries, filtros...).
    if (!this.dados) this.dados = this._resolverSilencioso();
    this._montarConfig();
    this._montarFiltros();
    return el;
  }

  // Chame depois que o cartão já está no DOM (o canvas precisa ter tamanho).
  desenhar() {
    try {
      this.dados = App.Parser.resolveFonte(this.modelo, this.cfg.fonte);
    } catch (e) {
      this._semDados();
      return;
    }
    this._renderChart();
  }

  // -------------------------------------------------------------------------
  //  Painel de CONFIGURAÇÕES
  // -------------------------------------------------------------------------
  _montarConfig() {
    const T = App.Config.TEXTOS;
    const cab = this.dados ? this.dados.cabecalhos : this._resolverSilencioso().cabecalhos;
    const opcoesCols = cab.map((c, i) => `<option value="${i}">${escapar(c)}</option>`).join('');
    const opcoesTipo = App.Config.tiposGrafico.map(t => `<option value="${t.valor}">${t.rotulo}</option>`).join('');
    const opcoesFn = App.Config.funcoesAgregacao.map(f => `<option value="${f.valor}">${f.rotulo}</option>`).join('');

    this.$config.innerHTML = `
      <p class="painel-titulo">${T.configTitulo}</p>
      <div class="campo"><label>${T.configTipo}</label><select class="js-tipo">${opcoesTipo}</select></div>
      <div class="campo"><label>${T.configEixoX}</label><select class="js-x">${opcoesCols}</select></div>
      <div class="campo"><label>${T.configSeries}</label><div class="lista-series js-series"></div></div>
      <div class="campo campo--inline"><input type="checkbox" class="js-agregar" id="ag-${this.cfg.id}"><label for="ag-${this.cfg.id}">${T.configAgregar}</label></div>
      <div class="campo"><label>${T.configFuncao}</label><select class="js-fn">${opcoesFn}</select></div>
      <div class="campo"><label>${T.configCores}</label><div class="js-cores"></div></div>
      <div class="campo"><label>${T.configTituloGrafico}</label><input type="text" class="js-titulo-cfg"></div>
      <div class="campo"><label>${T.configTituloX}</label><input type="text" class="js-xtitulo"></div>
      <div class="campo"><label>${T.configTituloY}</label><input type="text" class="js-ytitulo"></div>
      <div class="campo campo--inline"><input type="checkbox" class="js-legenda" id="lg-${this.cfg.id}"><label for="lg-${this.cfg.id}">${T.configLegenda}</label></div>
      <div class="campo campo--inline"><input type="checkbox" class="js-valores" id="vl-${this.cfg.id}"><label for="vl-${this.cfg.id}">${T.configValores}</label></div>`;

    // Preencher valores atuais
    const $ = (s) => this.$config.querySelector(s);
    $('.js-tipo').value = this.cfg.tipo;
    $('.js-x').value = String(this.cfg.xCol);
    $('.js-fn').value = this.cfg.funcaoAgregacao;
    $('.js-agregar').checked = this.cfg.agregar;
    $('.js-legenda').checked = this.cfg.mostrarLegenda;
    $('.js-valores').checked = this.cfg.mostrarValores;
    $('.js-titulo-cfg').value = this.cfg.titulo;
    $('.js-xtitulo').value = this.cfg.eixoXtitulo;
    $('.js-ytitulo').value = this.cfg.eixoYtitulo;
    this._renderSeries();
    this._renderCores();

    // Ligações
    $('.js-tipo').addEventListener('change', e => { this.cfg.tipo = e.target.value; this._renderChart(); this._mudou(); });
    $('.js-x').addEventListener('change', e => { this.cfg.xCol = Number(e.target.value); this._renderChart(); this._mudou(); });
    $('.js-fn').addEventListener('change', e => { this.cfg.funcaoAgregacao = e.target.value; this._renderChart(); this._mudou(); });
    $('.js-agregar').addEventListener('change', e => { this.cfg.agregar = e.target.checked; this._renderChart(); this._mudou(); });
    $('.js-legenda').addEventListener('change', e => { this.cfg.mostrarLegenda = e.target.checked; this._renderChart(); this._mudou(); });
    $('.js-valores').addEventListener('change', e => { this.cfg.mostrarValores = e.target.checked; this._renderChart(); this._mudou(); });
    $('.js-titulo-cfg').addEventListener('input', e => {
      this.cfg.titulo = e.target.value;
      this.el.querySelector('.js-titulo').value = e.target.value;
      this._renderChart(); this._mudou();
    });
    $('.js-xtitulo').addEventListener('input', e => { this.cfg.eixoXtitulo = e.target.value; this._renderChart(); this._mudou(); });
    $('.js-ytitulo').addEventListener('input', e => { this.cfg.eixoYtitulo = e.target.value; this._renderChart(); this._mudou(); });
  }

  _renderSeries() {
    const cab = this.dados.cabecalhos;
    this.$config.querySelector('.js-series').innerHTML = cab.map((c, i) => `
      <label><input type="checkbox" value="${i}" ${this.cfg.seriesCols.includes(i) ? 'checked' : ''}> ${escapar(c)}</label>
    `).join('');
    this.$config.querySelectorAll('.js-series input').forEach(chk => {
      chk.addEventListener('change', () => {
        const idx = Number(chk.value);
        if (chk.checked) { if (!this.cfg.seriesCols.includes(idx)) this.cfg.seriesCols.push(idx); }
        else this.cfg.seriesCols = this.cfg.seriesCols.filter(x => x !== idx);
        this._renderCores();
        this._renderChart();
        this._mudou();
      });
    });
  }

  _renderCores() {
    const cont = this.$config.querySelector('.js-cores');
    const cab = this.dados.cabecalhos;
    cont.innerHTML = this.cfg.seriesCols.map((idx, pos) => {
      const cor = this.cfg.cores[idx] || App.Config.paletaGraficos[pos % App.Config.paletaGraficos.length];
      return `<div class="cor-serie">
        <input type="color" value="${cor}" data-idx="${idx}">
        <span title="${escapar(cab[idx])}">${escapar(cab[idx])}</span>
      </div>`;
    }).join('') || `<span class="painel-vazio">Selecione séries acima.</span>`;
    cont.querySelectorAll('input[type="color"]').forEach(inp => {
      inp.addEventListener('input', () => {
        this.cfg.cores[Number(inp.dataset.idx)] = inp.value;
        this._renderChart();
        this._mudou();
      });
    });
  }

  // -------------------------------------------------------------------------
  //  Painel de FILTROS
  // -------------------------------------------------------------------------
  _montarFiltros() {
    const T = App.Config.TEXTOS;
    this.$filtro.innerHTML = `
      <p class="painel-titulo">${T.filtroTitulo}</p>
      <div class="js-filtros-lista"></div>
      <button class="btn btn--fantasma js-add-filtro" style="margin-top:6px">${ICON.mais} ${T.filtroAdicionar}</button>`;
    this.$filtro.querySelector('.js-add-filtro').addEventListener('click', () => {
      this.cfg.filtros.push({ col: 0, op: 'eq', valor: '', valor2: '' });
      this._renderFiltros(); this._mudou();
    });
    this._renderFiltros();
  }

  _renderFiltros() {
    const T = App.Config.TEXTOS;
    const cab = this.dados ? this.dados.cabecalhos : this._resolverSilencioso().cabecalhos;
    const tipos = this.dados ? this.dados.tipos : this._resolverSilencioso().tipos;
    const lista = this.$filtro.querySelector('.js-filtros-lista');
    if (!this.cfg.filtros.length) { lista.innerHTML = `<p class="painel-vazio">${T.filtroVazio}</p>`; return; }

    lista.innerHTML = this.cfg.filtros.map((f, i) => {
      const ops = (tipos[f.col] === 'number' ? App.Config.operadoresNumero : App.Config.operadoresTexto)
        .map(o => `<option value="${o.valor}">${o.rotulo}</option>`).join('');
      const colsOpt = cab.map((c, ci) => `<option value="${ci}">${escapar(c)}</option>`).join('');
      const mostrar2 = f.op === 'between';
      return `<div class="filtro-item" data-i="${i}">
        <div class="campo"><label>${T.filtroColuna}</label><select class="js-f-col">${colsOpt}</select></div>
        <div class="campo"><label>${T.filtroOperador}</label><select class="js-f-op">${ops}</select></div>
        <div class="campo"><label>${T.filtroValor}</label><input type="text" class="js-f-val" value="${escapar(f.valor)}"></div>
        <div class="campo js-f-val2-wrap" ${mostrar2 ? '' : 'style="display:none"'}><label>${T.filtroValor2}</label><input type="text" class="js-f-val2" value="${escapar(f.valor2)}"></div>
        <button class="filtro-remover js-f-rem">${T.filtroRemover}</button>
      </div>`;
    }).join('');

    lista.querySelectorAll('.filtro-item').forEach(item => {
      const i = Number(item.dataset.i);
      const f = this.cfg.filtros[i];
      item.querySelector('.js-f-col').value = String(f.col);
      item.querySelector('.js-f-op').value = f.op;
      item.querySelector('.js-f-col').addEventListener('change', e => { f.col = Number(e.target.value); f.op = (this.dados.tipos[f.col] === 'number' ? 'eq' : 'eq'); this._renderFiltros(); this._renderChart(); this._mudou(); });
      item.querySelector('.js-f-op').addEventListener('change', e => { f.op = e.target.value; this._renderFiltros(); this._renderChart(); this._mudou(); });
      item.querySelector('.js-f-val').addEventListener('input', e => { f.valor = e.target.value; this._renderChart(); this._mudou(); });
      const v2 = item.querySelector('.js-f-val2'); if (v2) v2.addEventListener('input', e => { f.valor2 = e.target.value; this._renderChart(); this._mudou(); });
      item.querySelector('.js-f-rem').addEventListener('click', () => { this.cfg.filtros.splice(i, 1); this._renderFiltros(); this._renderChart(); this._mudou(); });
    });
  }

  // -------------------------------------------------------------------------
  //  Chart.js
  // -------------------------------------------------------------------------
  _tipoChart() {
    switch (this.cfg.tipo) {
      case 'hbar': case 'bar': return 'bar';
      case 'area': case 'line': return 'line';
      case 'scatter': return 'scatter';
      default: return this.cfg.tipo; // pie, doughnut
    }
  }

  _corSerie(idx, pos) {
    return this.cfg.cores[idx] || App.Config.paletaGraficos[pos % App.Config.paletaGraficos.length];
  }

  _dadosChart() {
    const tipo = this.cfg.tipo;

    if (tipo === 'scatter') {
      const linhas = App.Aggregate.aplicarFiltros(this.dados, this.cfg.filtros);
      return {
        datasets: this.cfg.seriesCols.map((idx, pos) => ({
          label: this.dados.cabecalhos[idx],
          data: linhas.map(l => ({ x: Number(l[this.cfg.xCol]), y: Number(l[idx]) }))
                       .filter(p => isFinite(p.x) && isFinite(p.y)),
          backgroundColor: this._corSerie(idx, pos),
          borderColor: this._corSerie(idx, pos),
        })),
      };
    }

    const agg = App.Aggregate.calcular(this.dados, this.cfg);

    if (tipo === 'pie' || tipo === 'doughnut') {
      const s = agg.series[0];
      const cores = agg.labels.map((_, i) => App.Config.paletaGraficos[i % App.Config.paletaGraficos.length]);
      return { labels: agg.labels, datasets: s ? [{ label: s.nome, data: s.valores, backgroundColor: cores }] : [] };
    }

    return {
      labels: agg.labels,
      datasets: agg.series.map((s, pos) => {
        const cor = this._corSerie(s.indice, pos);
        return {
          label: s.nome,
          data: s.valores,
          backgroundColor: tipo === 'line' ? cor : hexAlpha(cor, .8),
          borderColor: cor,
          borderWidth: 2,
          fill: tipo === 'area',
          tension: .25,
          pointRadius: tipo === 'line' || tipo === 'area' ? 2 : 0,
        };
      }),
    };
  }

  _opcoesChart() {
    const T = this.cfg;
    const ehCategoria = !['pie', 'doughnut', 'scatter'].includes(T.tipo);
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: T.tipo === 'hbar' ? 'y' : 'x',
      animation: false,
      plugins: {
        legend: { display: T.mostrarLegenda, position: 'bottom' },
        // Título fica desligado na tela (o cabeçalho do cartão já mostra);
        // é ligado só ao exportar imagem (ver export.js).
        title: { display: false, text: T.titulo, font: { size: 14 } },
        valores: { mostrar: T.mostrarValores },
        tooltip: { enabled: true },
      },
      scales: ehCategoria || T.tipo === 'scatter' ? {
        x: { title: { display: !!T.eixoXtitulo, text: T.eixoXtitulo }, type: T.tipo === 'scatter' ? 'linear' : 'category' },
        y: { title: { display: !!T.eixoYtitulo, text: T.eixoYtitulo }, beginAtZero: true },
      } : {},
    };
  }

  _renderChart() {
    if (!this.dados) { try { this.dados = App.Parser.resolveFonte(this.modelo, this.cfg.fonte); } catch { this._semDados(); return; } }
    if (!this.cfg.seriesCols.length) { this._semSeries(); return; }
    this._limparAviso();
    const tipo = this._tipoChart();
    const data = this._dadosChart();
    const options = this._opcoesChart();
    // Trocar o tipo-base do Chart.js exige recriar (evita eixos "fantasma").
    if (this.chart && this.chart.config.type === tipo) {
      this.chart.data = data;
      this.chart.options = options;
      this.chart.update();
    } else {
      if (this.chart) this.chart.destroy();
      this.chart = new Chart(this.canvas.getContext('2d'), { type: tipo, data, options });
    }
  }

  _semSeries() {
    if (this.chart) { this.chart.destroy(); this.chart = null; }
    this._aviso(App.Config.TEXTOS.semSeries);
  }
  _semDados() {
    if (this.chart) { this.chart.destroy(); this.chart = null; }
    this._aviso('Sem dados para exibir. Verifique a fonte/o intervalo nas configurações.');
  }
  _aviso(msg) {
    const area = this.el.querySelector('.cartao__canvas-area');
    let av = area.querySelector('.js-aviso');
    if (!av) { av = document.createElement('div'); av.className = 'painel-vazio js-aviso'; av.style.padding = '20px'; area.appendChild(av); }
    av.textContent = msg;
  }
  _limparAviso() { const av = this.el && this.el.querySelector('.js-aviso'); if (av) av.remove(); }

  // -------------------------------------------------------------------------
  //  Barra lateral: painéis, export, excluir
  // -------------------------------------------------------------------------
  _togglePainel(qual) {
    const cfg = this.el.querySelector('.painel-config');
    const flt = this.el.querySelector('.painel-filtro');
    const bC = this.el.querySelector('.js-config');
    const bF = this.el.querySelector('.js-filtro');
    const abrir = this.painelAberto !== qual;
    cfg.classList.toggle('cartao__painel--aberto', abrir && qual === 'config');
    flt.classList.toggle('cartao__painel--aberto', abrir && qual === 'filtro');
    bC.classList.toggle('rail-btn--ativo', abrir && qual === 'config');
    bF.classList.toggle('rail-btn--ativo', abrir && qual === 'filtro');
    this.painelAberto = abrir ? qual : null;
    // Deixa o Chart.js reajustar após a animação do painel.
    setTimeout(() => { if (this.chart) this.chart.resize(); }, 220);
  }

  _menuExport(botao) {
    const T = App.Config.TEXTOS;
    fecharMenusFlutuantes();
    const menu = document.createElement('div');
    menu.className = 'menu-flutuante';
    menu.innerHTML = `
      <button data-f="png">${T.exportPNG}</button>
      <button data-f="jpeg">${T.exportJPEG}</button>
      <button data-f="pdf">${T.exportPDF}</button>`;
    document.body.appendChild(menu);
    const r = botao.getBoundingClientRect();
    menu.style.top = `${r.top}px`;
    menu.style.left = `${r.right + 6}px`;
    menu.addEventListener('click', (e) => {
      const f = e.target.dataset.f; if (!f) return;
      if (f === 'pdf') App.Export.exportarPDF(this);
      else App.Export.exportarImagem(this, f);
      fecharMenusFlutuantes();
    });
  }

  async _excluir() {
    const T = App.Config.TEXTOS;
    const ok = this.ctx.confirmar
      ? await this.ctx.confirmar(T.excluirConfirmarTitulo, T.excluirConfirmarTexto, T.excluirConfirmar)
      : window.confirm(`${T.excluirConfirmarTitulo} ${T.excluirConfirmarTexto}`);
    if (ok && this.ctx.onDelete) this.ctx.onDelete(this);
  }

  // -------------------------------------------------------------------------
  //  Utilidades
  // -------------------------------------------------------------------------
  _resolverSilencioso() {
    try { return App.Parser.resolveFonte(this.modelo, this.cfg.fonte); }
    catch { return { cabecalhos: [], linhas: [], tipos: [] }; }
  }
  _mudou() { this._limparAviso(); if (this.ctx.onChange) this.ctx.onChange(); }

  serializar() { return JSON.parse(JSON.stringify(this.cfg)); }
  estaSelecionado() { return this.el.classList.contains('cartao--selecionado'); }
  destruir() { if (this.chart) { this.chart.destroy(); this.chart = null; } if (this.el) this.el.remove(); }
};

/* ---- Helpers de módulo ----------------------------------------------------- */
function escapar(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function hexAlpha(hex, a) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
}
function fecharMenusFlutuantes() { document.querySelectorAll('.menu-flutuante').forEach(m => m.remove()); }
document.addEventListener('click', (e) => {
  if (!e.target.closest('.menu-flutuante') && !e.target.closest('.js-export')) fecharMenusFlutuantes();
});

/* ---- Ícones (SVG inline; troque à vontade) --------------------------------- */
const ICON = {
  config:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  filtro:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
  export:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  excluir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  arraste: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  check:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
  mais:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
};
