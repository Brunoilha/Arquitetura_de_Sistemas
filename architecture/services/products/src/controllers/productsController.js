const prisma = require("../db/prisma");

// Criar produto
async function createProduct(req, res) {
  try {
    const { name, price, stock } = req.body;
    const newProduct = await prisma.product.create({
      data: { name, price, stock },
    });
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: "Error creating product", details: error.message });
  }
}

// Buscar todos os produtos
async function getAllProducts(req, res) {
  try {
    const { cs } = req.query;
    let products;

    if (cs) {
      // Somente produtos com stock > 0
      products = await prisma.product.findMany({
        where: { stock: { gt: 0 } },
      });
    } else {
      products = await prisma.product.findMany();
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Error fetching products", details: error.message });
  }
}

// Buscar produto por ID
async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });

    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Error fetching product", details: error.message });
  }
}

// Atualizar produto (dados gerais)
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, price, stock } = req.body;

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: { name, price, stock },
    });

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: "Error updating product", details: error.message });
  }
}

// Deletar produto
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id: parseInt(id) } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Error deleting product", details: error.message });
  }
}

// Atualizar apenas o estoque
async function updateProductStock(req, res) {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: { stock },
    });

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: "Error updating stock", details: error.message });
  }
}

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateProductStock,
};
