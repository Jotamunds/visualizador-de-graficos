/* =============================================================================
   parser.js  —  Lê planilhas e entrega um "modelo" limpo para o resto do app.
   -----------------------------------------------------------------------------
   Ideia central: separar DADO de GRÁFICO. Aqui a planilha vira um modelo
   normalizado; ninguém mais no app precisa saber que existe SheetJS.

   Modelo devolvido por lerArquivo():
     {
       nomeArquivo: 'x.xlsx',
       abas: ['Plan1', 'Plan2'],
       planilhas: { 'Plan1': { aoa: [[...linhas...]], ref: 'A1:F100' } },
       nomeados:  [ { nome, aba, range } ]   // tabelas/intervalos nomeados do Excel
     }

   Uma "fonte" de gráfico é descrita por:
     { aba, modo:'tabela'|'intervalo', tabela?, range? }
   e resolveFonte() a transforma em { cabecalhos:[], linhas:[[...]], tipos:[] }.
   As colunas são referenciadas por ÍNDICE (robusto a renomear cabeçalho).
   ============================================================================= */

window.App = window.App || {};

App.Parser = (function () {

  // Converte uma célula em valor "limpo" (datas viram texto dd/mm/aaaa).
  function limparCelula(v) {
    if (v === undefined || v === null || v === '') return null;
    if (v instanceof Date) {
      const d = String(v.getDate()).padStart(2, '0');
      const m = String(v.getMonth() + 1).padStart(2, '0');
      return `${d}/${m}/${v.getFullYear()}`;
    }
    return v;
  }

  // Lê o arquivo (File) e devolve o modelo. Assíncrono.
  function lerArquivo(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('falha ao ler o arquivo'));
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
          resolve(modeloDoWorkbook(wb, file.name));
        } catch (err) { reject(err); }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function modeloDoWorkbook(wb, nomeArquivo) {
    const planilhas = {};
    wb.SheetNames.forEach(nome => {
      const ws = wb.Sheets[nome];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null })
        .map(linha => linha.map(limparCelula));
      planilhas[nome] = { aoa, ref: ws['!ref'] || null };
    });

    // Nomes definidos (Named Ranges e tabelas que viram nome no arquivo).
    const nomeados = [];
    const nomes = wb.Workbook && wb.Workbook.Names ? wb.Workbook.Names : [];
    nomes.forEach(n => {
      if (!n || !n.Ref) return;
      // Ref costuma vir como  Plan1!$A$1:$F$50
      const m = /^'?([^'!]+)'?!(.+)$/.exec(n.Ref);
      if (!m) return;
      nomeados.push({ nome: n.Name, aba: m[1], range: m[2].replace(/\$/g, '') });
    });

    return { nomeArquivo, abas: wb.SheetNames.slice(), planilhas, nomeados };
  }

  // Tabelas nomeadas disponíveis em uma aba (para o modo "tabela").
  function tabelasDaAba(modelo, aba) {
    return modelo.nomeados.filter(n => n.aba === aba);
  }

  // Valida uma string de intervalo tipo "A1:F50". Devolve o range decodificado
  // (0-based) ou null se inválido.
  function validarRange(str) {
    if (!str || typeof str !== 'string') return null;
    const limpo = str.trim().replace(/\$/g, '').toUpperCase();
    if (!/^[A-Z]+[0-9]+:[A-Z]+[0-9]+$/.test(limpo)) return null;
    try {
      const r = XLSX.utils.decode_range(limpo);
      if (r.s.r > r.e.r || r.s.c > r.e.c) return null;
      return r;
    } catch { return null; }
  }

  // Extrai um bloco (cabeçalho + linhas) do AOA de uma aba, dado um range 0-based.
  function extrairBloco(aoa, range) {
    const linhas = [];
    for (let r = range.s.r; r <= range.e.r; r++) {
      const linha = [];
      const orig = aoa[r] || [];
      for (let c = range.s.c; c <= range.e.c; c++) linha.push(orig[c] ?? null);
      linhas.push(linha);
    }
    return linhas;
  }

  // Normaliza cabeçalhos: preenche vazios e desambigua duplicados.
  function normalizarCabecalhos(linha) {
    const usados = {};
    return linha.map((v, i) => {
      let nome = (v === null || v === '') ? `Coluna ${i + 1}` : String(v).trim();
      if (usados[nome] != null) { usados[nome]++; nome = `${nome} (${usados[nome]})`; }
      else usados[nome] = 1;
      return nome;
    });
  }

  // Deduz o tipo de cada coluna a partir de uma amostra das linhas.
  function detectarTipos(linhas, nCols) {
    const tipos = [];
    for (let c = 0; c < nCols; c++) {
      let num = 0, total = 0;
      for (let i = 0; i < Math.min(linhas.length, 50); i++) {
        const v = linhas[i][c];
        if (v === null || v === '') continue;
        total++;
        if (typeof v === 'number' && isFinite(v)) num++;
      }
      tipos.push(total > 0 && num / total >= 0.6 ? 'number' : 'text');
    }
    return tipos;
  }

  // Resolve uma "fonte" em dados prontos para o gráfico.
  // Lança Error('range') se o intervalo for inválido/vazio.
  function resolveFonte(modelo, fonte) {
    const plan = modelo.planilhas[fonte.aba];
    if (!plan) throw new Error('aba');

    let rangeStr;
    if (fonte.modo === 'tabela') {
      const t = modelo.nomeados.find(n => n.aba === fonte.aba && n.nome === fonte.tabela);
      if (!t) throw new Error('tabela');
      rangeStr = t.range;
    } else {
      rangeStr = fonte.range;
    }

    const range = validarRange(rangeStr);
    if (!range) throw new Error('range');

    const bloco = extrairBloco(plan.aoa, range);
    if (bloco.length < 2) throw new Error('range'); // precisa de cabeçalho + ≥1 linha

    const cabecalhos = normalizarCabecalhos(bloco[0]);
    const linhas = bloco.slice(1).filter(l => l.some(v => v !== null && v !== ''));
    if (linhas.length === 0) throw new Error('range');

    const tipos = detectarTipos(linhas, cabecalhos.length);
    return { cabecalhos, linhas, tipos };
  }

  // Valores únicos de uma coluna (para montar dropdowns de filtro).
  function valoresUnicos(linhas, indiceCol) {
    const set = new Set();
    linhas.forEach(l => { const v = l[indiceCol]; if (v !== null && v !== '') set.add(v); });
    return Array.from(set);
  }

  return { lerArquivo, tabelasDaAba, validarRange, resolveFonte, valoresUnicos, detectarTipos };
})();
