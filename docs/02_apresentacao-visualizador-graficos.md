# Base PCP — Visualizador de Gráficos

## Visão geral

Este projeto apresenta uma base de dados fictícia de Planejamento e Controle da Produção (PCP), organizada no arquivo `02_base-visualizador-graficos.xlsx`. A solução reúne informações de ordens de produção, atrasos, materiais e pedidos para gerar indicadores e visualizações sobre desempenho produtivo, estoque e carteira.

O projeto simula um fluxo de análise de dados industriais: estruturação das bases, tratamento dos registros, cálculo de KPIs e apresentação dos resultados em gráficos e resumos gerenciais.

> Todos os clientes, fornecedores, materiais, pedidos, ordens e valores são fictícios e foram criados exclusivamente para demonstração em portfólio.

## Problema de negócio

O PCP precisa acompanhar simultaneamente produção, prazos, capacidade, materiais e pedidos. Sem uma base estruturada, torna-se difícil identificar gargalos e priorizar ações.

O projeto foi desenvolvido para responder a perguntas como:

- Qual é o percentual de ordens concluídas no prazo?
- Quantas ordens estão atrasadas ou em risco?
- Qual centro de trabalho concentra mais atrasos?
- Quais são as principais causas de atraso?
- Quais materiais estão abaixo do estoque de segurança?
- A cobertura atual é suficiente para aguardar o fornecedor?
- Qual é o valor financeiro armazenado em estoque?
- Qual é o valor da carteira de pedidos em aberto?
- Existe crescimento ou sazonalidade na demanda?

## Estrutura da planilha

### KPIs

Apresenta um resumo dos principais indicadores calculados a partir das demais abas.

Exemplos:

- Total de ordens;
- Ordens concluídas;
- Ordens atrasadas;
- Percentual de entrega no prazo (`OTD`);
- Quantidade de materiais críticos;
- Valor total mantido em estoque.

### Ordens Producao

Contém os registros das ordens planejadas, em andamento, concluídas ou atrasadas.

Principais campos:

- Número da ordem;
- Material e família;
- Centro de trabalho;
- Descrição do centro;
- Quantidade planejada;
- Quantidade produzida;
- Data de criação;
- Data planejada;
- Data real de conclusão;
- Status.

Essa base possibilita calcular produtividade, backlog, lead time e cumprimento dos prazos.

### Apontamentos Atraso

Registra as ocorrências relacionadas aos atrasos das ordens.

Principais campos:

- Número da ordem;
- Centro de trabalho;
- Código do motivo;
- Motivo do atraso;
- Dias de atraso;
- Prioridade;
- Responsável.

Esses dados permitem construir análises de Pareto e identificar as causas e os centros de trabalho que mais afetam o desempenho da produção.

### Materiais

Apresenta os dados necessários para analisar estoque, cobertura e risco de ruptura.

Principais campos:

- Código e descrição do material;
- Família;
- Código do fornecedor;
- Estoque atual;
- Estoque de segurança;
- Consumo médio diário;
- Lead time do fornecedor;
- Custo unitário;
- Fornecedor.

Com esses campos, é possível identificar materiais abaixo do estoque de segurança ou cuja cobertura seja menor que o tempo necessário para reposição.

### Pedidos

Representa a carteira de pedidos dos clientes.

Principais campos:

- Número do pedido;
- Cliente;
- Material e família;
- Data do pedido;
- Data prometida;
- Quantidade;
- Valor unitário;
- Status do atendimento.

Essa base permite analisar carteira aberta, valor dos pedidos, atendimento por cliente e evolução da demanda ao longo do tempo.

## Indicadores e análises possíveis

- OTD — percentual de ordens concluídas no prazo;
- Lead time médio de produção;
- Total de ordens atrasadas;
- Backlog por centro de trabalho;
- Pareto dos motivos de atraso;
- Dias médios de atraso;
- Materiais abaixo do estoque de segurança;
- Cobertura de estoque em dias;
- Comparação entre cobertura e lead time do fornecedor;
- Valor financeiro do estoque;
- Carteira de pedidos em aberto;
- Evolução mensal da demanda;
- Pedidos por cliente e família de material.

## Tecnologias e competências demonstradas

- Excel e tabelas estruturadas;
- Tratamento e modelagem de dados;
- Definição de KPIs industriais;
- Análise exploratória de dados;
- Python e Pandas;
- SQL, relacionamentos e consultas analíticas;
- Visualização de dados e construção de dashboards;
- Conhecimento de PCP, estoque e Supply Chain;
- Interpretação de indicadores para apoio à decisão.

## Como utilizar a planilha

1. Abra `02_base-visualizador-graficos.xlsx`.
2. Consulte a aba `KPIs` para visualizar o resumo inicial.
3. Utilize filtros nas abas de dados para explorar ordens, motivos, materiais e pedidos.
4. Para utilizar a base no projeto Python/SQL, exporte individualmente as quatro abas de dados como arquivos CSV UTF-8.

Nomes recomendados para exportação:

```text
ordens_producao.csv
apontamentos_atraso.csv
materiais.csv
pedidos.csv
```

Os arquivos devem ser colocados na pasta `data/raw` do projeto PCP Analytics.

## Cuidados ao atualizar a base

- Preserve os nomes e a ordem dos cabeçalhos.
- Mantenha os identificadores de ordens e materiais como texto.
- Preencha datas em formato reconhecido pelo Excel.
- Utilize valores numéricos para quantidades e custos.
- Padronize os status para evitar categorias duplicadas.
- Não insira informações confidenciais de empresas no repositório público.

## Aplicação no portfólio

Este projeto demonstra um processo analítico mais amplo do que a simples criação de gráficos. Ele cobre a organização de dados transacionais, o relacionamento entre diferentes entidades, a definição de indicadores e a transformação dos resultados em informações para tomada de decisão.

O projeto pode ser apresentado para oportunidades como:

- Analista de Dados Júnior;
- Assistente de BI;
- Estágio em Dados ou Business Intelligence;
- Analista de PCP;
- Analista de Operações;
- Analista de Supply Chain.

## Autor

**João Gabriel Vieira da Silva**  
Sistemas de Informação | Excel | Python | SQL | SAP | Análise de Dados

