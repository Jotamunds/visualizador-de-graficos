/* =============================================================================
   config.js  —  O ÚNICO lugar que você precisa mexer para personalizar o site.
   -----------------------------------------------------------------------------
   Aqui ficam: nome do app, opções padrão, paleta dos gráficos e TODOS os textos
   da interface (objeto TEXTOS). Quer renomear um botão? Mude aqui. Quer trocar
   as cores do TEMA (fundo, texto, botão principal)? Isso está no css/style.css,
   nas variáveis :root — a paleta abaixo é só a dos gráficos.
   ============================================================================= */

window.App = window.App || {};

App.Config = {
  // ---- Identidade do app ------------------------------------------------------
  nomeApp: 'Visualizador de Dados',
  versao: '1.0.0',

  // ---- Padrões ao criar um gráfico novo --------------------------------------
  padroes: {
    tipoGrafico: 'bar',      // bar | line | area | hbar | pie | doughnut | scatter
    agregar: true,           // agrupar por categoria e agregar (soma/média/etc.)
    funcaoAgregacao: 'sum',  // sum | avg | count | min | max
    mostrarLegenda: true,
    mostrarValores: false,   // desenhar o número em cima de cada barra/ponto
  },

  // ---- Paleta categórica dos gráficos (troque à vontade) ---------------------
  // 8 cores equilibradas; o gráfico cicla por elas quando há várias séries.
  paletaGraficos: [
    '#3b6ea5', // azul
    '#e08a3c', // laranja
    '#4c9a7a', // verde
    '#c05a5a', // vermelho suave
    '#8265a7', // roxo
    '#c9a227', // âmbar
    '#5aa0c0', // ciano
    '#9a6b58', // marrom
  ],

  // ---- Tipos de gráfico oferecidos (rótulo mostrado ao usuário) --------------
  tiposGrafico: [
    { valor: 'bar',      rotulo: 'Barras (vertical)' },
    { valor: 'hbar',     rotulo: 'Barras (horizontal)' },
    { valor: 'line',     rotulo: 'Linha' },
    { valor: 'area',     rotulo: 'Área' },
    { valor: 'pie',      rotulo: 'Pizza' },
    { valor: 'doughnut', rotulo: 'Rosca' },
    { valor: 'scatter',  rotulo: 'Dispersão (X × Y)' },
  ],

  // ---- Funções de agregação oferecidas ---------------------------------------
  funcoesAgregacao: [
    { valor: 'sum',   rotulo: 'Soma' },
    { valor: 'avg',   rotulo: 'Média' },
    { valor: 'count', rotulo: 'Contagem' },
    { valor: 'min',   rotulo: 'Mínimo' },
    { valor: 'max',   rotulo: 'Máximo' },
  ],

  // ---- Operadores de filtro (por tipo de coluna) -----------------------------
  operadoresNumero: [
    { valor: 'eq',  rotulo: '=' },
    { valor: 'ne',  rotulo: '≠' },
    { valor: 'gt',  rotulo: '>' },
    { valor: 'gte', rotulo: '≥' },
    { valor: 'lt',  rotulo: '<' },
    { valor: 'lte', rotulo: '≤' },
    { valor: 'between', rotulo: 'entre' },
  ],
  operadoresTexto: [
    { valor: 'eq',       rotulo: 'igual a' },
    { valor: 'ne',       rotulo: 'diferente de' },
    { valor: 'contains', rotulo: 'contém' },
  ],

  // ---- Layout: quantos gráficos por linha (mapeado no gridstack) -------------
  opcoesColunas: [1, 2, 3, 4],
  colunasPadrao: 2,

  // ---- Extensões aceitas na importação ---------------------------------------
  extensoesAceitas: '.xlsx,.xlsm,.xls,.csv',

  // ---- TEXTOS DA INTERFACE (mude qualquer palavra aqui) ----------------------
  TEXTOS: {
    tituloImportar: 'Importe uma planilha para começar',
    subtituloImportar: 'Arraste um arquivo aqui ou clique para selecionar (.xlsx, .xlsm, .csv)',
    botaoImportar: 'Selecionar arquivo',
    botaoTrocarArquivo: 'Trocar arquivo',
    botaoAddGrafico: 'Adicionar gráfico',
    botaoSalvarProjeto: 'Salvar projeto',
    botaoAbrirProjeto: 'Abrir projeto',
    botaoImprimirVarios: 'Imprimir / exportar vários',
    seletorLayout: 'Gráficos por linha',

    // Modal de novo gráfico
    modalNovoTitulo: 'Novo gráfico',
    passoAba: '1. Escolha a aba (planilha)',
    passoFonte: '2. Escolha de onde vêm os dados',
    fonteTabela: 'Usar uma tabela nomeada da aba',
    fonteIntervalo: 'Informar um intervalo manualmente',
    labelIntervalo: 'Intervalo (ex.: A1:F50) — a 1ª linha é o cabeçalho',
    placeholderIntervalo: 'A1:F50',
    semTabelas: 'Esta aba não tem tabelas nomeadas. Use a opção de intervalo.',
    erroIntervalo: 'Intervalo inválido ou vazio. Verifique o formato (ex.: A1:F50) e tente novamente.',
    botaoCriar: 'Criar gráfico',
    botaoCancelar: 'Cancelar',

    // Painel de configuração do gráfico
    configTitulo: 'Configurações',
    configTipo: 'Tipo de gráfico',
    configEixoX: 'Categoria (eixo X)',
    configSeries: 'Valores (séries)',
    configAgregar: 'Agrupar e agregar',
    configFuncao: 'Como agregar',
    configTituloGrafico: 'Título do gráfico',
    configTituloX: 'Rótulo do eixo X',
    configTituloY: 'Rótulo do eixo Y',
    configLegenda: 'Mostrar legenda',
    configValores: 'Mostrar valores no gráfico',
    configCores: 'Cores das séries',

    // Painel de filtros
    filtroTitulo: 'Filtros',
    filtroAdicionar: 'Adicionar filtro',
    filtroColuna: 'Coluna',
    filtroOperador: 'Condição',
    filtroValor: 'Valor',
    filtroValor2: 'e',
    filtroVazio: 'Nenhum filtro aplicado.',
    filtroRemover: 'Remover',

    // Exportar
    exportTitulo: 'Exportar este gráfico',
    exportPNG: 'Imagem PNG',
    exportJPEG: 'Imagem JPEG',
    exportPDF: 'PDF',

    // Excluir
    excluirConfirmarTitulo: 'Excluir gráfico?',
    excluirConfirmarTexto: 'Esta ação não pode ser desfeita.',
    excluirConfirmar: 'Excluir',

    // Tooltips dos botões da barra lateral do gráfico
    tipConfig: 'Configurações',
    tipFiltro: 'Filtros',
    tipExport: 'Exportar',
    tipExcluir: 'Excluir gráfico',

    // Modo seleção / imprimir vários
    selecaoTitulo: 'Selecione os gráficos para exportar',
    selecaoNenhum: 'Selecione ao menos um gráfico.',
    selecaoExportarPDF: 'Exportar selecionados em PDF',
    selecaoExportarPNG: 'Baixar selecionados como PNG',
    selecaoSair: 'Sair da seleção',

    // Estados / avisos
    autosaveOn: 'Salvamento automático ativo',
    autosaveOff: 'Salvamento automático indisponível — use “Salvar projeto”',
    projetoSalvo: 'Projeto salvo',
    projetoAberto: 'Projeto aberto',
    erroArquivo: 'Não foi possível ler este arquivo. Confira se é uma planilha válida.',
    erroProjeto: 'Arquivo de projeto inválido.',
    semSeries: 'Escolha pelo menos uma coluna de valores para desenhar o gráfico.',
    confirmarTrocarArquivo: 'Trocar o arquivo vai manter seus gráficos, mas eles podem ficar sem dados se as abas mudarem. Continuar?',
  },
};
