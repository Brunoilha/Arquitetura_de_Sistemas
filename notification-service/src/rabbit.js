import amqp from "amqplib";
import axios from "axios";

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

export async function connectRabbit(options = {}) {
  const rabbitUrl = process.env.RABBITMQ_URL || "amqp://rabbitmq:5672";
  const maxRetries = options.maxRetries || 10;
  const baseDelay = options.baseDelay || 1000; // 1s

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { connection, ch } = await createConnection(rabbitUrl);
      channel = ch;

      console.log("📡 RabbitMQ conectado no notification-service!");
      console.log("👂 Aguardando mensagens na fila payment_notifications...\n");

      channel.consume("payment_notifications", async (msg) => {
        try {
          const content = JSON.parse(msg.content.toString());
          console.log("📥 Mensagem recebida:", content);

          const { userId, orderId } = content;

          // Buscar nome do usuário no user-service (serviço no docker-compose é `users_service` na porta 3005)
          const userRes = await axios.get(`http://users_service:3005/users/${userId}`);
          const user = userRes.data;

          const finalMsg = `${user.name}, seu pedido ${orderId} foi PAGO com sucesso e será despachado em breve!`;

          console.log("📢 Notificação processada:");
          console.log(finalMsg);

          // Confirma remoção da mensagem da fila
          channel.ack(msg);

        } catch (error) {
          console.error("❌ Erro ao processar mensagem:", error);
          channel.nack(msg, false, true);
        }
      });

      // successful connection — exit retry loop
      return;
    } catch (err) {
      const delay = baseDelay * Math.min(30, 2 ** (attempt - 1));
      console.error(`❌ Erro ao conectar ao RabbitMQ (tentativa ${attempt}/${maxRetries}):`, err.message || err);
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
