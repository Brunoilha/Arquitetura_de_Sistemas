import { PrismaClient } from '@prisma/client';
// O consumer deve ser importado do seu módulo kafka.js (arquivo está em src/kafka.js)
import { consumer, initKafka, sendPaymentProcessed, ORDER_CREATED_TOPIC } from '../kafka.js';

// Inicializa o cliente Prisma para interagir com o PostgreSQL
const prisma = new PrismaClient();

/**
 * Processa a mensagem do Kafka de criação de pedido.
 * Esta função simula a lógica de pagamento e atualiza o status.
 * @param {object} orderData - Dados do pedido vindos do Kafka.
 */
async function processOrderCreated(orderData) {
    console.log(`[Kafka] Recebido Order ID: ${orderData.orderId}. Iniciando pagamento...`);

    // 1. Cria um registro de pagamento (status inicial: PENDING)
    // Nota: o schema Prisma para Payment não tem campo `userId` nem `paymentMethod`.
    // O campo de método se chama `method`. Ajustamos para usar apenas os campos existentes.
    let payment;
    try {
        payment = await prisma.payment.create({
            data: {
                orderId: String(orderData.orderId),
                amount: orderData.totalAmount ?? 0,
                status: 'PENDING',
                method: orderData.paymentMethod ?? 'unknown'
            },
        });
        console.log(`[DB] Pagamento criado (ID: ${payment.id}, Status: PENDING) para Order ID: ${orderData.orderId}`);
    } catch (error) {
        // Isso pode acontecer se o Payments Service for reiniciado e receber a mesma mensagem do Kafka
        if (error.code === 'P2002') {
             console.warn(`[DB] Pagamento para Order ID ${orderData.orderId} já existe. Pulando criação.`);
             payment = await prisma.payment.findUnique({ where: { orderId: orderData.orderId } });
             if (!payment) return; // Se não conseguir recuperar, sai.
        } else {
            console.error(`[DB] Erro ao criar registro de pagamento para Order ID ${orderData.orderId}: ${error.message}`);
            return;
        }
    }


    // 2. Simulação de um processamento de pagamento assíncrono (1 a 3 segundos)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

    // 3. Define um status aleatório (80% sucesso, 20% falha)
    const newStatus = Math.random() < 0.8 ? 'COMPLETED' : 'FAILED';

    // 4. Atualiza o registro de pagamento no banco de dados
    try {
        await prisma.payment.update({
            where: { id: payment.id },
            data: { status: newStatus, updatedAt: new Date() },
        });
        console.log(`[DB] Pagamento Order ID: ${orderData.orderId} atualizado para STATUS: ${newStatus}`);
    } catch (updateError) {
        console.error(`[DB] Erro ao atualizar status do pagamento para Order ID ${orderData.orderId}: ${updateError.message}`);
    }

    // Envia evento informando o resultado do pagamento para o Orders Service
    try {
        await sendPaymentProcessed({
            orderId: orderData.orderId,
            paymentId: payment.id,
            status: newStatus,
            amount: payment.amount || orderData.totalAmount || null,
        });
    } catch (err) {
        console.error('Erro ao publicar evento de payment.processed:', err.message);
    }
}

/**
 * Inicializa o consumidor Kafka para escutar eventos de criação de pedido.
 */
export async function initPaymentConsumer() {
    await initKafka(); // Conecta-se ao Kafka

    await consumer.subscribe({ topic: ORDER_CREATED_TOPIC, fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            try {
                const orderData = JSON.parse(message.value.toString());
                console.log(`[Kafka] Mensagem recebida no tópico ${topic}:`, orderData);
                await processOrderCreated(orderData);
            } catch (error) {
                console.error('Erro ao processar mensagem do Kafka:', error.message);
            }
        },
    });

    console.log('Consumidor de Pagamentos iniciado e ouvindo "order-created-topic".');
}

// -------------------------
// REST handlers for payments
// -------------------------

export async function createPayment(req, res) {
    try {
        const { orderId, userId, amount, paymentMethod } = req.body;
        const payment = await prisma.payment.create({
            data: {
                orderId,
                userId,
                amount,
                status: 'PENDING',
                paymentMethod: paymentMethod || 'unknown'
            }
        });
        return res.status(201).json(payment);
    } catch (err) {
        console.error('createPayment error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}

export async function getAllPayments(req, res) {
    try {
        const { order_id } = req.query;
        if (order_id) {
                // orderId is not a unique field in the schema (it's a String),
                // so use findFirst to return the first matching payment for that order.
                const payment = await prisma.payment.findFirst({ where: { orderId: String(order_id) } });
                if (!payment) return res.status(404).json({ error: 'Payment not found' });
                return res.json(payment);
            }
        const payments = await prisma.payment.findMany({ take: 100 });
        return res.json(payments);
    } catch (err) {
        console.error('getAllPayments error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}

export async function getPaymentById(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
        const payment = await prisma.payment.findUnique({ where: { id } });
        if (!payment) return res.status(404).json({ error: 'Payment not found' });
        return res.json(payment);
    } catch (err) {
        console.error('getPaymentById error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}

export async function processPayment(req, res) {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;
        if (!['PENDING','COMPLETED','FAILED','CANCELED'].includes((status||'').toUpperCase())) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const payment = await prisma.payment.update({ where: { id }, data: { status: status.toUpperCase(), processedAt: new Date() } });
        return res.json(payment);
    } catch (err) {
        console.error('processPayment error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}