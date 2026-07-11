/* =============================================================================
   export.js  —  Salvar/imprimir gráficos.
   -----------------------------------------------------------------------------
   Um gráfico:  exportarImagem(cartao, 'png'|'jpeg')  e  exportarPDF(cartao)
   Vários:      exportarVariosPDF(cartoes)  (um por página)
                exportarVariosPNG(cartoes)  (baixa um arquivo por gráfico)

   As imagens saem com fundo branco porque o Chart.js recebe um plugin de fundo
   (registrado em chartCard.js). Aqui só pegamos a imagem pronta do canvas.
   ============================================================================= */

window.App = window.App || {};

App.Export = (function () {

  function nomeSeguro(txt) {
    return String(txt || 'grafico').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 60).trim() || 'grafico';
  }

  function baixarDataURL(dataURL, nomeArquivo) {
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function imagem(cartao, formato) {
    const mime = formato === 'jpeg' ? 'image/jpeg' : 'image/png';
    const chart = cartao.chart;
    // Liga o título dentro do gráfico só para a captura (na tela ele fica no
    // cabeçalho do cartão, para não duplicar).
    const titulo = cartao.cfg.titulo || '';
    const antes = chart.options.plugins.title.display;
    chart.options.plugins.title.display = !!titulo;
    chart.options.plugins.title.text = titulo;
    chart.update('none');
    const url = chart.toBase64Image(mime, 1.0);
    chart.options.plugins.title.display = antes;
    chart.update('none');
    return url;
  }

  function exportarImagem(cartao, formato) {
    const url = imagem(cartao, formato);
    baixarDataURL(url, `${nomeSeguro(cartao.cfg.titulo)}.${formato === 'jpeg' ? 'jpg' : 'png'}`);
  }

  // Coloca a imagem do gráfico (com título embutido) em uma página do jsPDF,
  // centralizada e proporcional.
  function colocarNaPagina(doc, cartao) {
    const url = imagem(cartao, 'png');
    const canvas = cartao.chart.canvas;
    const larguraPag = doc.internal.pageSize.getWidth();
    const alturaPag = doc.internal.pageSize.getHeight();
    const margem = 36;
    const topo = margem;               // o título já vem embutido na imagem
    const maxL = larguraPag - margem * 2;
    const maxA = alturaPag - topo - margem;
    const razao = canvas.width / canvas.height;
    let l = maxL, a = l / razao;
    if (a > maxA) { a = maxA; l = a * razao; }
    const x = (larguraPag - l) / 2;
    doc.addImage(url, 'PNG', x, topo, l, a);
  }

  function novoDoc() {
    const { jsPDF } = window.jspdf;
    return new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  }

  function exportarPDF(cartao) {
    const doc = novoDoc();
    colocarNaPagina(doc, cartao);
    doc.save(`${nomeSeguro(cartao.cfg.titulo)}.pdf`);
  }

  function exportarVariosPDF(cartoes) {
    if (!cartoes.length) return;
    const doc = novoDoc();
    cartoes.forEach((c, i) => { if (i > 0) doc.addPage(); colocarNaPagina(doc, c); });
    doc.save('graficos.pdf');
  }

  function exportarVariosPNG(cartoes) {
    cartoes.forEach(c => exportarImagem(c, 'png'));
  }

  return { exportarImagem, exportarPDF, exportarVariosPDF, exportarVariosPNG };
})();
