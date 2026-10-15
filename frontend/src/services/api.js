import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to inject bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vericamp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
