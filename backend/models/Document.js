import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    title: {
        type: String,
        required: [true, "Title is required"],
        trim: true,
    },
    fileName: {
        type: String,
        required: [true, "File name is required"],
    },
    filePath: {
        type: String,
        required: [true, "File path is required"],
    },
    fileSize: {
        type: Number,
        required: [true, "File size is required"],
    },
    numPages: {
        type: Number,
        default: 0,
    },
    processedContentPath: {
        type: String,
        default: "",
    },
    extractedText: {
        type: String,
        default: "",
    },
    chunks: [
        {
            content: {
                type: String,
                required: true,
            },
            pageNumber: {
                type: Number,
                default: 0,
            },
            chunkIndex: {
                type: Number,
                required: true,
            },
        },
    ],
    uploadDate: {
        type: Date,
        default: Date.now,
    },
    lastAccessed: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ["processing", "ready", "error"],
        default: "processing",
    },
}, {timestamps: true});

//Index for fast query
documentSchema.index({userId: 1});
documentSchema.index({uploadDate: -1});

const Document = mongoose.model("Document", documentSchema);

export default Document;
