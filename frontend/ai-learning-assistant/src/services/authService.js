import axiosInstance from "../utils/axiosInstance";
import API_PATHS from "../utils/apiPaths";

const normalizeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    _id: user._id || user.id,
    id: user.id || user._id,
    name: user.name || user.username || "",
    username: user.username || user.name || "",
    email: user.email || "",
    profileImage: user.profileImage || "",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const clearAuthState = () => {
  window.localStorage.removeItem("aila_auth_token");
};

const authService = {
  async login({ email, password }) {
    const response = await axiosInstance.post(API_PATHS.auth.login, {
      email,
      password,
    });
    const token = response.data.data?.token;
    const user = normalizeUser(response.data.data?.user);

    if (!token || !user) {
      throw new Error("Login response was incomplete");
    }

    window.localStorage.setItem("aila_auth_token", token);

    return {
      token,
      user,
    };
  },

  async register({ name, email, password }) {
    const response = await axiosInstance.post(API_PATHS.auth.register, {
      username: name,
      email,
      password,
    });
    const token = response.data.data?.token;
    const user = normalizeUser(response.data.data?.user);

    if (!token || !user) {
      throw new Error("Registration response was incomplete");
    }

    window.localStorage.setItem("aila_auth_token", token);

    return {
      token,
      user,
    };
  },

  async getCurrentUser() {
    const token = window.localStorage.getItem("aila_auth_token");
    if (!token) {
      return null;
    }

    try {
      const response = await axiosInstance.get(API_PATHS.auth.me);
      return normalizeUser(response.data.data?.user);
    } catch (error) {
      clearAuthState();
      if (error?.response?.status === 401) {
        return null;
      }
      throw error;
    }
  },

  async updatePassword({ currentPassword, newPassword }) {
    const response = await axiosInstance.put(API_PATHS.auth.changePassword, {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  logout() {
    clearAuthState();
  },
};

export default authService;
