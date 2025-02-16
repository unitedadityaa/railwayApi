import Retell from "retell-sdk";
import express from "express";
import cors from "cors";
import connectDB from "./db.js";
import userRoutes from "./routes/userroutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Connect MongoDB
connectDB();

// ✅ Retell SDK
const client = new Retell({
  apiKey: "key_47ac7f82a15ee4d365c8641add4f",
});

// ✅ Function to Create a Knowledge Base
async function createKnowledgeBase(knowledgeBaseName, texts, urls) {
  try {
    const response = await client.knowledgeBase.create({
      knowledge_base_name: knowledgeBaseName,
      knowledge_base_texts: texts,
      knowledge_base_urls: urls,
    });

    return response.knowledge_base_id;
  } catch (error) {
    console.error("Error creating knowledge base:", error);
    throw error;
  }
}

// ✅ API Route: Create Knowledge Base
app.post("/api/create-kb", async (req, res) => {
  try {
    const { knowledgeBaseName, texts, urls } = req.body;

    // Validate input
    if (!knowledgeBaseName || !texts || !urls || !Array.isArray(texts) || !Array.isArray(urls)) {
      return res.status(400).json({ success: false, message: "Invalid request. Ensure 'knowledgeBaseName', 'texts', and 'urls' are arrays." });
    }

    const knowledgeBaseId = await createKnowledgeBase(knowledgeBaseName, texts, urls);
    res.json({ success: true, knowledgeBaseId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create Knowledge Base", error: error.message });
  }
});

// ✅ Register User Routes (Moved from `functions.js`)
app.use("/api/users", userRoutes);

// ✅ Debug: Log registered routes
console.log("✅ Routes registered:", app._router.stack.map((r) => r.route?.path).filter(Boolean));

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));