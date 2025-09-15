const prisma = require("../db/prisma");

async function getAllProducts(req, res) {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Error fetching products" });
  }
}

async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Error fetching product" });
  }
}

async function createProduct(req, res) {
  try {
    const { name, price } = req.body;
    const product = await prisma.product.create({
      data: { name, price },
    });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Error creating product" });
  }
}

module.exports = { 
  getAllProducts, 
  getProductById,   
  createProduct 
};
