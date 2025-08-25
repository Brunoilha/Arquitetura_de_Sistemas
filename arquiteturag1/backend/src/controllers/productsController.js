const db = require("../data/db");
const {isIntNonNegative, isNumber} = require("../utils/validators");

function getAllProducts(req,res){
    return res.json(db.products);
}

function getProductById(req,res){
    const id = Number(req.params.id);
    const product = db.products.find((p) => p.id === id);
    if (!product) {
        return res.status(404).json({erro: "Produto não encontrado."});
    }
    return res.json(product);
}

function createProduct(req,res) {
    const {name,price,stock} = req.body;

    if (typeof name !== "string" || !name.trim()){
        return res.status(400).json({ erro: "Campo 'name' é obrigatório." });
    }

    if (!isNumber(price) || price < 0){
        return res.status(400).json({ erro: "Campo 'price' deve ser número >= 0." });
    }

    if (!isIntNonNegative(stock)){
        return res.status(400).json({erro: "Campo 'stock' deve ser inteiro >= 0."})
    }

    const newProduct = {
        id: db.nextProductId++,
        name: name.trim(),
        price,
        stock
    };

    db.products.push(newProduct);
    return res.status(201).json(newProduct);
}

function updateProduct(req,res){
    const id = Number(req.params.id);
    const product = db.products.find((p) => p.id === id);

    if (!product) {
        return res.status(404).json({erro:"Produto não encontrado"});
    }

    const {name,price,stock} = req.body;

    if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({erro:"Nome inválido."});
        }
        product.name = name.trim();
    }

    if (stock !== undefined){
        if (!isIntNonNegative(stock)){
            return res.status(400).json({ erro: "Estoque inválido." });
        }
        product.stock = stock;
    }

    return res.json(product);
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
};