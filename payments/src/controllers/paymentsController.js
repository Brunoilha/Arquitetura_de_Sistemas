// payments/src/controllers/paymentsController.js
const prisma = require("../db/prisma");
const axiosInstance = require("../utils/axiosInstance"); 

// Bases (com fallback)
const ORDERS_BASE   = process.env.ORDERS_BASE_URL   || "http://orders:3002/order-service/v1/orders";
const PRODUCTS_BASE = process.env.PRODUCTS_BASE_URL || "http://products:3001/product-service/v1/products";
const NOTIF_BASE    = process.env.NOTIF_BASE_URL    || "http://notification:3005/notification-service/v1/notify";

// Atualiza estoque de um produto (delta pode ser negativo para reduzir)
async function adjustProductStock(productId, delta) {
  const url = `${PRODUCTS_BASE}/${productId}/stock`;
  const resp = await axiosInstance.patch(url, { stockDelta: Number(delta) });
  return resp.data;
}

// PATCH /payment-service/v1/payments/:id/process
async function processPayment(req, res) {
  try {
    const { id } = req.params;

    // 1) Buscar pagamento
    const payment = await prisma.payment.findUnique({
      where: { id: Number(id) },
    });
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    if (payment.status && payment.status !== "PENDING") {
      return res
        .status(400)
        .json({ error: "Payment already processed or not in PENDING state" });
    }

    // 2) Buscar order (orderId é string / ObjectId)
    const orderId = String(payment.orderId);
    const orderResp = await axiosInstance.get(`${ORDERS_BASE}/${orderId}`);
    const order = orderResp.data;
    if (!order) {
      await prisma.payment.update({
        where: { id: Number(id) },
        data: { status: "FAILED" },
      });
      return res.status(404).json({ error: "Related order not found" });
    }

    // 3) Normalizar itens
    const items = Array.isArray(order.products)
      ? order.products
      : (order.productId && order.quantity
          ? [{ productId: order.productId, quantity: order.quantity }]
          : []);

    if (!items.length) {
      await prisma.payment.update({
        where: { id: Number(id) },
        data: { status: "FAILED" },
      });
      return res.status(400).json({ error: "Order has no items" });
    }

    // 4) Verificar e reduzir estoque
    const updated = [];
    try {
      for (const item of items) {
        const pid = String(item.productId ?? item.product_id ?? item.id);
        const qty = Number(item.quantity ?? item.qty ?? 1);

        // (opcional) conferir produto
        const prod = (await axiosInstance.get(`${PRODUCTS_BASE}/${pid}`)).data;
        if (!prod) throw new Error(`Product ${pid} not found`);
        if ((prod.stock ?? 0) < qty) {
          throw new Error(`Insufficient stock for product ${pid}`);
        }

        // reduzir
        await adjustProductStock(pid, -qty);
        updated.push({ pid, qty });
      }
    } catch (e) {
      // rollback de estoque
      for (const u of updated) {
        try { await adjustProductStock(u.pid, +u.qty); } catch {}
      }
      await prisma.payment.update({
        where: { id: Number(id) },
        data: { status: "FAILED" },
      });
      try { await axiosInstance.patch(`${ORDERS_BASE}/${orderId}/status`, { status: "CANCELED" }); } catch {}
      return res.status(400).json({ error: "Insufficient stock or product not found", details: e.message });
    }

    // 5) Simular gateway
    const successProbability = parseFloat(process.env.PAYMENT_SUCCESS_PROB || "0.7");
    const ok = Math.random() <= successProbability;

    if (!ok) {
      // rollback estoque + cancelar order
      for (const u of updated) {
        try { await adjustProductStock(u.pid, +u.qty); } catch {}
      }
      await prisma.payment.update({
        where: { id: Number(id) },
        data: { status: "FAILED" },
      });
      try { await axiosInstance.patch(`${ORDERS_BASE}/${orderId}/status`, { status: "CANCELED" }); } catch {}
      return res.status(402).json({ error: "Payment processing failed (simulated)" });
    }

    // 6) Sucesso: marcar pagamento como PAID e order como PAID
    const processed = await prisma.payment.update({
      where: { id: Number(id) },
      data: { status: "PAID" }, // <<<< status válido no seu enum
    });

    try {
      await axiosInstance.patch(`${ORDERS_BASE}/${orderId}/status`, { status: "PAID" });
    } catch (e) {
      // falhou marcar order como PAID -> rollback pesado
      await prisma.payment.update({
        where: { id: Number(id) },
        data: { status: "FAILED" },
      });
      for (const u of updated) {
        try { await adjustProductStock(u.pid, +u.qty); } catch {}
      }
      return res.status(500).json({ error: "Could not update order to PAID. Rolled back." });
    }

    // 7) Notificação (não bloqueia)
    axiosInstance.post(NOTIF_BASE, {
      clientId: order.userId ?? order.clientId ?? order.client_id,
      message: `Your order ${orderId} was paid and confirmed.`,
    }).catch(() => {});

    return res.json({ success: true, payment: processed });
  } catch (error) {
    console.error("processPayment error:", error);
    return res.status(500).json({ error: "Error processing payment", details: error.message });
  }
}

// POST /payment-service/v1/payments
async function createPayment(req, res) {
  try {
    const { orderId, amount, status } = req.body;
    if (!orderId || amount == null) {
      return res.status(400).json({ error: "orderId e amount são obrigatórios" });
    }
    const p = await prisma.payment.create({
      data: {
        orderId: String(orderId),     // << string
        amount: Number(amount),
        status: status || "PENDING",
      },
    });
    return res.status(201).json(p);
  } catch (err) {
    return res.status(500).json({ error: "Error creating payment", details: err.message });
  }
}

// GET /payment-service/v1/payments?order_id=...
async function getAllPayments(req, res) {
  try {
    const { order_id } = req.query;
    let payments;
    if (order_id) {
      payments = await prisma.payment.findMany({
        where: { orderId: String(order_id) },  // << string
        orderBy: { createdAt: "desc" },
      });
    } else {
      payments = await prisma.payment.findMany({ orderBy: { createdAt: "desc" } });
    }
    return res.json(payments);
  } catch (err) {
    return res.status(500).json({ error: "Error fetching payments", details: err.message });
  }
}

// GET /payment-service/v1/payments/:id
async function getPaymentById(req, res) {
  try {
    const { id } = req.params;
    const payment = await prisma.payment.findUnique({ where: { id: Number(id) } });
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    return res.json(payment);
  } catch (err) {
    return res.status(500).json({ error: "Error fetching payment", details: err.message });
  }
}

module.exports = {
  createPayment,
  getAllPayments,
  getPaymentById,
  processPayment,
};
