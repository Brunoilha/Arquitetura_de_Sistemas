import express from 'express';
import * as paymentsController from '../controllers/paymentController.js';

const router = express.Router();

// Rota para criar um novo pagamento (POST)
// POST /payment-service/v1/payments
router.post('/', paymentsController.createPayment);

// Rota para buscar todos os pagamentos ou filtrar por order_id (GET)
// GET /payment-service/v1/payments
router.get('/', paymentsController.getAllPayments);

// Rota para buscar um pagamento por ID (GET)
// GET /payment-service/v1/payments/:id
router.get('/:id', paymentsController.getPaymentById);

// Rota PRINCIPAL: Processar o pagamento (PATCH)
// PATCH /payment-service/v1/payments/:id/process
router.patch('/:id/process', paymentsController.processPayment);

export default router;