import axiosInstance from "../utils/axiosInstance";
import API_PATHS from "../utils/apiPaths";

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags.filter(Boolean);
  }

  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeNewsPayload = (data = {}) => ({
  id: data._id || data.date,
  date: data.date || "",
  summary: data.summary || "No summary available for this date.",
  qa: data.qa || "",
  tags: normalizeTags(data.tags),
  importance: data.importance || "Importance not available.",
  syllabusLinks: Array.isArray(data.syllabus_links) ? data.syllabus_links : [],
});

const newspaperService = {
  async getNewsByDate(date) {
    const response = await axiosInstance.get(`${API_PATHS.news}/${date}`);
    return normalizeNewsPayload(response.data?.data || {});
  },
};

export default newspaperService;
