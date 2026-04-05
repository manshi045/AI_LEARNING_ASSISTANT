import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";

import { getPDFPageCount } from "../utils/pdfParser.js";
import { deleteProcessedContent } from "../utils/documentContentStore.js";
import { processDocumentContent, resolveStoredFilePath } from "../utils/documentProcessing.js";
import mongoose from "mongoose";

import fs from 'fs/promises'

//@desc Upload document
//@route POST /api/documents
//@access Private
const uploadDocument = async (req, res) => {
    try{
        const {title} = req.body;
        const file = req.file;

        if(!file){
            return res.status(400).json({message: "No file uploaded"});
        }

        if(!title){
            // Delete uploaded file
            await fs.unlink(req.file.path);
            return res.status(400).json({message: "Title is required"});
        }

        const numPages = await getPDFPageCount(req.file.path);

        //Create document entry
        const document = await Document.create({
            userId: req.user.id,
            title,
            fileName: req.file.originalname,
            filePath: `/uploads/documents/${req.file.filename}`,
            fileSize: req.file.size,
            numPages,
            status: "processing",
        });

        //Process document in background
        processPDF(document._id).catch(error => {
            console.error("Error processing document:", error);
            document.status = "error";
            document.save();
        });

        res.status(201).json({
            success: true,
            message: "Document uploaded successfully",
            document,
        });
    }catch(error){
        console.error(error);
        if(req.file){
            await fs.unlink(req.file.path);
        }
        res.status(500).json({message: "Failed to upload document"});
    }
};

//Helper to process PDF
const processPDF = async (documentId) => {
    try{
        const document = await Document.findById(documentId);
        await processDocumentContent(document);
    }catch(error){
        console.error("Error processing document:", error);
        const document = await Document.findById(documentId);
        document.status = "error";
        await document.save();
    }
};

//@desc Get all documents
//@route GET /api/documents
//@access Private
const getDocuments = async (req, res) => {
    try{
        const documents = await Document.aggregate([
            {
                $match: {userId: new mongoose.Types.ObjectId(req.user.id)}
            },
            {
                $lookup: {
                    from: "flashcards",
                    localField: "_id",
                    foreignField: "documentId",
                    as: "flashcards"
                }
            },
            {
                $lookup: {
                    from: "quizzes",
                    localField: "_id",
                    foreignField: "documentId",
                    as: "quizzes"
                }
            },
            {
                $addFields: {
                    flashcardCount: {$size: "$flashcards"},
                    quizCount: {$size: "$quizzes"},
                }
            },
            {$sort: {uploadDate: -1}},
            {
                $project: {
                  extractedText: 0,
                  chunks: 0,
                  flashcards: 0,
                  quizzes: 0,
                }
            }
        ]);
        res.status(200).json({
            success: true,
            count: documents.length,
            data: documents,
        });
    }catch(error){
        console.error(error);
        res.status(500).json({message: "Failed to get documents"});
    }
};

//@desc Get document by ID
//@route GET /api/documents/:id
//@access Private
const getDocument = async (req, res) => {
    try{
        const document = await Document.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if(!document){
            return res.status(404).json({
                success: false,
                message: "Document not found"
            });
        }

        if (!document.numPages && document.filePath) {
            try {
                const resolvedPath = resolveStoredFilePath(document.filePath);
                document.numPages = await getPDFPageCount(resolvedPath);
            } catch (error) {
                console.error("Error recovering page count:", error);
            }
        }

        // Get counts of flashcards and quizzes
        const flashcardCount = await Flashcard.countDocuments({documentId: document._id});
        const quizCount = await Quiz.countDocuments({documentId: document._id});

        // Update last accessed date
        document.lastAccessed = Date.now();
        await document.save();

       // Combine count with document
       const documentData = {
        ...document.toObject(),
        flashcardCount,
        quizCount,
       }        

        res.status(200).json({
            success: true,
            data: documentData,
        });
    }catch(error){
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to get document"
        });
    }
};

//@desc Delete document
//@route DELETE /api/documents/:id
//@access Private
const deleteDocument = async (req, res) => {
    try{
        const document = await Document.findById(req.params.id);
        if(!document){
            return res.status(404).json({message: "Document not found"});
        }
        const resolvedPath = resolveStoredFilePath(document.filePath);
        await fs.unlink(resolvedPath).catch(error => {
            console.error("Error deleting file:", error);
        });
        await deleteProcessedContent(document);
        await document.deleteOne();
        res.status(200).json({message: "Document deleted successfully"});
    }catch(error){
        console.error(error);
        res.status(500).json({message: "Failed to delete document"});
    }
};



export {uploadDocument, getDocuments, getDocument, deleteDocument}; 
