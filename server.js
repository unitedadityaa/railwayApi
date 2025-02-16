import Retell from 'retell-sdk';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const client = new Retell({
    apiKey: 'key_47ac7f82a15ee4d365c8641add4f',
  });

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
  
  // API Route to accept dynamic texts and URLs
  app.post('/api/create-kb', async (req, res) => {
    try {
      const { knowledgeBaseName, texts, urls } = req.body;
  
      // Validation to ensure required fields are present
      if (!knowledgeBaseName || !texts || !urls || !Array.isArray(texts) || !Array.isArray(urls)) {
        return res.status(400).json({ success: false, message: "Invalid request. Ensure 'knowledgeBaseName', 'texts', and 'urls' are provided as arrays." });
      }
  
      const knowledgeBaseId = await createKnowledgeBase(knowledgeBaseName, texts, urls);
      res.json({ success: true, knowledgeBaseId });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to create Knowledge Base", error: error.message });
    }
  });


  
  
  // Start the server
  app.listen(PORT, () => {
    console.log(`Serverss is running on port ${PORT}`);
  });

  

  