import express from "express";
import User from "../routes/models/user.js";
import axios from "axios";

const router = express.Router();

const RETELL_API_URL = "https://api.retellai.com/create-retell-llm";
const RETELL_API_KEY = "key_29af1e14c19c49fd8a8bbb2f0f67"; // Ideally, store in environment variables
const RETELL_CREATE_LLM_URL = "https://api.retellai.com/create-retell-llm";
const RETELL_CREATE_AGENT_URL = "https://api.retellai.com/create-agent";
const RETELL_UPDATE_LLM_URL = "https://api.retellai.com/update-retell-llm"; // ✅ Define this variable

router.get("/", (req, res) => {
    res.json({ message: "Users API is working!" });
  });


// Create a new user
router.post("/create", async (req, res) => {
    try {
        console.log("Request Body:", req.body); // Debugging log

        const { name, email } = req.body;
        console.log("Extracted Email:", email); // Check if it's undefined

        if (!email || !name) {
            return res.status(400).json({ message: "Name and Email are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const newUser = new User({ name, email });
        await newUser.save();

        res.status(201).json({ message: "User created successfully!", user: newUser });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});


router.post("/add-llm", async (req, res) => {
    try {
        const { userId, agentName, voiceId } = req.body;

        console.log("🚀 Received request to add LLM", { userId, agentName, voiceId });

        if (!userId || !agentName || !voiceId) {
            console.error("❌ Missing required fields", { userId, agentName, voiceId });
            return res.status(400).json({ message: "userId, agentName, and voiceId are required" });
        }

        // ✅ Find the user in MongoDB
        const user = await User.findById(userId);
        if (!user) {
            console.error("❌ User not found:", userId);
            return res.status(404).json({ message: "User not found" });
        }

        console.log("✅ User found:", user);

        // ✅ Call Retell API to create an LLM
        const retellLLMResponse = await axios.post(
            "https://api.retellai.com/create-retell-llm",
            { begin_message: `Hello, this is ${agentName}, how can I help you?` },
            {
                headers: {
                    Authorization: `Bearer ${RETELL_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("✅ Retell LLM Response:", retellLLMResponse.data);

        const llmId = retellLLMResponse.data.llm_id;
        if (!llmId) {
            console.error("❌ Failed to retrieve llm_id");
            return res.status(500).json({ message: "Failed to retrieve llm_id from Retell API" });
        }

        // ✅ Call Retell API to create an agent
        const retellAgentResponse = await axios.post(
            "https://api.retellai.com/create-agent",
            {
                response_engine: {
                    type: "retell-llm",
                    llm_id: llmId
                },
                voice_model: "eleven_flash_v2_5",
                agent_name: agentName,
                voice_id: voiceId,
                language: "en-US",
                normalize_for_speech: true,
                end_call_after_silence_ms: 10000
            },
            {
                headers: {
                    Authorization: `Bearer ${RETELL_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("✅ Retell Agent Response:", retellAgentResponse.data);

        const agentId = retellAgentResponse.data.agent_id;
        if (!agentId) {
            console.error("❌ Failed to retrieve agent_id");
            return res.status(500).json({ message: "Failed to retrieve agent_id from Retell API" });
        }

        // ✅ Store agent details in MongoDB
        user.llms.push({ llmId, agentId, agentName });
        await user.save();

        console.log("✅ Successfully stored agent in database");

        res.status(201).json({
            message: "New agent created successfully!",
            agentId
        });
    } catch (error) {
        console.error("❌ Server Error:", error.response?.data || error.message);
        res.status(500).json({
            message: "Server Error",
            error: error.response?.data || error.message
        });
    }
});


router.patch("/update-prompt", async (req, res) => {
    try {
        const { userId, llmId, model, generalPrompt, beginMessage } = req.body;

        // Validate inputs
        if (!userId || !llmId || !model || !generalPrompt || !beginMessage) {
            return res.status(400).json({ message: "userId, llmId, model, generalPrompt, and beginMessage are required" });
        }

        // Find user to ensure they exist
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Ensure the LLM exists in the user's llms array
        const llmExists = user.llms.some(llm => llm.llmId === llmId);
        if (!llmExists) {
            return res.status(404).json({ message: "LLM not found for this user" });
        }

        // Call Retell API to update LLM
        const updateURL = `https://api.retellai.com/update-retell-llm/${llmId}`;
        const retellResponse = await axios.patch(
            updateURL,
            {
                model,
                general_prompt: generalPrompt,
                begin_message: beginMessage
            },
            {
                headers: {
                    Authorization: `Bearer ${RETELL_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        res.status(200).json({
            message: "LLM prompt updated successfully!",
            updatedData: retellResponse.data
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            message: "Server Error",
            error: error.response?.data || error.message
        });
    }
});


const generateCustomPrompt = ({ businessName, agentName, contactMethod, currentTime }) => {
    return `# Role
    
You are a world-class Customer Support Executive with expertise in **friendly and professional** communication. Your name is **${agentName}**.

# Objective

Your primary goal is to ensure a seamless and professional experience for customers by handling inquiries, scheduling appointments, and providing expert assistance on services provided by **${businessName}**. You will think step by step through the following process to ensure a good outcome.

1. Actively listen to understand the customer’s needs related to services from **${businessName}**.
2. Clearly explain available options based on the **knowledge base provided**.
3. Persuade them to take the next step, which is typically **${contactMethod}**.

# Context

The task is crucial for our business, as each client brings us revenue. It's vital that we answer all their questions in a friendly and professional manner. Our top priority is ensuring that customers receive the correct information.

# Instructions

- The **current date and time** is: **${currentTime}**.
- You are speaking with the customer on the phone.
- You **must not make up new facts** or edit any information beyond what has been provided.
- If a customer asks something that is not in your knowledge base, politely let them know you will forward their inquiry.

## Steps

1. **Greet & Offer Assistance**  
2. **Explain Services & Build Interest**  
3. **Encourage Next Steps**  
4. **Follow Important Rules**  
5. **Close the Call**  
   `;
};

// Function to check for missing fields
const checkMissingFields = (requiredFields, data) => {
    return requiredFields.filter(field => !data[field]);
};

router.post("/generate-prompt", async (req, res) => {
    try {
        const { userId, businessName, agentName, contactMethod, currentTime, llmId } = req.body;

        // Required fields check
        const requiredFields = ["userId", "businessName", "agentName", "contactMethod", "currentTime", "llmId"];
        const missingFields = checkMissingFields(requiredFields, req.body);

        if (missingFields.length > 0) {
            return res.status(400).json({ message: `Missing required fields: ${missingFields.join(", ")}` });
        }

        // Generate prompt
        const customPrompt = generateCustomPrompt({
            businessName, agentName, contactMethod, currentTime
        });

        // Call Retell API to update LLM
        const updateURL = `${RETELL_UPDATE_LLM_URL}/${llmId}`;
        const retellResponse = await axios.patch(
            updateURL,
            {
                model: "gpt-4o-mini",
                general_prompt: customPrompt,
                begin_message: "Hello, how can I assist you today?"
            },
            {
                headers: {
                    Authorization: `Bearer ${RETELL_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        res.status(200).json({
            message: "LLM prompt updated successfully!",
            updatedPrompt: customPrompt,
            retellResponse: retellResponse.data
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            message: "Server Error",
            error: error.response?.data || error.message
        });
    }
});

// ✅ PATCH route to update an existing agent (instead of creating new ones)
router.patch("/update-llm/:llmId", async (req, res) => {
    try {
        const { llmId } = req.params;
        const { agentName } = req.body;

        if (!llmId || !agentName) {
            return res.status(400).json({ message: "llmId and agentName are required" });
        }

        console.log("🔄 Updating LLM:", llmId);

        // ✅ Call Retell API to update the LLM name
        const updateURL = `https://api.retellai.com/update-retell-llm/${llmId}`;
        const retellResponse = await axios.patch(
            updateURL,
            { begin_message: `Hello, this is ${agentName}, how can I help you?` },
            {
                headers: {
                    Authorization: `Bearer ${process.env.RETELL_API_KEY}`, // Use env variable
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("✅ Retell API Response:", retellResponse.data);

        res.status(200).json({
            message: "Agent updated successfully!",
            updatedData: retellResponse.data
        });

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({
            message: "Server Error",
            error: error.response?.data || error.message
        });
    }
});

router.get("/check-agent/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user || !user.llms.length) {
            return res.status(404).json({ message: "No agents found for this user." });
        }

        const latestLlm = user.llms[user.llms.length - 1];

        res.status(200).json({
            llmId: latestLlm.llmId,
            agentId: latestLlm.agentId,
            agentName: latestLlm.agentName || "Unknown",
        });
    } catch (error) {
        console.error("❌ Error fetching agent:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

router.get("/get-llm/:llmId", async (req, res) => {
    try {
        const { llmId } = req.params;

        // ✅ Find user that has this LLM
        const user = await User.findOne({ "llms.llmId": llmId });

        if (!user) {
            return res.status(404).json({ message: "LLM not found" });
        }

        // ✅ Extract the correct LLM from the user's LLMs array
        const llm = user.llms.find(llm => llm.llmId === llmId);

        if (!llm) {
            return res.status(404).json({ message: "LLM ID not found in user data" });
        }

        res.status(200).json({
            llmId: llm.llmId,
            agentId: llm.agentId,
            agentName: llm.agentName || "Unknown",
        });
    } catch (error) {
        console.error("❌ Error fetching LLM:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

export default router;