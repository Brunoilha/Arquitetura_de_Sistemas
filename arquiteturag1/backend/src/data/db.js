let orders = [];

let products = [
    { id: 1, name: "Camiseta", price: 59.9, stock: 10 },
    { id: 2, name: "Calça Jeans", price: 149.9, stock: 5 }
];

let nextProductId = 3;
let nextOrderId = 1;

module.exports = {
    orders,
    products,
    nextProductId,
    nextOrderId,
};