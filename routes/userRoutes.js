import express from "express";
import User from "../routes/models/user.js";
import axios from "axios";

const router = express.Router();

const RETELL_API_URL = "https://api.retellai.com/create-retell-llm";
const RETELL_API_KEY = "key_29af1e14c19c49fd8a8bbb2f0f67"; // Ideally, store in environment variables
const RETELL_CREATE_LLM_URL = "https://api.retellai.com/create-retell-llm";
const RETELL_CREATE_AGENT_URL = "https://api.retellai.com/create-agent";

// Create a new usercl
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

        if (!userId || !agentName || !voiceId) {
            return res.status(400).json({ message: "userId, agentName, and voiceId are required" });
        }

        // Find user in MongoDB
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Step 1: Create an LLM in Retell
        const retellLLMResponse = await axios.post(
            RETELL_CREATE_LLM_URL,
            { begin_message: "Hello, this is Sia, how can I help you?" },
            {
                headers: {
                    Authorization: `Bearer ${RETELL_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        // Extract LLM ID
        const llmId = retellLLMResponse.data.llm_id;
        if (!llmId) {
            return res.status(500).json({ message: "Failed to retrieve llm_id from Retell API" });
        }

        // Step 2: Create an Agent using the LLM ID
        const retellAgentResponse = await axios.post(
            RETELL_CREATE_AGENT_URL,
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

        // Extract Agent ID
        const agentId = retellAgentResponse.data.agent_id;
        if (!agentId) {
            return res.status(500).json({ message: "Failed to retrieve agent_id from Retell API" });
        }

        // Step 3: Save LLM and Agent to MongoDB
        user.llms.push({ llmId, agentId });
        await user.save();

        res.status(200).json({
            message: "LLM and Agent created successfully!",
            llmId,
            agentId,
            user
        });
    } catch (error) {
        console.error("Error:", error);
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


export default router;