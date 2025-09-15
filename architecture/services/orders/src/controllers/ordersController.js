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
        status: status || "PENDING"
      },
    });

    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ error: "Error creating order", details: error.message });
  }
}

// Listar todos os pedidos
async function getOrders(req, res) {
  try {
    const orders = await prisma.order.findMany({
      include: { user: true, product: true }
    });
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
      include: { user: true, product: true }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Error fetching order", details: error.message });
  }
}

// Atualizar pedido
async function updateOrder(req, res) {
  try {
    const { id } = req.params;
    const { quantity, totalAmount, status } = req.body;

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { quantity, totalAmount, status },
    });

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ error: "Error updating order", details: error.message });
  }
}

// Deletar pedido
async function deleteOrder(req, res) {
  try {
    const { id } = req.params;
    await prisma.order.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Error deleting order", details: error.message });
  }
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
};
