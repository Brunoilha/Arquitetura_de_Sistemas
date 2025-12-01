import express from 'express';
import * as productsController from '../controllers/productsController.js';

const router = express.Router();
router.post('/', productsController.createProduct);
router.get('/', productsController.getAllProducts);
router.get('/:id', productsController.getProductById);
router.patch('/:id', productsController.updateProduct);
router.delete('/:id', productsController.deleteProduct);
router.patch('/:id/stock', productsController.updateProductStock);

export default router;
