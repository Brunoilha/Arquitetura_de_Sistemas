import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'orders-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: 'orders-group' });

export async function initKafka() {
  try {
    await producer.connect();
    await consumer.connect();
    console.log('Kafka conectado (orders-service)');
  } catch (err) {
    console.error('Erro ao conectar Kafka:', err);
    throw err;
  }
}

export async function disconnectKafka() {
  await producer.disconnect();
  await consumer.disconnect();
  console.log('Kafka desconectado');
}
