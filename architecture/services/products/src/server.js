const express = require("express");
const productsRoutes = require("./routes/productsRoutes");

const app = express();
app.use(express.json());

// Routes
app.use("/products", productsRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Products service running on port ${PORT}`);
});
