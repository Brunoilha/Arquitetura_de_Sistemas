import express from 'express';
import mongoose from 'mongoose';
import { Order } from './models/Order.js';
import { initKafka, disconnectKafka, producer, consumer } from './kafka.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const maxRetries = 10;
const baseDelay = 1000; 

async function connectMongoDB(attempt = 1) {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
      retryWrites: true,
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    const delay = baseDelay * Math.min(30, 2 ** (attempt - 1));
    console.error(`❌ MongoDB connection failed (attempt ${attempt}/${maxRetries}):`, err.message);
    if (attempt < maxRetries) {
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectMongoDB(attempt + 1);
    }
    console.error('🚨 Could not connect to MongoDB after retries');
    throw err;
  }
}

// Conectar MongoDB e Kafka
await connectMongoDB();
await initKafka();

// Consumir mensagens de pagamento do Kafka (resultado do processamento de pagamento)
async function consumePaymentMessages() {
  // tópico padronizado para resultados de pagamento
  await consumer.subscribe({ topic: 'payment.processed', fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const payment = JSON.parse(message.value.toString());
        console.log('📥 Pagamento recebido (payment.processed):', payment);

        // Atualizar status do pedido baseado na resposta do pagamento
        const newStatus = (payment.status || '').toLowerCase() === 'completed' || (payment.status || '').toLowerCase() === 'success'
          ? 'completed'
          : 'canceled';

        const order = await Order.findByIdAndUpdate(
          payment.orderId,
          { status: newStatus },
          { new: true }
        );
        console.log('✅ Pedido atualizado:', order?._id?.toString());
      } catch (err) {
        console.error('❌ Erro ao processar pagamento:', err.message);
      }
    },
  });
}

// Iniciar consumidor
consumePaymentMessages().catch(console.error);

app.post('/orders', async (req, res) => {
  const { userId, products, paymentMethod } = req.body;
  
  try {
    // Validar que products tem valor
    if (!products || products.length === 0) {
      return res.status(400).json({ error: 'Products array cannot be empty' });
    }

    // Calcular totalValue
    const totalValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 1)), 0);

    // Criar pedido com status pending
    const order = await Order.create({ 
      userId, 
      products, 
      status: 'pending',
      totalValue,
      paymentMethod
    });

    // Enviar evento ao Kafka (order created) para que o Payments Service processe o pagamento
    await producer.send({
      topic: 'order.created',
      messages: [
        {
          key: order._id.toString(),
          value: JSON.stringify({
            orderId: order._id.toString(),
            userId,
            products,
            totalAmount: totalValue,
            paymentMethod,
            status: 'pending',
            createdAt: new Date().toISOString(),
          }),
        },
      ],
    });

    console.log('📤 Evento enviado ao Kafka:', order._id);
    res.json(order);
  } catch (err) {
    console.error('❌ Erro ao criar pedido:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/orders', async (_req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'completed', 'canceled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', service: 'orders-service' }));

const PORT = 3002;
app.listen(PORT, () => console.log(`Orders service running on port ${PORT}`));

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await disconnectKafka();
  process.exit(0);
});