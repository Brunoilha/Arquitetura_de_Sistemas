// Arquivo: payment-service/src/kafka.js

import { Kafka } from 'kafkajs';

// Importa o serviço que processa a lógica de negócios
let paymentProcessor;

// O tópico que o Orders Service está usando para notificar pedidos criados
export const ORDER_CREATED_TOPIC = 'order.created';

const kafka = new Kafka({
  clientId: 'payments-service',
  // Usamos KAFKA_BROKERS do docker-compose se disponível
  brokers: [process.env.KAFKA_BROKERS || 'kafka:9092'],
});

// O payments-service será o Consumer principal
export const consumer = kafka.consumer({ groupId: 'payments-group' });
export const producer = kafka.producer();

/**
 * Inicializa (conecta) producer e consumer sem iniciar o run.
 * Pode ser usado por callers que gerenciam subscribe/run separadamente.
 */
export async function initKafka() {
    try {
        await producer.connect();
        await consumer.connect();
        console.log('✅ Kafka connected (payments-service)');
    } catch (err) {
        console.error('❌ Falha ao conectar Kafka (payments-service):', err.message);
        throw err;
    }
}

/**
 * Inicia a escuta de mensagens no tópico de pedidos criados.
 * @param {object} processor - O objeto/função que contém a lógica de processamento de pagamento.
 */
export async function runConsumer(processor) {
    paymentProcessor = processor;
    try {
        // conecta producer e consumer
        await producer.connect();
        await consumer.connect();
        console.log('✅ Kafka Consumer conectado (payments-service)');

        await consumer.subscribe({ 
            topic: ORDER_CREATED_TOPIC, 
            fromBeginning: false // Começa a consumir novas mensagens
        });

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const orderData = JSON.parse(message.value.toString());
                const orderId = orderData._id;

                console.log(`\n⬅️ Mensagem Kafka recebida: Tópico: ${topic}, Pedido ID: ${orderId}`);

                // Chama a função de processamento de pagamento que será definida no index.js
                await paymentProcessor.handleOrderCreated(orderData);
            },
        });
    } catch (err) {
        console.error('❌ Erro ao rodar Kafka Consumer:', err);
        throw err;
    }
}

export async function disconnectKafka() {
    try {
        await consumer.disconnect();
        await producer.disconnect();
        console.log('🔌 Kafka Consumer desconectado');
    } catch (error) {
        console.error('❌ Erro ao desconectar Kafka Consumer:', error);
    }
}

// Exportamos a conexão Kafka para uso futuro, se necessário
export { kafka };

/**
 * Envia evento informando o resultado do processamento do pagamento.
 * @param {{orderId:string, status:string, paymentId?:string, amount?:number}} payload
 */
export async function sendPaymentProcessed(payload) {
    try {
        await producer.send({
            topic: 'payment.processed',
            messages: [ { key: payload.orderId, value: JSON.stringify(payload) } ],
        });
        console.log('📤 Evento payment.processed enviado:', payload.orderId);
    } catch (err) {
        console.error('❌ Falha ao enviar payment.processed:', err.message);
    }
}