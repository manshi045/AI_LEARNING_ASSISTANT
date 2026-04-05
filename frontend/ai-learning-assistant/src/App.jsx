import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppErrorBoundary from "./components/common/AppErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { NotificationProvider } from "./context/NotificationContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import ForgotPasswordPage from "./pages/Auth/ForgotPasswordPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import DocumentListPage from "./pages/Documents/DocumentListPage";
import DocumentDetailPage from "./pages/Documents/DocumentDetailPage";
import FlashcardListPage from "./pages/Flashcards/FlashcardListPage";
import FlashcardPage from "./pages/Flashcards/FlashcardPage";
import QuizListPage from "./pages/Quizzes/QuizListPage";
import QuizTakePage from "./pages/Quizzes/QuizTakePage";
import QuizResultPage from "./pages/Quizzes/QuizResultPage";
import ProfilePage from "./pages/Profile/ProfilePage";
import NewspaperPage from "./pages/Newspaper/NewspaperPage";
import ReportsPage from "./pages/Reports/ReportsPage";
import FeedbackPage from "./pages/Feedback/FeedbackPage";
import NotFoundPage from "./pages/NotFoundPage";

const App = () => (
  <AppErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/documents" element={<DocumentListPage />} />
                  <Route path="/documents/:documentId" element={<DocumentDetailPage />} />
                  <Route path="/flashcards" element={<FlashcardListPage />} />
                  <Route path="/flashcards/:id" element={<FlashcardPage />} />
                  <Route path="/quizzes" element={<QuizListPage />} />
                  <Route path="/quizzes/:quizId" element={<QuizTakePage />} />
                  <Route path="/quizzes/:quizId/result" element={<QuizResultPage />} />
                  <Route path="/newspaper" element={<NewspaperPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/feedback" element={<FeedbackPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  </AppErrorBoundary>
);

export default App;
