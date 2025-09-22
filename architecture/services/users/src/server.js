const express = require("express");
const usersRoutes = require("./routes/usersRoutes");

const app = express();
app.use(express.json());

// Routes
app.use("/users", usersRoutes);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`✅ Users service running on port ${PORT}`);
});
