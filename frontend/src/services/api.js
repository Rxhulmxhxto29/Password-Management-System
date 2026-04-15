import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authService = {
  getSalt: async (username) => {
    const response = await api.get(`/auth/salt/${username}`);
    return response.data.salt;
  },
  login: async (username, authKey) => {
    const response = await api.post('/auth/login', { username, authKey });
    return response.data;
  },
  register: async (username, authKey, salt) => {
    const response = await api.post('/auth/register', { username, authKey, salt });
    return response.data;
  },
};

export const passwordService = {
  getAll: async () => {
    const response = await api.get('/passwords');
    return response.data;
  },
  create: async (data) => {
    // data should contain site, username, encryptedData, iv, authTag
    const response = await api.post('/passwords', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/passwords/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/passwords/${id}`);
    return response.data;
  },
};

export default api;
