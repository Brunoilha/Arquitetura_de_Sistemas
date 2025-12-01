FROM node:20

WORKDIR /app

# Copia dependências
COPY package*.json ./

RUN npm ci --only=production || npm install

# Copia o código
COPY . .

# Gera o Prisma Client
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

EXPOSE 3007

# Use the JS starter so migrations (or db push fallback) run at container start
CMD ["sh", "-c", "npx prisma generate || true && node src/start.js"]
