const { ObjectId } = require("mongodb");
const { getDb } = require("../db/mongo");

// POST /order-service/v1/orders
async function createOrder(req, res) {
  try {
    let { userId, products, totalAmount, status } = req.body;

    if (userId === undefined) {
      return res.status(400).json({ error: "userId é obrigatório" });
    }
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "products é obrigatório e deve ter ao menos 1 item" });
    }

    // Normalização -> sempre number
    const userIdNum = Number(userId);
    if (!Number.isFinite(userIdNum)) {
      return res.status(400).json({ error: "userId inválido" });
    }

    const normProducts = products.map((p, i) => {
      const pid = Number(p.productId);
      const qty = Number(p.quantity);
      if (!Number.isFinite(pid) || !Number.isFinite(qty) || qty <= 0) {
        throw new Error(`Produto inválido no índice ${i}`);
      }
      return { productId: pid, quantity: qty };
    });

    const doc = {
      userId: userIdNum,
      products: normProducts,
      totalAmount: Number(totalAmount ?? 0),
      status: status || "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = getDb();
    const r = await db.collection("orders").insertOne(doc);
    const created = await db.collection("orders").findOne({ _id: r.insertedId });
    return res.status(201).json(created);
  } catch (err) {
    console.error("createOrder error:", err);
    return res.status(500).json({ error: "Error creating order", details: err.message });
  }
}

// GET /order-service/v1/orders?client_id=...
async function getOrders(req, res) {
  try {
    const db = getDb();
    const { client_id } = req.query;

    const filter = {};
    if (client_id !== undefined) {
      const uid = Number(client_id);
      if (!Number.isFinite(uid)) {
        return res.status(400).json({ error: "client_id inválido" });
      }
      filter.userId = uid; // compara como number
    }

    const orders = await db.collection("orders").find(filter).toArray();
    return res.json(orders);
  } catch (err) {
    console.error("getOrders error:", err);
    return res.status(500).json({ error: "Error fetching orders", details: err.message });
  }
}

// GET /order-service/v1/orders/:id
async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid order id" });
    }

    const db = getDb();
    const order = await db.collection("orders").findOne({ _id: new ObjectId(id) });
    if (!order) return res.status(404).json({ error: "Order not found" });
    return res.json(order);
  } catch (err) {
    console.error("getOrderById error:", err);
    return res.status(500).json({ error: "Error fetching order", details: err.message });
  }
}

// PATCH /order-service/v1/orders/:id/status
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid order id" });
    }
    if (!status) {
      return res.status(400).json({ error: "status é obrigatório" });
    }

    const db = getDb();
    const out = await db.collection("orders").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: "after" } // devolve o doc atualizado (driver v4+)
    );

    if (!out.value) return res.status(404).json({ error: "Order not found" });
    return res.json(out.value);
  } catch (err) {
    console.error("updateOrderStatus error:", err);
    return res.status(500).json({ error: "Error updating order status", details: err.message });
  }
}

module.exports = { createOrder, getOrders, getOrderById, updateOrderStatus };
