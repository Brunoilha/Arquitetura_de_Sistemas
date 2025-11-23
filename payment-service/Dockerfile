FROM node:20

# Definir diretório de trabalho
WORKDIR /app

# Copia apenas package.json e package-lock para aproveitar cache
COPY package*.json ./

# Instala dependências
RUN npm ci --only=production || npm install

# Copia o restante do código (src, prisma, etc)
COPY . .

# Gera o Prisma Client (se aplicável)
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

# Expõe a porta usada pelo serviço
EXPOSE 3007

# Comando de inicialização
CMD ["sh", "-c", "npx prisma generate || true && node src/index.js"]
