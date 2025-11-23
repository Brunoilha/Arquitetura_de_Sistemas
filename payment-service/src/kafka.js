import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'payment-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: 'payments-group' });

export async function initKafka() {
  try {
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: 'pedidos' });
    console.log('✅ Kafka conectado (payment-service)');
  } catch (err) {
    console.error('❌ Erro ao conectar Kafka:', err);
    throw err;
  }
}

export async function disconnectKafka() {
  try {
    await producer.disconnect();
    await consumer.disconnect();
    console.log('🔌 Kafka desconectado');
  } catch (err) {
    console.error('❌ Erro ao desconectar Kafka:', err);
  }
}
