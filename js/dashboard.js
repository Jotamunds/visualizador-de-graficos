/* =============================================================================
   dashboard.js  —  A coleção de gráficos e o layout da tela.
   -----------------------------------------------------------------------------
   Cuida do gridstack (arrastar/redimensionar), do botão "Adicionar gráfico"
   (modal com escolha de aba + tabela/intervalo), do seletor de layout
   (gráficos por linha) e do modo de exportar vários de uma vez.
   ============================================================================= */

window.App = window.App || {};

App.Dashboard = class Dashboard {
  constructor(gridEl, ctx) {
    this.gridEl = gridEl;
    this.ctx = ctx || {};          // { onChange }
    this.modelo = null;
    this.cards = [];
    this.colunas = App.Config.colunasPadrao;
    this.hPadrao = 4;              // altura padrão (em células) de um card novo

    this.grid = GridStack.init({
      column: 12,
      cellHeight: 92,
      margin: 8,
      handle: '.grid-arraste',     // só arrasta pela "asa" (não pelos controles)
      float: true,
      resizable: { handles: 'e, se, s, sw, w' },
    }, gridEl);

    // Ao mover/redimensionar, salva o layout.
    this.grid.on('change', () => this._mudou());
  }

  setModelo(modelo) { this.modelo = modelo; }

  // Contexto repassado a cada gráfico.
  _ctxCard() {
    return {
      onDelete: (card) => this.removerCard(card),
      onChange: () => this._mudou(),
      confirmar: App.UI.confirmar,
      toast: App.UI.toast,
    };
  }

  // ---- Adicionar / remover --------------------------------------------------
  abrirModalNovoGrafico() {
    if (!this.modelo) return;
    const T = App.Config.TEXTOS;
    const c = document.createElement('div');
    const abasOpt = this.modelo.abas.map(a => `<option value="${a}">${a}</option>`).join('');
    c.innerHTML = `
      <div class="modal__cabeca">${T.modalNovoTitulo}</div>
      <div class="modal__corpo">
        <div class="campo"><label>${T.passoAba}</label><select class="js-aba">${abasOpt}</select></div>
        <label style="font-size:12px;font-weight:600;color:var(--cor-texto-fraco)">${T.passoFonte}</label>
        <div class="radio-grupo">
          <label><input type="radio" name="fonte" value="tabela" checked> ${T.fonteTabela}</label>
          <label><input type="radio" name="fonte" value="intervalo"> ${T.fonteIntervalo}</label>
        </div>
        <div class="campo js-tabela-wrap"><select class="js-tabela"></select></div>
        <div class="campo js-intervalo-wrap" style="display:none">
          <label>${T.labelIntervalo}</label>
          <input type="text" class="js-intervalo" placeholder="${T.placeholderIntervalo}">
        </div>
        <div class="modal__erro js-erro"></div>
      </div>
      <div class="modal__rodape">
        <button class="btn js-cancelar">${T.botaoCancelar}</button>
        <button class="btn btn--primario js-criar">${T.botaoCriar}</button>
      </div>`;
    App.UI.abrirModal(c);

    const $ = (s) => c.querySelector(s);
    const abaSel = $('.js-aba');
    const tabelaSel = $('.js-tabela');
    const tabelaWrap = $('.js-tabela-wrap');
    const intervaloWrap = $('.js-intervalo-wrap');
    const erro = $('.js-erro');

    const preencherTabelas = () => {
      const tabs = App.Parser.tabelasDaAba(this.modelo, abaSel.value);
      if (tabs.length) {
        tabelaSel.innerHTML = tabs.map(t => `<option value="${t.nome}">${t.nome} (${t.range})</option>`).join('');
        tabelaSel.disabled = false;
      } else {
        tabelaSel.innerHTML = `<option value="">${App.Config.TEXTOS.semTabelas}</option>`;
        tabelaSel.disabled = true;
      }
    };
    preencherTabelas();
    abaSel.addEventListener('change', preencherTabelas);

    c.querySelectorAll('input[name="fonte"]').forEach(r => r.addEventListener('change', () => {
      const modo = c.querySelector('input[name="fonte"]:checked').value;
      tabelaWrap.style.display = modo === 'tabela' ? '' : 'none';
      intervaloWrap.style.display = modo === 'intervalo' ? '' : 'none';
      erro.textContent = '';
    }));

    $('.js-cancelar').addEventListener('click', () => App.UI.fecharModal());
    $('.js-criar').addEventListener('click', () => {
      erro.textContent = '';
      const modo = c.querySelector('input[name="fonte"]:checked').value;
      let fonte;
      if (modo === 'tabela') {
        if (!tabelaSel.value) { erro.textContent = App.Config.TEXTOS.semTabelas; return; }
        fonte = { aba: abaSel.value, modo: 'tabela', tabela: tabelaSel.value };
      } else {
        fonte = { aba: abaSel.value, modo: 'intervalo', range: $('.js-intervalo').value };
      }
      let card;
      try { card = App.ChartCard.novo(fonte, this.modelo, this._ctxCard()); }
      catch (e) { erro.textContent = e.message === 'range' ? App.Config.TEXTOS.erroIntervalo : 'Não foi possível usar esta fonte.'; return; }
      this._inserirCard(card);
      App.UI.fecharModal();
      this._mudou();
    });
  }

  // Insere um card já criado no grid, numa posição livre.
  _inserirCard(card, pos) {
    const el = card.montar();
    const w = pos ? pos.w : Math.max(1, Math.floor(12 / this.colunas));
    const h = pos ? pos.h : this.hPadrao;

    const item = document.createElement('div');
    item.className = 'grid-stack-item';
    item.setAttribute('gs-w', w);
    item.setAttribute('gs-h', h);
    if (pos && pos.x != null) item.setAttribute('gs-x', pos.x);
    if (pos && pos.y != null) item.setAttribute('gs-y', pos.y);

    const content = document.createElement('div');
    content.className = 'grid-stack-item-content';
    content.appendChild(el);
    item.appendChild(content);

    this.gridEl.appendChild(item);
    this.grid.makeWidget(item);

    this.cards.push(card);
    card.desenhar(); // canvas já tem tamanho aqui
    return card;
  }

  removerCard(card) {
    const item = card.el.closest('.grid-stack-item');
    this.cards = this.cards.filter(c => c !== card);
    card.destruir();
    if (item) this.grid.removeWidget(item, true);
    this._mudou();
  }

  limpar() {
    this.cards.slice().forEach(c => { const it = c.el.closest('.grid-stack-item'); c.destruir(); if (it) this.grid.removeWidget(it, true); });
    this.cards = [];
  }

  // ---- Layout ---------------------------------------------------------------
  definirColunas(n) {
    this.colunas = n;
    const w = Math.max(1, Math.floor(12 / n));
    this.cards.forEach((card, i) => {
      const item = card.el.closest('.grid-stack-item');
      this.grid.update(item, { w, x: (i % n) * w, y: Math.floor(i / n) * this.hPadrao });
    });
    this._mudou();
  }

  // ---- Modo de exportar vários ---------------------------------------------
  entrarSelecao() {
    if (!this.cards.length) { App.UI.toast(App.Config.TEXTOS.selecaoNenhum); return; }
    this.cards.forEach(c => c.el.classList.add('cartao--selecionavel'));
    const T = App.Config.TEXTOS;
    const bar = document.createElement('div');
    bar.id = 'barra-selecao';
    bar.className = 'barra-selecao';
    bar.innerHTML = `
      <span>${T.selecaoTitulo}</span>
      <button class="btn btn--primario js-pdf">${T.selecaoExportarPDF}</button>
      <button class="btn js-png">${T.selecaoExportarPNG}</button>
      <button class="btn btn--fantasma js-sair">${T.selecaoSair}</button>`;
    document.body.appendChild(bar);
    bar.querySelector('.js-pdf').addEventListener('click', () => this._exportarSelecionados('pdf'));
    bar.querySelector('.js-png').addEventListener('click', () => this._exportarSelecionados('png'));
    bar.querySelector('.js-sair').addEventListener('click', () => this.sairSelecao());
  }

  sairSelecao() {
    this.cards.forEach(c => c.el.classList.remove('cartao--selecionavel', 'cartao--selecionado'));
    const bar = document.getElementById('barra-selecao');
    if (bar) bar.remove();
  }

  _exportarSelecionados(formato) {
    const sel = this.cards.filter(c => c.estaSelecionado());
    if (!sel.length) { App.UI.toast(App.Config.TEXTOS.selecaoNenhum); return; }
    if (formato === 'pdf') App.Export.exportarVariosPDF(sel);
    else App.Export.exportarVariosPNG(sel);
  }

  // ---- Serialização ---------------------------------------------------------
  serializar() {
    return {
      colunas: this.colunas,
      charts: this.cards.map(c => c.serializar()),
      grid: this.cards.map(c => {
        const it = c.el.closest('.grid-stack-item');
        const n = it && it.gridstackNode ? it.gridstackNode : null;
        return { id: c.cfg.id, x: n ? n.x : 0, y: n ? n.y : 0, w: n ? n.w : 6, h: n ? n.h : 4 };
      }),
    };
  }

  restaurar(estado) {
    this.limpar();
    if (estado.colunas) this.colunas = estado.colunas;
    const posPorId = {};
    (estado.grid || []).forEach(g => { posPorId[g.id] = g; });
    (estado.charts || []).forEach(cfg => {
      const card = new App.ChartCard(cfg, this.modelo, this._ctxCard());
      this._inserirCard(card, posPorId[cfg.id]);
    });
  }

  _mudou() { if (this.ctx.onChange) this.ctx.onChange(); }
};
