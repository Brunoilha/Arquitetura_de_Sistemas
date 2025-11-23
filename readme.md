# Arquitetura de Sistemas, PROJETO E-COMMERCE

Esse projeto é referente a criação de um e-commerce do zero, usando de diverças técniclogias para a criação da plataforma.
Projeto por José Arcangelo e Andrey Peil

Sexto semestre - Sistemas de Informação - AMF

##  Tecnologias Utilizadas

- **TypeScript**: Linguagem principal do backend.
- **Prisma**: ORM para interação com o banco de dados.
- **Docker**: Containerização da aplicação.
- **Docker Compose**: Orquestração de containers.
- **PostgreSQL**: Banco de dados relacional.
- **MongoDB**: Banco de dados não relacional.

## Estrutura dos Diretórios


<pre>
ArquiteturaDeSistemas/
├── backend/              # Código do backend em TypeScript
│   ├── src/              # Lógica principal: controllers, services, routes
│   ├── prisma/           # Modelo do banco e migrações
│   └── package.json      # Dependências e scripts do backend
├── docker-compose.yml    # Orquestração dos serviços
└── README.md             # Documentação do projeto
</pre>



### Detalhamento do backend

- **Controllers**: Responsáveis por receber as requisições HTTP e repassar para os serviços.
- **Services**: Contêm a lógica de negócio, validações e manipulação de dados.
- **Routes**: Definem os endpoints da API.
- **Prisma**: Modelos do banco de dados e migrações.



##  Fluxo de Funcionamento

1. **Cliente faz requisição HTTP** → rota definida no `routes`.
2. **Controller recebe a requisição** → valida dados básicos.
3. **Service executa a lógica de negócio** → valida regras específicas, consulta o banco via Prisma.
4. **Banco de dados retorna o resultado** → Prisma ORM garante consistência e integridade.
5. **Controller envia a resposta** → JSON com status da operação.


## Relação de Tabelas

O sistema possui uma relação entre as tabelas SQL permitindo a comunicação entre elas, UML exemplo
<img width="761" height="517" alt="image" src="https://github.com/user-attachments/assets/98b90624-6ef3-4882-a4ed-4476b8f683ca" />

##  Instalação e Execução

### Pré-requisitos

- Docker
- Docker Compose
- Node.js (para desenvolvimento local)

### Executando com Docker

bash: 

git clone https://github.com/JoseArcangelo/ArquiteturaDeSistemas.git
cd ArquiteturaDeSistemas
docker-compose up --build
cd backend
npm install
npm run dev


O sistema está sendo feito por dois alunos em uma matéria de faculdae, está em constante desenvolvimetno e alterações, este readme vai ser atualizado com o andamento da matéria.

autores:
José e Andrey.
