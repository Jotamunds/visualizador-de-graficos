/* =============================================================================
   ui.js  —  Peças de interface reutilizáveis: modal, confirmação e toast.
   -----------------------------------------------------------------------------
   Mantém um único overlay (#overlay) e o preenche conforme a necessidade.
   Assim, qualquer parte do app abre janelas de forma consistente.
   ============================================================================= */

window.App = window.App || {};

App.UI = (function () {
  let overlay, toastEl, toastTimer;

  function init() {
    overlay = document.getElementById('overlay');
    toastEl = document.getElementById('toast');
    // Fechar clicando fora do modal.
    overlay.addEventListener('click', (e) => { if (e.target === overlay) fecharModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharModal(); });
  }

  // Abre um modal. `conteudo` é um HTMLElement (o corpo já montado).
  // Devolve o próprio elemento do modal para quem precisar ligar eventos.
  function abrirModal(conteudo, { largo = false } = {}) {
    overlay.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal' + (largo ? ' modal--largo' : '');
    modal.appendChild(conteudo);
    overlay.appendChild(modal);
    overlay.classList.add('overlay--aberto');
    // foco no primeiro campo/botão
    const alvo = modal.querySelector('input, select, button');
    if (alvo) alvo.focus();
    return modal;
  }

  function fecharModal() {
    if (!overlay) return;
    overlay.classList.remove('overlay--aberto');
    overlay.innerHTML = '';
  }

  // Confirmação sim/não. Devolve Promise<boolean>.
  function confirmar(titulo, texto, rotuloConfirmar = 'Confirmar', perigo = true) {
    return new Promise((resolve) => {
      const c = document.createElement('div');
      c.innerHTML = `
        <div class="modal__cabeca">${esc(titulo)}</div>
        <div class="modal__corpo">${esc(texto)}</div>
        <div class="modal__rodape">
          <button class="btn js-cancelar">${esc(App.Config.TEXTOS.botaoCancelar)}</button>
          <button class="btn ${perigo ? 'btn--perigo' : 'btn--primario'} js-ok">${esc(rotuloConfirmar)}</button>
        </div>`;
      abrirModal(c);
      c.querySelector('.js-cancelar').addEventListener('click', () => { fecharModal(); resolve(false); });
      c.querySelector('.js-ok').addEventListener('click', () => { fecharModal(); resolve(true); });
    });
  }

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('toast--visivel');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('toast--visivel'), 2200);
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }

  return { init, abrirModal, fecharModal, confirmar, toast };
})();
