const API_PATHS = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    forgotPasswordSendOtp: "/auth/forgot-password/send-otp",
    forgotPasswordVerifyOtp: "/auth/forgot-password/verify-otp",
    me: "/auth/profile",
    changePassword: "/auth/change-password",
  },
  documents: "/documents",
  flashcards: "/flashcards",
  quizzes: "/quizzes",
  ai: "/ai",
  progress: "/progress",
  news: "/news",
  feedback: "/feedback",
};

export default API_PATHS;
