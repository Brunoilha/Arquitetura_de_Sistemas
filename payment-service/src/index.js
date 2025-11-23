import express from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { initKafka, disconnectKafka, producer, consumer } from './kafka.js';
import { connectRabbit, sendNotification } from './rabbit.js';

dotenv.config();

const app = express();
app.use(express.json());

const prisma = new PrismaClient();

// Função para processar pedidos do Kafka
async function processOrderFromKafka(orderEvent) {
  try {
    const { orderId, userId, products, totalValue, paymentMethod } = orderEvent;

    console.log('Processando pedido do Kafka:', orderId, 'método:', paymentMethod, 'valor:', totalValue);

    // Valida estoque e valores atuais consultando products_service
    let canProcess = true;
    let expectedAmount = 0;
    const productsDetails = [];

    for (const item of products) {
      try {
        const productRes = await axios.get(`http://products_service:3006/products/${item.productId}`);
        const product = productRes.data;
        productsDetails.push({ productId: item.productId, name: product.name, price: product.price, stock: product.stock, quantity: item.quantity });
        expectedAmount += (product.price || 0) * item.quantity;
        if (product.stock < item.quantity) {
          canProcess = false;
          break;
        }
      } catch (err) {
        console.error('Erro consultando produto:', item.productId, err.message);
        canProcess = false;
        break;
      }
    }

    // Verifica valor esperado vs enviado
    const diff = Math.abs(expectedAmount - (Number(totalValue) || 0));
    if (diff > 0.01) {
      canProcess = false;
      console.warn(`Valor mismatch para order ${orderId}: esperado=${expectedAmount} enviado=${totalValue}`);
    }

    // Decide resultado
    const success = canProcess && Math.random() > 0.2; // mantém chance de falha aleatória

    // Cria registro de pagamento no banco
    const paymentRecord = await prisma.payment.create({
      data: {
        orderId: String(orderId),
        amount: Number(totalValue) || expectedAmount,
        method: paymentMethod || 'unknown',
        status: success ? 'completed' : 'failed',
      }
    });

    // Se sucesso, atualiza estoque e notifica orders_service
    if (success) {
      for (const pd of productsDetails) {
        try {
          await axios.patch(`http://products_service:3006/products/${pd.productId}/stock`, { stock: pd.stock - pd.quantity });
        } catch (err) {
          console.error('Erro ao atualizar estoque:', pd.productId, err.message);
        }
      }

      await axios.patch(`http://orders_service:3002/orders/${orderId}/status`, { status: 'completed' });
      console.log(`✅ Pagamento concluído para order ${orderId}, payment id ${paymentRecord.id}`);

      // Envia evento de pagamento para tópico payments para quem precisar
      await producer.send({
        topic: 'payments',
        messages: [{ key: String(orderId), value: JSON.stringify({ orderId, paymentId: paymentRecord.id, status: 'completed', processedAt: new Date().toISOString() }) }]
      });

      // Envia notificação via RabbitMQ
      sendNotification({
        type: 'ORDER_COMPLETED',
        userId,
        orderId,
        message: 'Pagamento confirmado e pedido concluído',
        products: productsDetails
      });
    } else {
      await axios.patch(`http://orders_service:3002/orders/${orderId}/status`, { status: 'canceled' });
      console.log(`❌ Pagamento falhou para order ${orderId}, payment id ${paymentRecord.id}`);

      await producer.send({
        topic: 'payments',
        messages: [{ key: String(orderId), value: JSON.stringify({ orderId, paymentId: paymentRecord.id, status: 'failed', processedAt: new Date().toISOString() }) }]
      });

      sendNotification({
        type: 'ORDER_FAILED',
        userId,
        orderId,
        message: 'Pagamento falhou e pedido foi cancelado',
        products: productsDetails
      });
    }
  } catch (err) {
    console.error('Erro ao processar pagamento:', err);
  }
}

// Função para consumir eventos de pedidos do Kafka
async function consumeOrderEvents() {
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const orderEvent = JSON.parse(message.value.toString());
        console.log(`Pedido recebido (${topic}):`, orderEvent);
        await processOrderFromKafka(orderEvent);
      } catch (err) {
        console.error('Erro ao processar mensagem Kafka:', err);
      }
    }
  });
}

// Conecta Kafka e RabbitMQ ao iniciar o serviço e só depois inicia o server
async function start() {
  try {
    await initKafka();
    await connectRabbit();
    consumeOrderEvents(); // Inicia consumo de eventos (não aguarda)

    app.listen(3007, () => console.log('Payment service running on port 3007'));
  } catch (err) {
    console.error('❌ Erro ao iniciar payment service:', err);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Encerrando payment-service...');
  await disconnectKafka();
  process.exit(0);
});


app.post('/payments', async (req, res) => {
  const { orderId, amount, method } = req.body;

  try {
    const payment = await prisma.payment.create({
      data: { orderId, amount, status: 'pending', method }
    });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.patch('/payments/:id/process', async (req, res) => {
  const { id } = req.params;

  try {
    const payment = await prisma.payment.findUnique({ where: { id: Number(id) } });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const orderRes = await axios.get(`http://orders_service:3002/orders/${payment.orderId}`);
    const order = orderRes.data;

    let canProcess = true;
    let expectedAmount = 0;
    const productsDetails = [];

    // Calcula total esperado e valida estoque
    for (const item of order.products) {
      const productRes = await axios.get(`http://products_service:3006/products/${item.productId}`);
      const product = productRes.data;
      productsDetails.push({
        productId: item.productId,
        name: product.name,
        price: product.price,
        stock: product.stock,
        quantity: item.quantity
      });

      expectedAmount += (product.price || 0) * item.quantity;

      if (product.stock < item.quantity) {
        canProcess = false;
        break;
      }
    }

    if (!canProcess) {
      await prisma.payment.update({ where: { id: Number(id) }, data: { status: 'canceled' } });
      await axios.patch(`http://orders_service:3002/orders/${payment.orderId}/status`, { status: 'canceled' });
      return res.status(400).json({ error: 'Not enough stock, order canceled' });
    }

    // Verifica valor pago
    const paid = Number(payment.amount || 0);
    const diff = Math.abs(paid - expectedAmount);
    if (diff > 0.01) {
      await prisma.payment.update({ where: { id: Number(id) }, data: { status: 'canceled' } });
      await axios.patch(`http://orders_service:3002/orders/${payment.orderId}/status`, { status: 'canceled' });
      return res.status(400).json({ error: 'Payment amount mismatch', expectedAmount, paid });
    }

    // Atualiza estoque
    for (const detail of productsDetails) {
      await axios.patch(`http://products_service:3006/products/${detail.productId}/stock`, {
        stock: detail.stock - detail.quantity
      });
    }

    await prisma.payment.update({ where: { id: Number(id) }, data: { status: 'completed' } });
    await axios.patch(`http://orders_service:3002/orders/${payment.orderId}/status`, { status: 'completed' });

    // Envia evento RabbitMQ
    sendNotification({
      type: 'ORDER_COMPLETED',
      userId: order.userId,
      orderId: payment.orderId,
      message: 'Pagamento confirmado e pedido concluído',
      products: productsDetails
    });

    res.json({ message: 'Payment processed successfully' });

  } catch (err) {
    console.error('Error processing payment:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/payments', async (req, res) => {
  const { 'order-id': orderId } = req.query;
  try {
    const payments = await prisma.payment.findMany({
      where: { orderId }
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

