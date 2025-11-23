import express from 'express';
import { connectRabbit } from './rabbit.js';

const app = express();
const port = process.env.PORT || 3008;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

app.post('/notify', (req, res) => {
  const { userId, orderId, message } = req.body || {};

  if (!userId || !orderId) {
    return res.status(400).json({ success: false, error: 'userId and orderId are required' });
  }

  console.log('📨 Notification sent manually:', { userId, orderId, message });
  return res.json({ success: true, message: 'Manual notification sent' });
});

// Start server + RabbitMQ listener
app.listen(port, () => {
  console.log(`notification-service listening on port ${port}`);
  connectRabbit();
});
