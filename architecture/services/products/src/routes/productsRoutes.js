const express = require("express");
const { 
  getAllProducts, 
  getProductById, 
  createProduct 
} = require("../controllers/productsController");

const router = express.Router();

// Rotas
router.get("/", getAllProducts);     // GET all
router.get("/:id", getProductById);  // GET by id
router.post("/", createProduct);     // POST new

module.exports = router;
