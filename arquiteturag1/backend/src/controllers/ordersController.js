const db = require("../data/db");

function getAllOrders(req, res) {
    return res.json(db.orders);
}

function createOrder(req, res) {
    const { client, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            erro: "O campo 'items' é obrigatório e deve ser um array com pelo menos 1 item.",
        });
    }

    const normalItems = [];

    for (const [index, item] of items.entries()) {
        const productId = Number(item?.productId);
        const amount = Number(item?.amount);

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({ erro: `Item ${index + 1}: 'productId' inválido.` });
        }

        if (!Number.isInteger(amount) || amount <= 0) {
            return res.status(400).json({ erro: `Item ${index + 1}: 'quantidade' inválida.` });
        }

        const product = db.products.find((p) => p.id === productId);

        if (!product) {
            return res.status(400).json({ erro: `Item ${index + 1}: Produto com ID ${productId} não encontrado.` });
        }

        if (product.stock < amount) {
            return res.status(400).json({ erro: `Item ${index + 1}: Estoque insuficiente para o produto '${product.name}'.` });
        }

        normalItems.push({
            productId,
            name: product.name,
            unitPrice: product.price,
            amount,
            subtotal: Number((product.price * amount).toFixed(2)),
            _refProduct: product,
        });
    }

    const total = Number(normalItems.reduce((acc, it) => acc + it.subtotal, 0).toFixed(2));

    const newOrder = {
        id: db.nextOrderId++,
        client: typeof client === "string" ? client.trim() : null,
        items: normalItems.map(({ _refProduct, ...publicItem }) => publicItem),
        total,
        createdOn: new Date().toISOString(),
    };

    for (const it of normalItems) {
        it._refProduct.stock -= it.amount;
    }

    db.orders.push(newOrder);

    return res.status(201).json(newOrder);
}

module.exports = {
    getAllOrders,
    createOrder,
};
