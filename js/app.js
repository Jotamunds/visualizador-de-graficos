/* =============================================================================
   app.js  —  Ponto de entrada. Liga a interface aos módulos.
   -----------------------------------------------------------------------------
   Fluxo:
     1) preenche textos/nome vindos do config.js;
     2) tenta restaurar um projeto salvo automaticamente (IndexedDB);
     3) senão, mostra a área de importação;
     4) liga os botões da barra superior.
   ============================================================================= */

window.App = window.App || {};

(function () {
  const T = App.Config.TEXTOS;
  let modelo = null;
  let dashboard = null;
  let autosaveOk = false;
  let autosaveTimer = null;

  document.addEventListener('DOMContentLoaded', iniciar);

  async function iniciar() {
    App.UI.init();

    // Textos e identidade
    document.title = App.Config.nomeApp;
    byId('marca').textContent = App.Config.nomeApp;
    byId('dz-titulo').textContent = T.tituloImportar;
    byId('dz-sub').textContent = T.subtituloImportar;
    byId('dz-btn').textContent = T.botaoImportar;
    byId('lbl-layout').textContent = T.seletorLayout;
    byId('btn-add').textContent = T.botaoAddGrafico;
    byId('btn-salvar').textContent = T.botaoSalvarProjeto;
    byId('btn-abrir').textContent = T.botaoAbrirProjeto;
    byId('btn-imprimir').textContent = T.botaoImprimirVarios;
    byId('btn-trocar').textContent = T.botaoTrocarArquivo;
    byId('file-planilha').setAttribute('accept', App.Config.extensoesAceitas);

    // Seletor de layout
    const selLayout = byId('sel-layout');
    selLayout.innerHTML = App.Config.opcoesColunas.map(n => `<option value="${n}">${n}</option>`).join('');
    selLayout.value = String(App.Config.colunasPadrao);
    selLayout.addEventListener('change', () => dashboard && dashboard.definirColunas(Number(selLayout.value)));

    // Botões
    byId('dz-btn').addEventListener('click', () => byId('file-planilha').click());
    byId('dropzone').addEventListener('click', (e) => { if (e.target.id === 'dropzone') byId('file-planilha').click(); });
    byId('btn-add').addEventListener('click', () => dashboard.abrirModalNovoGrafico());
    byId('btn-salvar').addEventListener('click', salvarProjeto);
    byId('btn-abrir').addEventListener('click', () => byId('file-projeto').click());
    byId('btn-imprimir').addEventListener('click', () => dashboard.entrarSelecao());
    byId('btn-trocar').addEventListener('click', trocarArquivo);

    byId('file-planilha').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) importarPlanilha(f); e.target.value = ''; });
    byId('file-projeto').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) abrirProjeto(f); e.target.value = ''; });

    ligarArrastarSoltar();

    // Salvamento automático
    autosaveOk = await App.Storage.disponivel();
    atualizarIndicadorAutosave();

    // Restaurar projeto salvo, se houver.
    if (autosaveOk) {
      const salvo = await App.Storage.carregar();
      if (salvo && salvo.modelo && salvo.dashboard) {
        modelo = salvo.modelo;
        garantirDashboard();
        dashboard.setModelo(modelo);
        dashboard.restaurar(salvo.dashboard);
        selLayout.value = String(salvo.dashboard.colunas || App.Config.colunasPadrao);
        mostrarTrabalho();
      }
    }
  }

  // ---- Importação -----------------------------------------------------------
  async function importarPlanilha(file) {
    try {
      modelo = await App.Parser.lerArquivo(file);
    } catch (e) {
      App.UI.toast(T.erroArquivo);
      return;
    }
    garantirDashboard();
    dashboard.setModelo(modelo);
    mostrarTrabalho();
    agendarAutosave();
  }

  async function trocarArquivo() {
    if (dashboard && dashboard.cards.length) {
      const ok = await App.UI.confirmar(T.botaoTrocarArquivo, T.confirmarTrocarArquivo, T.botaoTrocarArquivo, false);
      if (!ok) return;
    }
    byId('file-planilha').click();
  }

  async function abrirProjeto(file) {
    let obj;
    try { obj = await App.Project.abrirArquivo(file); }
    catch { App.UI.toast(T.erroProjeto); return; }
    modelo = obj.modelo;
    garantirDashboard();
    dashboard.setModelo(modelo);
    dashboard.restaurar(obj.dashboard);
    byId('sel-layout').value = String(obj.dashboard.colunas || App.Config.colunasPadrao);
    mostrarTrabalho();
    App.UI.toast(T.projetoAberto);
    agendarAutosave();
  }

  function salvarProjeto() {
    if (!modelo) return;
    App.Project.salvarArquivo(modelo, dashboard);
    App.UI.toast(T.projetoSalvo);
  }

  // ---- Estados da tela ------------------------------------------------------
  function garantirDashboard() {
    if (dashboard) return;
    byId('grid').hidden = false; // gridstack precisa do container visível
    dashboard = new App.Dashboard(byId('grid'), { onChange: agendarAutosave });
  }

  function mostrarTrabalho() {
    byId('dropzone').classList.add('oculto');
    byId('grid').hidden = false;
    byId('acoes').hidden = false;
  }

  // ---- Arrastar e soltar arquivo -------------------------------------------
  function ligarArrastarSoltar() {
    const dz = byId('dropzone');
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('dropzone--ativa'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('dropzone--ativa'); }));
    dz.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) importarPlanilha(f); });
  }

  // ---- Salvamento automático ------------------------------------------------
  function agendarAutosave() {
    if (!autosaveOk || !modelo || !dashboard) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      App.Storage.salvar(App.Project.montar(modelo, dashboard));
    }, 600);
  }

  function atualizarIndicadorAutosave() {
    const el = byId('autosave');
    byId('autosave-txt').textContent = autosaveOk ? T.autosaveOn : T.autosaveOff;
    el.classList.toggle('autosave--off', !autosaveOk);
  }

  function byId(id) { return document.getElementById(id); }
})();
