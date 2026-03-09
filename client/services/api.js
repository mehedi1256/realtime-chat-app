import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const store = JSON.parse(localStorage.getItem('chat-store') || '{}');
    const token = store?.state?.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chat-store');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (formData) =>
    api.post('/auth/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const userAPI = {
  getUsers: () => api.get('/users'),
  searchUsers: (query) => api.get(`/users/search?q=${encodeURIComponent(query)}`),
};

export const messageAPI = {
  getMessages: (userId, page = 1) => api.get(`/messages/${userId}?page=${page}`),
  markSeen: (userId) => api.put(`/messages/${userId}/seen`),
  editMessage: (id, encryptedMessage) => api.put(`/messages/${id}/edit`, { encryptedMessage }),
  deleteMessage: (id) => api.delete(`/messages/${id}`),
  reactToMessage: (id, emoji) => api.post(`/messages/${id}/react`, { emoji }),
  uploadFile: (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/messages/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
  },
};

export const groupAPI = {
  create: (data) => {
    const formData = new FormData();
    formData.append('groupName', data.groupName);
    if (data.memberIds?.length) {
      formData.append('memberIds', JSON.stringify(data.memberIds));
    }
    if (data.groupAvatar) formData.append('groupAvatar', data.groupAvatar);
    return api.post('/groups', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getMyGroups: () => api.get('/groups'),
  getById: (groupId) => api.get(`/groups/${groupId}`),
  update: (groupId, data) => {
    const formData = new FormData();
    if (data.groupName) formData.append('groupName', data.groupName);
    if (data.groupAvatar) formData.append('groupAvatar', data.groupAvatar);
    if (data.settings && typeof data.settings === 'object') {
      formData.append('settings', JSON.stringify(data.settings));
    }
    return api.put(`/groups/${groupId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  addMembers: (groupId, memberIds) => api.post(`/groups/${groupId}/members`, { memberIds }),
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
  leave: (groupId) => api.post(`/groups/${groupId}/leave`),
};

export const groupMessageAPI = {
  getMessages: (groupId, page = 1) => api.get(`/groups/${groupId}/messages?page=${page}`),
};

export default api;
