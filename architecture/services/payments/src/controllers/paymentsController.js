const prisma = require("../db/prisma");

// Criar pagamento
async function createPayment(req, res) {
  try {
    const { orderId, amount, status } = req.body;

    const newPayment = await prisma.payment.create({
      data: {
        orderId,
        amount,
        status: status || "PENDING",
      },
    });

    res.status(201).json(newPayment);
  } catch (error) {
    res.status(500).json({ error: "Error creating payment", details: error.message });
  }
}

// Listar pagamentos (ou filtrar por pedido)
async function getAllPayments(req, res) {
  try {
    const { order_id } = req.query;
    let payments;

    if (order_id) {
      payments = await prisma.payment.findMany({
        where: { orderId: parseInt(order_id) },
        include: { order: true },
      });
    } else {
      payments = await prisma.payment.findMany({ include: { order: true } });
    }

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: "Error fetching payments", details: error.message });
  }
}

// Buscar pagamento por ID
async function getPaymentById(req, res) {
  try {
    const { id } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(id) },
      include: { order: true },
    });

    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: "Error fetching payment", details: error.message });
  }
}

// Processar pagamento
async function processPayment(req, res) {
  try {
    const { id } = req.params;

    const updatedPayment = await prisma.payment.update({
      where: { id: parseInt(id) },
      data: { status: "PROCESSED" },
    });

    res.json(updatedPayment);
  } catch (error) {
    res.status(500).json({ error: "Error processing payment", details: error.message });
  }
}

module.exports = {
  createPayment,
  getAllPayments,
  getPaymentById,
  processPayment,
};
