import mongoose from "mongoose";

const MONGO_URI = "mongodb://mongo:PFSEfzDpZjnYmLuHipvIkMgqllVoMSOf@hopper.proxy.rlwy.net:13795";

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("MongoDB Connected Successfully! 🚀");
    } catch (error) {
        console.error("MongoDB Connection Error: ", error);
        process.exit(1); // Exit process with failure
    }
};

export default connectDB;