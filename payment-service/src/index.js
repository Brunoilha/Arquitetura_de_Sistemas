// payment-service/src/index.js

import express from "express";
import { PrismaClient } from "@prisma/client";
import { initPaymentConsumer } from "./controllers/paymentController.js";
import { disconnectKafka } from "./kafka.js";
import paymentsRoutes from './routes/paymentsroutes.js';

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "payments-service",
    listener: "kafka-consumer",
  });
});

// Endpoint minimal para consultar pagamentos (útil para o seed script)
app.get('/payments', async (req, res) => {
  try {
    const { order_id } = req.query;
    if (order_id) {
      const payment = await prisma.payment.findUnique({ where: { orderId: order_id } });
      if (!payment) return res.status(404).json({ error: 'Payment not found' });
      return res.json(payment);
    }
    const payments = await prisma.payment.findMany({ take: 100 });
    res.json(payments);
  } catch (err) {
    console.error('Erro na rota /payments:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Mount payments routes (API)
app.use('/payment-service/v1/payments', paymentsRoutes);

// Inicialização do serviço
async function start() {
  try {
    await initPaymentConsumer();

    app.listen(3007, () => {
      console.log("✅ Payment Service rodando na porta 3007");
      console.log("✅ Consumidor do Kafka escutando: order-created-topic");
    });
  } catch (error) {
    console.error("❌ Erro ao iniciar o Payment Service:", error);
    process.exit(1);
  }
}

start();

// Encerramento limpo
process.on("SIGTERM", async () => {
  console.log("Encerrando Payment Service...");
  await disconnectKafka();
  await prisma.$disconnect();
  process.exit(0);
});
