import express from "express";
import { protect } from "../middleware/auth.js";
import upload from "../config/multer.js";
import {
    uploadDocument,
    getDocuments,
    getDocument,
    deleteDocument,
} from "../controllers/documentController.js";

const router = express.Router();

// Upload document
router.post("/upload", protect, upload.single("file"), uploadDocument);

// Get all documents
router.get("/", protect, getDocuments);

// Get document by ID
router.get("/:id", protect, getDocument);

// Delete document
router.delete("/:id", protect, deleteDocument);



export default router;
