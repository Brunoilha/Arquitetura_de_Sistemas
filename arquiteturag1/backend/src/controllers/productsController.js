const prisma = require('../db/prisma');
const { isIntNonNegative, isNumber } = require('../utils/validators');

async function getAllProducts(req, res, next) {
  try {
    const products = await prisma.product.findMany({ orderBy: { id: 'asc' } });
    return res.json(products);
  } catch (err) {
    return next(err);
  }
}

async function getProductById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ erro: 'ID inválido.' });
    }
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }
    return res.json(product);
  } catch (err) {
    return next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    let { name, price, stock } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ erro: 'Nome inválido.' });
    }
    if (!isNumber(price)) {
      return res.status(400).json({ erro: 'Preço inválido.' });
    }
    if (!isIntNonNegative(stock)) {
      return res.status(400).json({ erro: 'Estoque inválido.' });
    }

    const product = await prisma.product.create({
      data: { name: name.trim(), price, stock },
    });
    return res.status(201).json(product);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ erro: 'Já existe um produto com esse nome.' });
    }
    return next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ erro: 'ID inválido.' });
    }

    const data = {};
    if (typeof req.body.name !== 'undefined') {
      if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
        return res.status(400).json({ erro: 'Nome inválido.' });
      }
      data.name = req.body.name.trim();
    }
    if (typeof req.body.price !== 'undefined') {
      if (!isNumber(req.body.price)) {
        return res.status(400).json({ erro: 'Preço inválido.' });
      }
      data.price = req.body.price;
    }
    if (typeof req.body.stock !== 'undefined') {
      if (!isIntNonNegative(req.body.stock)) {
        return res.status(400).json({ erro: 'Estoque inválido.' });
      }
      data.stock = req.body.stock;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ erro: 'Nenhum dado válido para atualizar.' });
    }

    const product = await prisma.product.update({
      where: { id },
      data,
    });

    return res.json(product);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ erro: 'Já existe um produto com esse nome.' });
    }
    return next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ erro: 'ID inválido.' });
    }

    await prisma.product.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }
    return next(err);
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
