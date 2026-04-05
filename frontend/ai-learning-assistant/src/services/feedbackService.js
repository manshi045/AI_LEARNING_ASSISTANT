import axiosInstance from "../utils/axiosInstance";

const feedbackService = {
  async submitFeedback(payload) {
    const response = await axiosInstance.post("/api/feedback", payload);
    return response.data.data;
  },

  async getMyFeedback() {
    const response = await axiosInstance.get("/api/feedback");
    return response.data.data || [];
  },
};

export default feedbackService;
