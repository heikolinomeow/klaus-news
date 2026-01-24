/**
 * API client for backend communication
 */
import axios from 'axios';
import { PostsResponse, ArticlesResponse, Post, Article } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Posts API
export const postsApi = {
  getAll: () => apiClient.get<PostsResponse>('/api/posts/'),  // Added trailing slash
  getRecommended: () => apiClient.get<PostsResponse>('/api/posts/recommended/'),  // Added trailing slash
  getById: (id: number) => apiClient.get<{ post: Post }>(`/api/posts/${id}/`),  // Added trailing slash
  selectPost: (id: number) => apiClient.post(`/api/posts/${id}/select/`),  // Added trailing slash
};

// Articles API
export const articlesApi = {
  getAll: () => apiClient.get<ArticlesResponse>('/api/articles/'),  // Added trailing slash
  create: (postId: number) => apiClient.post<{ article: Article }>('/api/articles/', { post_id: postId }),  // Added trailing slash
  update: (id: number, content: string) => apiClient.put<{ article: Article }>(`/api/articles/${id}/`, { content }),  // Added trailing slash
  regenerate: (id: number) => apiClient.post<{ article: Article }>(`/api/articles/${id}/regenerate/`),  // Added trailing slash
  postToTeams: (id: number) => apiClient.post(`/api/articles/${id}/post-to-teams/`),  // Added trailing slash
};

// Lists API (V-8)
export const listsApi = {
  getAll: () => apiClient.get<{ lists: any[] }>('/api/lists/'),
  create: (data: { list_id: string; list_name?: string; description?: string }) =>
    apiClient.post<{ list: any }>('/api/lists/', data),
  update: (id: number, data: { enabled?: boolean; list_name?: string; description?: string }) =>
    apiClient.put(`/api/lists/${id}/`, data),
  delete: (id: number) => apiClient.delete(`/api/lists/${id}/`),
  test: (id: number) => apiClient.post<{ valid: boolean; message: string }>(`/api/lists/${id}/test/`),
  getStats: (id: number) => apiClient.get(`/api/lists/${id}/stats/`)
};

// Settings API (V-10, V-23)
export const settingsApi = {
  getAll: () => apiClient.get<Record<string, any[]>>('/api/settings/'),
  getByKey: (key: string) => apiClient.get<any>(`/api/settings/${key}/`),
  update: (key: string, value: string) => apiClient.put(`/api/settings/${key}/`, { value }),
  batchUpdate: (updates: Array<{ key: string; value: string }>) =>
    apiClient.post('/api/settings/batch/', { updates }),
  reset: () => apiClient.post('/api/settings/reset/'),
  validate: (key: string, value: string) =>
    apiClient.get<{ valid: boolean; message: string }>(`/api/settings/validate/${key}/?value=${value}`)
};

// Admin API (V-15, V-16, V-17)
export const adminApi = {
  triggerIngestion: () => apiClient.post<{ message: string; status: string }>('/api/admin/trigger-ingestion'),
  triggerArchive: () => apiClient.post<{ message: string; status: string }>('/api/admin/trigger-archive'),
  getSchedulerStatus: () => apiClient.get<{ paused: boolean; jobs: any[] }>('/api/admin/scheduler-status'),
  pauseScheduler: () => apiClient.post<{ message: string; status: string }>('/api/admin/pause-scheduler'),
  resumeScheduler: () => apiClient.post<{ message: string; status: string }>('/api/admin/resume-scheduler'),
  getArchivePreview: () => apiClient.get<{ count: number; archive_age_days: number; cutoff_date: string }>('/api/admin/archive-preview')
};


// Prompts API (V-4)
export const promptsApi = {
  getAll: () => apiClient.get<{ prompts: any[] }>('/api/prompts/'),
  getByKey: (key: string) => apiClient.get<any>(`/api/prompts/${key}/`),
  update: (key: string, data: { prompt_text: string; model: string; temperature: number; max_tokens: number; description?: string }) =>
    apiClient.put(`/api/prompts/${key}/`, data),
  reset: (key: string) => apiClient.post(`/api/prompts/${key}/reset/`),
  create: (data: { prompt_key: string; prompt_text: string; model: string; temperature: number; max_tokens: number; description?: string }) =>
    apiClient.post('/api/prompts/', data),
  delete: (key: string) => apiClient.delete(`/api/prompts/${key}/`),
  export: () => apiClient.get<{ export_version: string; exported_at: string; prompts: any[] }>('/api/prompts/export'),
  import: (data: any) => apiClient.post('/api/prompts/import', data)
};


export default apiClient;
