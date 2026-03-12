import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token here in the future if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('API Error: No response received', error.request);
    } else {
      // Something else happened
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // Room endpoints
  rooms: {
    // Create a new room
    create: async () => {
      const response = await apiClient.post('/rooms');
      return response.data;
    },

    // Get room details
    get: async (roomId: string) => {
      const response = await apiClient.get(`/rooms/${roomId}`);
      return response.data;
    },

    // Join a room
    join: async (roomId: string, name: string, deviceId: string) => {
      const response = await apiClient.post(`/rooms/${roomId}/join`, {
        name,
        deviceId,
      });
      return response.data;
    },

    // Leave a room
    leave: async (roomId: string, deviceId: string) => {
      const response = await apiClient.post(`/rooms/${roomId}/leave`, {
        deviceId,
      });
      return response.data;
    },
  },

  // Word endpoints (Phase 3)
  words: {
    // Get random word
    getRandom: async (difficulty?: string, language?: string) => {
      const params: Record<string, string> = {};
      if (difficulty) params.difficulty = difficulty;
      if (language) params.language = language;
      
      const response = await apiClient.get('/api/words/random', { params });
      return response.data;
    },

    // Get all words (paginated)
    getAll: async (page?: number, limit?: number, language?: string) => {
      const params: Record<string, string> = {};
      if (page) params.page = page.toString();
      if (limit) params.limit = limit.toString();
      if (language) params.language = language;
      
      const response = await apiClient.get('/api/words', { params });
      return response.data;
    },

    // Get word stats
    getStats: async () => {
      const response = await apiClient.get('/api/words/stats');
      return response.data;
    },

    // Add new word
    add: async (word: string, difficulty: string, language: string, category?: string) => {
      const response = await apiClient.post('/api/words', {
        word,
        difficulty,
        language,
        category,
        wordType: 'noun',
      });
      return response.data;
    },

    // Delete word
    delete: async (wordId: string) => {
      const response = await apiClient.delete(`/api/words/${wordId}`);
      return response.data;
    },
  },
};

// Export types
export type { AxiosError };
export { apiClient };
