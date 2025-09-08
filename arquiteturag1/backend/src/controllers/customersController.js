const prisma = require('../db/prisma');

async function createCustomer(req, res, next) {
  try {
    const { name, email } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ erro: 'Nome inválido.' });
    }
    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ erro: 'Email inválido.' });
    }

    const customer = await prisma.customer.create({
      data: { name: name.trim(), email: email.trim() }
    });

    return res.status(201).json(customer);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ erro: 'Já existe um cliente com esse email.' });
    }
    return next(err);
  }
}

async function getCustomerOrders(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ erro: 'ID inválido.' });
    }

    const orders = await prisma.order.findMany({
      where: { clientId: id },
      include: { items: { include: { product: true } }, payments: true }
    });

    return res.json(orders);
  } catch (err) {
    return next(err);
  }
}

module.exports = { createCustomer, getCustomerOrders };
