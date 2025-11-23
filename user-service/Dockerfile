FROM node:18-alpine

# Diretório de trabalho
WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia todo o código (incluindo prisma/schema.prisma)
COPY . .

# Gera Prisma Client
RUN npx prisma generate

# Expõe porta do serviço
EXPOSE 3005

# Comando padrão
CMD ["node", "src/index.js"]
