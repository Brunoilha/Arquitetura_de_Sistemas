const prisma = require('../db/prisma');

function isPositiveInt(n) {
  return Number.isInteger(n) && n > 0;
}

async function getAllOrders(req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { id: 'asc' },
      include: { items: { include: { product: true } } },
    });
    return res.json(orders);
  } catch (err) {
    return next(err);
  }
}

async function createOrder(req, res, next) {
  try {
    const { client, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        erro: "O campo 'items' é obrigatório e deve ser um array com pelo menos 1 item.",
      });
    }

    // normaliza e valida items
    const normalized = items
      .map((it) => ({
        productId: Number(it.productId ?? it.id ?? it.product_id),
        amount: Number(it.amount ?? it.qty ?? it.quantity),
      }))
      .filter((it) => Number.isInteger(it.productId) && isPositiveInt(it.amount));

    if (normalized.length === 0) {
      return res.status(400).json({ erro: 'Itens inválidos.' });
    }

    // agrupa por productId somando quantidades duplicadas
    const map = new Map();
    for (const it of normalized) {
      map.set(it.productId, (map.get(it.productId) || 0) + it.amount);
    }
    const grouped = Array.from(map, ([productId, amount]) => ({ productId, amount }));

    // transação: valida estoque, cria pedido + itens, decrementa estoque
    const order = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: grouped.map((g) => g.productId) } },
      });

      if (products.length !== grouped.length) {
        const found = new Set(products.map((p) => p.id));
        const missing = grouped.filter((g) => !found.has(g.productId)).map((g) => g.productId);
        const err = new Error(`Produtos inexistentes: ${missing.join(', ')}`);
        err.code = 'E_MISSING_PRODUCTS';
        throw err;
      }

      for (const g of grouped) {
        const p = products.find((p) => p.id === g.productId);
        if (!p || p.stock < g.amount) {
          const err = new Error(`Estoque insuficiente para o produto ${p?.name ?? g.productId}`);
          err.code = 'E_NO_STOCK';
          throw err;
        }
      }

      const created = await tx.order.create({
        data: {
          client: typeof client === 'string' && client.trim() ? client.trim() : null,
          items: {
            create: grouped.map((g) => {
              const p = products.find((pp) => pp.id === g.productId);
              return {
                productId: g.productId,
                amount: g.amount,
                priceAtPurchase: p.price,
              };
            }),
          },
        },
        include: { items: { include: { product: true } } },
      });

      // decrementa estoque
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

module.exports = {
  getAllOrders,
  createOrder,
};
