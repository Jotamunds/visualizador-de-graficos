# Visualizador de Dados

Um site que roda **offline** (sem internet, sem instalar nada) para importar
planilhas (`.xlsx`, `.xlsm`, `.csv`) e montar gráficos configuráveis, organizá-los
livremente na tela e exportar em imagem ou PDF.

Tudo acontece no seu navegador. Nenhum dado sai do computador.

---

## Como abrir

### Jeito rápido (duplo-clique)
Abra a pasta e dê **duplo-clique em `index.html`**. Pronto — funciona.
Importar planilha, montar gráficos, exportar e **salvar/abrir projeto (arquivo `.json`)**
funcionam normalmente assim.

> Observação: nesse modo, o **salvamento automático** pode ficar desativado em
> alguns navegadores (é uma limitação de segurança deles ao abrir arquivos direto
> do disco). Se aparecer *"Salvamento automático indisponível"* na barra de cima,
> use o botão **Salvar projeto** para guardar seu trabalho num arquivo — ou abra
> pelo jeito abaixo.

### Jeito completo (com salvamento automático)
Rode um servidor local simples dentro da pasta. Se você tem **Python** instalado:

- **Windows:** duplo-clique em `abrir.bat`
- **Mac/Linux:** no terminal, `bash abrir.sh`

Isso abre o site em `http://localhost:8000` e o salvamento automático fica ativo.

---

## Como usar

1. **Importe** uma planilha (arraste para a área central ou clique em *Selecionar arquivo*).
2. Clique em **Adicionar gráfico**. Escolha a **aba** e depois:
   - **Tabela nomeada** da aba, ou
   - **Intervalo manual** (ex.: `A1:F50`) — a 1ª linha é o cabeçalho.
     Se o intervalo estiver errado, o app avisa e você tenta de novo.
3. O gráfico aparece. Na **barra lateral esquerda** dele:
   - ⚙️ **Configurações** — tipo de gráfico, colunas, cores, títulos, legenda, agregação.
   - 🔽 **Filtros** — filtra as linhas antes de desenhar.
   - ⬇️ **Exportar** — PNG, JPEG ou PDF só deste gráfico.
   - ✕ **Excluir** (com confirmação).
   - As bolinhas embaixo são a **asa para arrastar** o gráfico.
4. **Arraste e redimensione** os gráficos livremente. Use *Gráficos por linha* para
   organizar rápido.
5. **Imprimir / exportar vários**: entra no modo seleção, você marca os gráficos e
   exporta todos num PDF (uma página cada) ou como imagens.
6. **Salvar projeto** gera um arquivo `.json` com **tudo dentro** (dados + gráficos +
   layout). **Abrir projeto** restaura exatamente como estava.

---

## Como personalizar (sem quebrar nada)

Tudo que você provavelmente vai querer mudar está em **dois lugares**:

### 1. Textos, nome e opções → `js/config.js`
- `nomeApp` — o nome que aparece no topo.
- `TEXTOS` — **todas** as palavras da interface. Mude à vontade.
- `paletaGraficos` — as cores das séries dos gráficos.
- `padroes` — como um gráfico novo já nasce (tipo, agregação, etc.).
- `tiposGrafico`, `funcoesAgregacao`, `opcoesColunas` — as listas de opções.

### 2. Cores do tema (fundo, texto, botões) → `css/style.css`
No topo do arquivo, o bloco `:root` tem as variáveis do tema:
```css
--cor-primaria: #2f6690;   /* cor dos botões principais */
--cor-canvas:   #f4f6f8;   /* fundo da página */
--cor-texto:    #1f2a37;   /* cor do texto */
```
Trocar aqui muda o site inteiro de uma vez.

---

## Mapa dos arquivos (para quem quiser mexer no código)

```
index.html          Estrutura da página + carrega libs e módulos (nesta ordem).
css/style.css       Aparência. Tema no :root (mude só aqui para trocar cores).
js/
  config.js         Nome, padrões, paleta e TODOS os textos. Comece por aqui.
  storage.js        Salvamento automático (IndexedDB) com fallback silencioso.
  parser.js         Lê a planilha e entrega dados limpos. Isola o SheetJS.
  aggregate.js      Filtra as linhas e agrega (soma/média/contagem/mín/máx).
  export.js         Exporta gráficos em PNG/JPEG/PDF (um ou vários).
  ui.js             Modal, confirmação e toast reutilizáveis.
  chartCard.js      Um gráfico: barra lateral, config, filtros, o Chart.js.
  dashboard.js      A coleção de gráficos, o layout (gridstack) e o "novo gráfico".
  project.js        Arquivo de projeto .json (salvar/abrir) — o "banco portátil".
  app.js            Liga tudo: importação, botões e salvamento automático.
vendor/             Bibliotecas embutidas (offline): SheetJS, Chart.js, gridstack, jsPDF.
```

**Ideia de arquitetura:** o `parser.js` transforma a planilha num "modelo" limpo;
ninguém mais no app precisa saber que existe o SheetJS. Cada gráfico é um
`ChartCard` independente. O `project.js` é o único que sabe o formato do arquivo
salvo — então, se um dia você quiser trocar por outro formato (ex.: SQLite), mexe
só nele.

---

## Perguntas rápidas

**Preciso de internet?** Não. Tudo roda local, inclusive as bibliotecas.

**Meus dados vão para algum servidor?** Não. Ficam só no seu navegador/arquivos.

**Posso compartilhar a pasta com colegas?** Sim. É só zipar e enviar; eles abrem o
`index.html` do mesmo jeito.
