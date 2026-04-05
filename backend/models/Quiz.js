import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    questions: [
        {
            question: {
                type: String,
                required: true,
            },
            options: [
                String,
            ],
            correctAnswer: {
                type: String,
                required: true,
            },
            explanation: {
                type: String,
                required: true,
            },
            difficulty: {
                type: String,
                enum: ["easy", "medium", "hard"],
                default: "medium",
            },
        },
    ],
    userAnswers: [
        {
            questionIndex: {
                type: Number,
                required: true,
            },
            selectedAnswer: {
                type: String,
                required: true,
            },
            isCorrect: {
                type: Boolean,
                required: true,
            },
            answeredAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    score: {
        type: Number,
        default: 0,
    },
    totalQuestions: {
        type: Number,
        required: true,
    },
    completedAt: {
        type: Date,
        default: null,
    },
}, {timestamps: true});

quizSchema.path("questions").schema.path("options").validate(function (val) {
    return Array.isArray(val) && val.length === 4;
}, "Exactly 4 options required");


//Index for fast query
quizSchema.index({userId: 1});
quizSchema.index({documentId: 1});

const Quiz = mongoose.model("Quiz", quizSchema);

export default Quiz;
