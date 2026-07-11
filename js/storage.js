/* =============================================================================
   storage.js  —  Persistência local (salvamento automático).
   -----------------------------------------------------------------------------
   Usa IndexedDB, que é um "banco de dados" dentro do navegador (aguenta dados
   grandes, ao contrário do localStorage). Se o IndexedDB não estiver disponível
   (acontece às vezes ao abrir o arquivo por duplo-clique em file://), o app
   continua funcionando normalmente — só o autosave fica desligado, e você usa
   o botão "Salvar projeto" para guardar em arquivo.

   API exposta:
     App.Storage.disponivel()      -> Promise<bool>
     App.Storage.salvar(objeto)    -> Promise (grava o projeto atual)
     App.Storage.carregar()        -> Promise<objeto|null>
     App.Storage.limpar()          -> Promise
   ============================================================================= */

window.App = window.App || {};

App.Storage = (function () {
  const NOME_BANCO = 'visualizador_dados';
  const NOME_STORE = 'projeto';
  const CHAVE = 'atual';
  let bancoPromise = null;
  let ok = null; // cache do resultado de disponibilidade

  function abrir() {
    if (bancoPromise) return bancoPromise;
    bancoPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('sem indexedDB'));
      let req;
      try { req = indexedDB.open(NOME_BANCO, 1); }
      catch (e) { return reject(e); }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(NOME_STORE)) db.createObjectStore(NOME_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('erro ao abrir indexedDB'));
      // Alguns contextos file:// nunca resolvem: dá um tempo limite.
      setTimeout(() => reject(new Error('timeout indexedDB')), 1500);
    });
    return bancoPromise;
  }

  function tx(modo, fn) {
    return abrir().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(NOME_STORE, modo);
      const store = t.objectStore(NOME_STORE);
      const r = fn(store);
      t.oncomplete = () => resolve(r && r.result);
      t.onerror = () => reject(t.error);
    }));
  }

  return {
    async disponivel() {
      if (ok !== null) return ok;
      try { await abrir(); ok = true; } catch { ok = false; }
      return ok;
    },
    salvar(objeto) {
      return tx('readwrite', store => store.put(objeto, CHAVE)).catch(() => {});
    },
    carregar() {
      return tx('readonly', store => store.get(CHAVE))
        .then(v => v || null)
        .catch(() => null);
    },
    limpar() {
      return tx('readwrite', store => store.delete(CHAVE)).catch(() => {});
    },
  };
})();
