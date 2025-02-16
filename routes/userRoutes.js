import express from "express";
import User from "../routes/models/user.js";
import axios from "axios";

const router = express.Router();

const RETELL_API_URL = "https://api.retellai.com/create-retell-llm";
const RETELL_API_KEY = "key_29af1e14c19c49fd8a8bbb2f0f67"; // Ideally, store in environment variables
const RETELL_UPDATE_LLM_URL = "https://api.retellai.com/update-retell-llm";
 const CREATE_LLM_URL = "https://api.retellai.com/create-retell-llm";
const CREATE_AGENT_URL = "https://api.retellai.com/create-agent"; // ✅ Define this variable

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

// ✅ Create LLM & Agent Together
router.post("/create-llm", async (req, res) => {
    try {
        const { userId, generalPrompt, beginMessage, agentName } = req.body;

        // Validate input
        if (!userId || !generalPrompt || !beginMessage || !agentName) {
            return res.status(400).json({ message: "userId, generalPrompt, beginMessage, and agentName are required." });
        }

        // ✅ Step 1: Create LLM
        const llmResponse = await axios.post(
            CREATE_LLM_URL,
            {
                model: "gpt-4o-mini",
                general_prompt: generalPrompt,
                begin_message: beginMessage,
            },
            {
                headers: {
                    Authorization: `Bearer ${RETELL_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const llmId = llmResponse.data.llm_id;
        if (!llmId) {
            return res.status(500).json({ message: "Failed to retrieve LLM ID." });
        }

        console.log(`✅ LLM Created: ${llmId}`);

        // ✅ Step 2: Create Agent using the LLM ID
        const agentResponse = await axios.post(
            CREATE_AGENT_URL,
            {
                response_engine: {
                    type: "retell-llm",
                    llm_id: llmId,
                },
                voice_id: "11labs-Chloe",
                agent_name: agentName, // ✅ Dynamically set from frontend
                voice_model: "eleven_flash_v2_5",
                ambient_sound: "coffee-shop",
                ambient_sound_volume: 1.5,
                language: "en-US",
                enable_transcription_formatting: true,
                normalize_for_speech: true,
                end_call_after_silence_ms: 10000,
            },
            {
                headers: {
                    Authorization: `Bearer ${RETELL_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const agentId = agentResponse.data.agent_id;
        if (!agentId) {
            return res.status(500).json({ message: "Failed to retrieve Agent ID." });
        }

        console.log(`✅ Agent Created: ${agentId}`);

        // ✅ Step 3: Store LLM & Agent in User Object
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        user.llms.push({ llmId, agentId });
        await user.save();

        res.status(200).json({
            message: "LLM & Agent created successfully!",
            llmId,
            agentId,
        });

    } catch (error) {
        console.error("❌ Error:", error.response?.data || error.message);
        res.status(500).json({
            message: "Server Error",
            error: error.response?.data || error.message,
        });
    }
});

router.patch("/update-llm", async (req, res) => {
    try {
        const { userId, llmId, agentName, generalPrompt, beginMessage } = req.body;

        // ✅ Validate required inputs
        if (!userId || !llmId) {
            return res.status(400).json({ message: "userId and llmId are required." });
        }

        // ✅ Fetch the existing LLM details from Retell
        console.log(`🔍 Fetching current details for LLM ID: ${llmId}`);
        const fetchResponse = await axios.get(
            `https://api.retellai.com/get-retell-llm/${llmId}`,
            {
                headers: {
                    Authorization: `Bearer ${RETELL_API_KEY}`,
                },
            }
        );

        const existingData = fetchResponse.data;

        // ✅ Prepare the update payload (Only include changed fields)
        const updatedData = {};
        if (agentName && `Hello! This is ${agentName}. How can I assist you today?` !== existingData.begin_message) {
            updatedData.begin_message = `Hello! This is ${agentName}. How can I assist you today?`;
        }
        if (generalPrompt && generalPrompt !== existingData.general_prompt) {
            updatedData.general_prompt = generalPrompt;
        }
        if (beginMessage && beginMessage !== existingData.begin_message) {
            updatedData.begin_message = beginMessage;
        }

        // ✅ If nothing changed, return success without calling API
        if (Object.keys(updatedData).length === 0) {
            return res.status(200).json({ message: "No changes detected. LLM remains the same." });
        }

        // ✅ Send update request to Retell
        console.log("🔄 Updating LLM with:", updatedData);
        const updateResponse = await axios.patch(
            `https://api.retellai.com/update-retell-llm/${llmId}`,
            updatedData,
            {
                headers: {
                    Authorization: `Bearer ${RETELL_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log(`✅ LLM Updated: ${llmId}`);
        res.status(200).json({
            message: "LLM updated successfully!",
            updatedData: updateResponse.data,
        });

    } catch (error) {
        console.error("❌ Error:", error.response?.data || error.message);
        res.status(500).json({
            message: "Server Error",
            error: error.response?.data || error.message,
        });
    }
});

export default router;