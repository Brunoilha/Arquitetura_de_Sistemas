# Arquitetura G1 - Backend

Este projeto é um **backend em Node.js** utilizando **Express**, **Prisma ORM** e **PostgreSQL (via Docker)**.  
Ele implementa uma API RESTful simples para **gerenciamento de produtos e pedidos**.

---

## 🚀 Tecnologias Utilizadas
- **Node.js** → Ambiente de execução JavaScript.
- **Express** → Framework minimalista para criação de APIs.
- **Prisma** → ORM para comunicação com o banco de dados.
- **PostgreSQL** → Banco de dados relacional.
- **Docker** → Contêinerização do banco de dados.
- **dotenv** → Gerenciamento de variáveis de ambiente.

---

## 📂 Estrutura do Projeto

```
backend/
 ├── .env                  # Variáveis de ambiente
 ├── package.json          # Dependências e scripts
 ├── prisma/
 │   ├── schema.prisma     # Definição do modelo de dados
 │   └── migrations/       # Migrations do banco
 └── src/
     ├── server.js         # Inicializa o servidor Express
     ├── controllers/      # Lógica das requisições (produtos e pedidos)
     ├── routes/           # Definição de rotas da API
     ├── db/               # Configuração do Prisma Client
     └── utils/            # Funções auxiliares (ex: validações)
```

---

## ⚡ Fluxo de Requisições

1. O cliente envia uma requisição HTTP (`GET`, `POST`, `PUT`, `DELETE`).  
2. O **Express (server.js)** recebe e encaminha para a rota correspondente.  
3. O **Router** aciona o **Controller** responsável.  
4. O **Controller** valida dados e utiliza o **Prisma** para acessar o banco.  
5. O **PostgreSQL (Docker)** executa a query.  
6. O resultado retorna ao cliente em **JSON**.

Exemplo de criação de produto (`POST /products`):
- Cliente → Router → Controller → Prisma → Postgres → Resposta JSON.

---

## 📌 Endpoints da API

### Produtos
- `GET /products` → Lista todos os produtos
- `POST /products` → Cria um novo produto
- `PUT /products/:id` → Atualiza um produto
- `DELETE /products/:id` → Remove um produto

### Pedidos
- `GET /orders` → Lista todos os pedidos
- `POST /orders` → Cria um pedido
- `DELETE /orders/:id` → Remove um pedido

---
