const express = require("express");
const app = express();

app.use(express.json());

const productsRoutes = require("./routes/productsRoutes");
const ordersRoutes = require("./routes/ordersRoutes");
const customersRoutes = require("./routes/customersRoutes"); 

app.use("/products", productsRoutes);
app.use("/orders", ordersRoutes);
app.use("/customers", customersRoutes);

// middleware de tratamento de erro
app.use((err, req, res, next) => {
  console.error("Erro:", err);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

app.get("/", (req, res) => {
  res.send("API funcionando");
});

app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
