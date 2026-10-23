# Pantanal Frota

Sistema de gestão de frota da **Pantanal Licenças** para o transportador controlar cada veículo:
despesas (combustível, manutenção, pneus, seguro, licenciamento/CRLV, exames, pedágio, multas, comissões),
entradas (fretes), vencimentos de documentos (CRLV, seguro, ANTT, tacógrafo, CNH, toxicológico, ASO)
e relatório mensal por veículo.

## Tecnologias

- **API:** Node.js 22 + Express, banco SQLite com o módulo nativo `node:sqlite` (não precisa instalar banco).
- **Web:** React 18 + React Router + Vite.

## Requisitos

- Node.js **22.13 ou superior** (`node -v`).

## Como rodar em desenvolvimento

```bash
npm install          # instala API e web (workspaces)
npm run seed         # opcional: carrega 3 veículos, 3 motoristas e 25 lançamentos de exemplo
npm run dev          # API em http://localhost:3333 e web em http://localhost:5173
```

Abra **http://localhost:5173**. O Vite encaminha as chamadas `/api` para a API.

## Produção

```bash
npm run build        # gera web/dist
npm start            # a API serve a web e a API em http://localhost:3333
```

Variáveis de ambiente:

| Variável | Padrão | Uso |
|---|---|---|
| `PORT` | `3333` | Porta da API |
| `DB_PATH` | `server/data/pantanal.db` | Arquivo do banco SQLite |

Para backup, basta copiar o arquivo do banco com a API parada.

## Testes

```bash
npm test -w server
```

## Estrutura

```
server/
  src/app.js      rotas da API e validações
  src/db.js       esquema do banco e acesso aos dados
  src/regras.js   categorias, cálculos (resultado, km/L, custo por km) e vencimentos
  src/seed.js     dados de exemplo
  test/           testes da API e das regras
web/
  src/pages/      Painel, Entradas e saídas, Veículos, Motoristas, Vencimentos, Multas, Relatório mensal
  src/components/ layout, formulários e componentes visuais
```

## Principais rotas da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/painel?mes=AAAA-MM` | Resumo do mês, série de 6 meses, alertas e resultado por veículo |
| GET/POST/PUT/DELETE | `/api/veiculos` | Cadastro de veículos |
| GET/POST/PUT/DELETE | `/api/motoristas` | Cadastro de motoristas |
| GET/POST/PUT/DELETE | `/api/lancamentos` | Entradas e saídas (filtros: `mes`, `veiculoId`, `tipo`, `categoria`, `q`) |
| GET | `/api/lancamentos.csv` | Exporta os lançamentos filtrados |
| GET | `/api/vencimentos` | Documentos vencidos, próximos e em dia |
| POST | `/api/vencimentos/renovar` | Registra nova validade e, opcionalmente, a despesa |
| GET | `/api/multas` | Multas com totais e motorista com mais pontos |
| GET | `/api/relatorio?mes=&veiculoId=` | Relatório mensal da frota ou de um veículo |
| GET | `/api/relatorio.csv` | Exporta o relatório |

Ao lançar um **frete** com motorista que tem % de comissão, a API pode criar a comissão automaticamente
(`gerarComissao: true`). O km informado em um lançamento atualiza o hodômetro do veículo.
