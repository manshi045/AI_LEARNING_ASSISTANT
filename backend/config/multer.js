import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "..", "uploads", "documents");
if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);      
    },
    filename: (req, file, cb) => {
       const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
       const ext = path.extname(file.originalname);
       cb(null, `${uniqueSuffix}${ext}`);
    },
});


const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("application/pdf")){
        cb(null, true);
    }else{
        cb(new Error("Invalid file type"), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: Number.parseInt(process.env.MAX_FILE_SIZE || "104857600", 10), // 100MB default
    },
});

export default upload;
