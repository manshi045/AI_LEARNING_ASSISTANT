📘 AI Learning Assistant (LLM + RAG)

An AI-powered smart learning and productivity platform designed to help students manage study materials, understand concepts better, and track their learning progress efficiently.

🚀 **Features**  

🔐 Authentication  
-Secure Login & Registration  
-Password Reset using OTP (via Email)  
-JWT-based authentication

📂 Document Management  
-Upload and manage study materials  
-Organized document storage  
-Easy access for learning

🤖 AI Assistant (LLM + RAG)  
-Ask questions from uploaded documents  
-Context-aware responses  
-Retrieval-Augmented Generation (RAG) based system  

📝 Smart Content Generation  
-📄 Automatic Summaries  
-🧠 Flashcards Generation  
-❓ Quiz Generation

📰 Newspaper Module  
How it works-

1. 📅 User Input
User selects a specific date from the UI
Request is sent to backend API

2. 🔍 News Fetching (RSS)
Fetches latest news articles using RSS feeds (e.g., The Hindu)
Extracts:
Title
Article URL
Publish date

3. 🧹 Content Extraction
Uses newspaper3k to extract clean article text
Removes ads, HTML, and irrelevant content

4. 🔁 Deduplication
Applies TF-IDF + cosine similarity
Removes duplicate or highly similar articles

5. 🧠 LLM Processing
📄 Summary Generation
Combines selected articles
Generates:
Key Facts
Background
UPSC Importance
Keywords
❓ Q/A Generation
Generates:
Prelims MCQs
Mains Questions

6. 🏷️ Tagging & Classification
Classifies content into UPSC categories:
Polity
Economy
International Relations
Science & Tech
Environment

7. ⚡ Optimization Techniques
Limits number of articles processed
Uses chunking + aggregation to reduce token usage
Implements retry logic for API rate limits

8. 💾 Caching & Storage
Stores processed results in MongoDB (date-wise)
Uses caching to:
Avoid recomputation
Improve response time

9. 🔗 System Integration
Built as a FastAPI microservice
Integrated with MERN backend via REST APIs


📊 Performance Tracking  
-Track learning progress  
-Activity-based reports  
-Points system 

🧑‍🏫 Performance Coach  
-AI-based personalized suggestions  
-Helps improve weak areas 

🔔 Notifications  
-Real-time activity alerts  
-Keeps users updated

⚙️ Profile & Settings  
-Update profile details  
-Change password  
-Dark/Light mode toggle  

🏗️ **Tech Stack**   
-Frontend  
-React.js  
-Tailwind CSS (or CSS framework)  
-Axios  
-Backend  
-Node.js  
-Express.js  
-MongoDB (Mongoose ORM)  
-AI & Processing  
-Python (for Newspaper Module)  
-LLM Integration  
-RAG (Retrieval-Augmented Generation) 

Other Tools
-JWT (Authentication)
-Bcrypt (Password hashing)
-Nodemailer (Email OTP)
-Multer (File upload)
-Redis (Caching) 

🧠 **How It Works (Flow)**  
-User registers/logs in  
-Uploads documents  
-Documents are processed  
-User interacts with AI assistant  
-System uses RAG:  
-Retrieves relevant content  
-Sends it to LLM  
-Generates accurate answers  
-Additional features:  
-Quiz, flashcards, summaries  
-Performance tracking  
-AI-based coaching  

📊 **Modules Overview**   
-Authentication Module  
-Dashboard Module  
-Document Processing Module  
-AI Assistant Module  
-Newspaper Module  
-Performance & Report Module  
-Notification System  

📈 **Results**    
-Improved learning efficiency  
-Better concept understanding  
-Personalized learning experience  
-Interactive study environment  

🎯 **Objectives**    
-Provide AI-assisted learning  
-Simplify document-based studying  
-Automate quiz & flashcard generation  
-Track and improve performance  
-Create an all-in-one study platform  

👩‍💻 **Team Members**    
-Manshi Sahu  
-Kanak Mohan Jee  
-Mahak Garg  
-Damini Yadav  
-Khushi Chauhan  

⭐ **Conclusion**  
This project leverages the power of Artificial Intelligence in education to deliver an intelligent learning assistant that streamlines study workflows, improves conceptual clarity, and provides personalized performance-based guidance, making the learning process smarter, faster, and more effective.
