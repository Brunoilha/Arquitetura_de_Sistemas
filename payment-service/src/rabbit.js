import amqp from "amqplib";

let channel;

async function createConnection(rabbitUrl) {
  const connection = await amqp.connect(rabbitUrl);
  const ch = await connection.createChannel();
  await ch.assertQueue("payment_notifications", { durable: true });
  return { connection, ch };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Conecta no RabbitMQ com retry/backoff
export async function connectRabbit(options = {}) {
  const rabbitUrl = process.env.RABBITMQ_URL || "amqp://rabbitmq:5672";
  const maxRetries = options.maxRetries || 10;
  const baseDelay = options.baseDelay || 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { connection, ch } = await createConnection(rabbitUrl);
      channel = ch;
      console.log("📡 RabbitMQ conectado no payment-service!");
      return;
    } catch (err) {
      const delay = baseDelay * Math.min(30, 2 ** (attempt - 1));
      console.error(`❌ Erro ao conectar no RabbitMQ (tentativa ${attempt}/${maxRetries}):`, err.message || err);
      if (attempt < maxRetries) {
        console.log(`⏳ Re-tentando em ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      console.error("🚨 Não foi possível conectar ao RabbitMQ após várias tentativas.");
      throw err;
    }
  }
}

// Envia notificação para a fila
export function sendNotification(data) {
  if (!channel) {
    console.error("❌ Canal RabbitMQ não inicializado.");
    return;
  }

  const message = Buffer.from(JSON.stringify(data));

  channel.sendToQueue("payment_notifications", message, {
    persistent: true
  });

  console.log("📨 Evento enviado para a fila payment_notifications:", data);
}
