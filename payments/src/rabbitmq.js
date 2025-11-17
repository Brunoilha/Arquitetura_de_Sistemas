// payments/rabbitmq.js
import amqp from "amqplib";

export async function sendPaymentNotification(paymentData) {
  try {
    const connection = await amqp.connect("amqp://guest:guest@rabbitmq:5672");
    const channel = await connection.createChannel();
    const queue = "payment_notifications";

    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(paymentData)));

    console.log("📨 Mensagem enviada para RabbitMQ:", paymentData);

    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("Erro ao enviar mensagem ao RabbitMQ:", error);
  }
}
