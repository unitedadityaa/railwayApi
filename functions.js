import express from "express";
import connectDB from "./db.js";
import userRoutes from "./routes/userroutes.js";

const app = express();

// Middleware to parse JSON
// Middleware
app.use(cors());
app.use(express.json());

connectDB();

// Use user routes
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 3000;
console.log("✅ Routes registered: ", app._router.stack.map((r) => r.route?.path).filter(Boolean));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));