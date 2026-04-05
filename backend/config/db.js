import mongoose from "mongoose";

const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        console.warn("MONGO_URI is missing. Starting without MongoDB.");
        return null;
    }

    try {
        const conn = await mongoose.connect(mongoUri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error("MongoDB connection failed. Continuing in local fallback mode.");
        console.error(error.message);
        return null;
    }
};

export default connectDB;
