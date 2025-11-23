import express from 'express';
import { PrismaClient } from './generated/prisma/index.js';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.post('/products', async (req, res) => {
  const { name, price, stock } = req.body;
  try {
    const product = await prisma.product.create({ data: { name, price, stock } });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/products', async (_req, res) => {
  const products = await prisma.product.findMany();
  res.json(products);
});

app.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/products/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const product = await prisma.product.update({ where: { id: Number(id) }, data });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deletar produto por id
app.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.product.delete({ where: { id: Number(id) } });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/products/:id/stock', async (req, res) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.findUnique({ where: { id: Number(id) }, select: { stock: true } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/products/:id/stock', async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;
  try {
    const product = await prisma.product.update({ where: { id: Number(id) }, data: { stock } });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3006, () => console.log('Products service running on port 3006'));
