const express = require("express");
const router = express.Router();
const customersController = require("../controllers/customersController");

// Criar um novo cliente
router.post("/", customersController.createCustomer);

// Listar pedidos de um cliente específico
router.get("/:id/orders", customersController.getCustomerOrders);

module.exports = router;
