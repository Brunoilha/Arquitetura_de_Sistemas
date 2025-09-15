const prisma = require("../db/prisma");

async function getAllPayments(req, res) {
  try {
    const payments = await prisma.order_Payments.findMany({
      include: {
        status: true,
        tipo_pagamento: true,
      },
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: "Error fetching payments" });
  }
}

async function getPaymentById(req, res) {
  try {
    const { id } = req.params;
    const payment = await prisma.order_Payments.findUnique({
      where: { id: parseInt(id) },
      include: {
        status: true,
        tipo_pagamento: true,
      },
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: "Error fetching payment" });
  }
}

async function createPayment(req, res) {
  try {
    const { order_id, amount, statusId, tipoPagamentoId } = req.body;
    const payment = await prisma.order_Payments.create({
      data: {
        order_id,
        amount,
        statusId,
        tipoPagamentoId,
      },
    });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: "Error creating payment" });
  }
}

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
};
