import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    subscribed: { type: Boolean, default: false },
    llms: [
        {
            llmId: { type: String, required: true }, // Unique LLM ID
            createdAt: { type: Date, default: Date.now } // Timestamp
        }
    ]
});

const User = mongoose.model("User", UserSchema);

export default User;