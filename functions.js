import express from "express";
import connectDB from "./db.js";
import userRoutes from "./routes/userroutes.js";

const app = express();

// Middleware to parse JSON
app.use(express.json());

connectDB();

// Use user routes
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));