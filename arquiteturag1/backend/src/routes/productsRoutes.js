const express = require("express");
const router = express.Router();
const productsController = require("../controllers/productsController");

router.get("/", productsController.getAllProducts);
router.get("/:id", productsController.getProductById);

router.post("/", productsController.createProduct);
router.put("/:id", productsController.updateProduct);
router.patch("/:id/stock", productsController.updateStock);

router.delete("/:id", productsController.deleteProduct);

module.exports = router;
