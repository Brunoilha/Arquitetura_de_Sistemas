// notification/consumer.js
import amqp from "amqplib";

async function startConsumer() {
  try {
    const connection = await amqp.connect("amqp://guest:guest@rabbitmq:5672");
    const channel = await connection.createChannel();
    const queue = "payment_notifications";

    await channel.assertQueue(queue, { durable: true });
    console.log("📡 Aguardando mensagens de pagamento...");

    channel.consume(queue, (msg) => {
      if (msg !== null) {
        const data = JSON.parse(msg.content.toString());
        console.log("🔔 Notificação recebida:", data);

        // Aqui você pode disparar e-mail, salvar log, etc.
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("Erro no consumidor RabbitMQ:", error);
  }
}

startConsumer();
