const prisma = require("../db/prisma");

// Criar pedido
async function createOrder(req, res) {
  try {
    const { userId, productId, quantity, totalAmount, status } = req.body;

    const newOrder = await prisma.order.create({
      data: {
        userId,
        productId,
        quantity,
        totalAmount,
        status: status || "PENDING",
      },
    });

    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ error: "Error creating order", details: error.message });
  }
}

// Listar pedidos (ou filtrar por cliente)
async function getOrders(req, res) {
  try {
    const { client_id } = req.query;
    let orders;

    if (client_id) {
      orders = await prisma.order.findMany({
        where: { userId: parseInt(client_id) },
        include: { user: true, product: true },
      });
    } else {
      orders = await prisma.order.findMany({
        include: { user: true, product: true },
      });
    }

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Error fetching orders", details: error.message });
  }
}

// Buscar pedido por ID
async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: { user: true, product: true },
    });

    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Error fetching order", details: error.message });
  }
}

// Atualizar status do pedido
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ error: "Error updating order status", details: error.message });
  }
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
};
