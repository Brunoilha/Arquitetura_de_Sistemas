const prisma = require('../db/prisma');

function isPositiveInt(n) {
  return Number.isInteger(n) && n > 0;
}

// Buscar todos os pedidos
async function getAllOrders(req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { id: 'asc' },
      include: {
        items: { include: { product: true } },
        client: true,
        payments: true,
      },
    });
    return res.json(orders);
  } catch (err) {
    return next(err);
  }
}

// Buscar pedidos de um cliente específico
async function getOrdersByClient(req, res, next) {
  try {
    const clientId = Number(req.params.clientId);
    if (!Number.isInteger(clientId)) {
      return res.status(400).json({ erro: 'ID de cliente inválido.' });
    }

    const orders = await prisma.order.findMany({
      where: { clientId },
      include: { items: { include: { product: true } }, payments: true },
    });
    return res.json(orders);
  } catch (err) {
    return next(err);
  }
}

// Criar pedido
async function createOrder(req, res, next) {
  try {
    const { clientId, items } = req.body;

    if (!Number.isInteger(clientId)) {
      return res.status(400).json({ erro: 'clientId é obrigatório e deve ser inteiro.' });
    }

    const customer = await prisma.customer.findUnique({ where: { id: clientId } });
    if (!customer) return res.status(400).json({ erro: 'Cliente inexistente.' });

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ erro: 'O campo items deve ter pelo menos 1 item.' });
    }

    const normalized = items
      .map(it => ({
        productId: Number(it.productId ?? it.id ?? it.product_id),
        amount: Number(it.amount ?? it.qty ?? it.quantity),
      }))
      .filter(it => Number.isInteger(it.productId) && isPositiveInt(it.amount));

    if (normalized.length === 0) return res.status(400).json({ erro: 'Itens inválidos.' });

    const map = new Map();
    for (const it of normalized) {
      map.set(it.productId, (map.get(it.productId) || 0) + it.amount);
    }
    const grouped = Array.from(map, ([productId, amount]) => ({ productId, amount }));

    const order = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: grouped.map(g => g.productId) } },
      });

      if (products.length !== grouped.length) {
        const found = new Set(products.map(p => p.id));
        const missing = grouped.filter(g => !found.has(g.productId)).map(g => g.productId);
        const err = new Error(`Produtos inexistentes: ${missing.join(', ')}`);
        err.code = 'E_MISSING_PRODUCTS';
        throw err;
      }

      for (const g of grouped) {
        const p = products.find(p => p.id === g.productId);
        if (!p || p.stock < g.amount) {
          const err = new Error(`Estoque insuficiente para o produto ${p?.name ?? g.productId}`);
          err.code = 'E_NO_STOCK';
          throw err;
        }
      }

      const created = await tx.order.create({
        data: {
          clientId,
          status: 'AGUARDANDO_PAGAMENTO',
          items: {
            create: grouped.map(g => {
              const p = products.find(pp => pp.id === g.productId);
              return { productId: g.productId, amount: g.amount, priceAtPurchase: p.price };
            }),
          },
        },
        include: { items: { include: { product: true } }, client: true },
      });

      for (const g of grouped) {
        await tx.product.update({
          where: { id: g.productId },
          data: { stock: { decrement: g.amount } },
        });
      }

      return created;
    });

    return res.status(201).json(order);
  } catch (err) {
    if (err.code === 'E_MISSING_PRODUCTS' || err.code === 'E_NO_STOCK') {
      return res.status(400).json({ erro: err.message });
    }
    return next(err);
  }
}

// Confirmar pagamento de um pedido
async function confirmPayment(req, res, next) {
  try {
    const { orderId, payments } = req.body; 
    // payments = [{ method: 'Cartão', amount: 50.0 }, ...]

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return res.status(404).json({ erro: 'Pedido não encontrado.' });

    let allSuccess = true;
    const createdPayments = [];

    for (const p of payments) {
      const success = Math.random() < 0.8; // 80% de chance de sucesso
      if (!success) allSuccess = false;

      const payment = await prisma.payment.create({
        data: {
          orderId,
          method: p.method,
          amount: p.amount,
          success,
        },
      });
      createdPayments.push(payment);
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: allSuccess ? 'PAGO' : 'CANCELADO' },
    });

    return res.json({ status: allSuccess ? 'PAGO' : 'CANCELADO', payments: createdPayments });
  } catch (err) {
    return next(err);
  }
}

// Buscar métodos de pagamento de um pedido
async function getPaymentsByOrder(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
    if (!Number.isInteger(orderId)) return res.status(400).json({ erro: 'ID inválido.' });

    const payments = await prisma.payment.findMany({ where: { orderId } });
    return res.json(payments);
  } catch (err) {
    return next(err);
  }
}

// Buscar pedido por ID
async function getOrderById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: 'ID inválido.' });

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, client: true, payments: true },
    });

    if (!order) return res.status(404).json({ erro: 'Pedido não encontrado.' });

    return res.json(order);
  } catch (err) {
    return next(err);
  }
}

// Deletar pedido
async function deleteOrder(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: 'ID inválido.' });

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ erro: 'Pedido não encontrado.' });

    await prisma.order.delete({ where: { id } });
    return res.json({ mensagem: 'Pedido excluído com sucesso.' });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAllOrders,
  getOrdersByClient,
  createOrder,
  confirmPayment,
  getPaymentsByOrder,
  getOrderById,
  deleteOrder,
};
