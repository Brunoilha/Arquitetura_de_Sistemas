const express = require("express");
const router = express.Router();
const ordersController = require("../controllers/ordersController");

router.get("/", ordersController.getAllOrders);
router.get("/client/:clientId", ordersController.getOrdersByClient);
router.get("/:id", ordersController.getOrderById);
router.get("/:orderId/payments", ordersController.getPaymentsByOrder);

router.post("/", ordersController.createOrder);
router.post("/confirm-payment", ordersController.confirmPayment);

router.delete("/:id", ordersController.deleteOrder);

module.exports = router;
