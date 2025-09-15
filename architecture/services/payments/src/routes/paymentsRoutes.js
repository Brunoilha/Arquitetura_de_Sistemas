const express = require("express");
const {
  getAllPayments,
  getPaymentById,
  createPayment,
} = require("../controllers/paymentsController");

const router = express.Router();

// Routes
router.get("/", getAllPayments);     // GET all
router.get("/:id", getPaymentById);  // GET by id
router.post("/", createPayment);     // POST new

module.exports = router;
