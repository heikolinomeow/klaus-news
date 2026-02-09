/**
 * API client for backend communication
 */
import axios from 'axios';
import { PostsResponse, ArticlesResponse, Post, Article, GroupArticle } from '../types';

const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

function normalizeApiUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') && window.location.protocol === 'https:') {
    return `https://${url.slice('http://'.length)}`;
  }
  return url;
}

const normalizedApiUrl = normalizeApiUrl(rawApiUrl);
const API_BASE_URL =
  normalizedApiUrl ||
  (window.location.hostname.endsWith('up.railway.app')
    ? 'https://klaus-api.up.railway.app'
    : 'http://localhost:8000');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


// JWT Authorization header interceptor (V-7)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('klaus_news_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses - redirect to login (V-7)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stored token
      localStorage.removeItem('klaus_news_token');
      localStorage.removeItem('klaus_news_token_expiry');
      // Redirect to login (if not already there)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Posts API (V-11: selectPost removed - selection is at group level now)
export const postsApi = {
  getAll: () => apiClient.get<PostsResponse>('/api/posts/'),
  getRecommended: () => apiClient.get<PostsResponse>('/api/posts/recommended'),
  getById: (id: number) => apiClient.get<{ post: Post }>(`/api/posts/${id}`)
};

// Articles API (V-13: group-based article generation)
export const articlesApi = {
  getAll: () => apiClient.get<ArticlesResponse>('/api/articles/'),
  create: (groupId: number) => apiClient.post<{ article: Article }>('/api/articles/', { group_id: groupId }),
  update: (id: number, content: string) => apiClient.put<{ article: Article }>(`/api/articles/${id}`, { content }),
  regenerate: (id: number) => apiClient.post<{ article: Article }>(`/api/articles/${id}/regenerate`),
  postToTeams: (id: number) => apiClient.post(`/api/articles/${id}/post-to-teams`)
};

// Lists API (V-8)
export const listsApi = {
  getAll: () => apiClient.get<{ lists: any[] }>('/api/lists/'),
  create: (data: { list_id: string; list_name?: string; description?: string }) =>
    apiClient.post<{ list: any }>('/api/lists/', data),
  update: (id: number, data: { enabled?: boolean; list_name?: string; description?: string }) =>
    apiClient.put(`/api/lists/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/lists/${id}`),
  test: (id: number) => apiClient.post<{ valid: boolean; message: string }>(`/api/lists/${id}/test`),
  getStats: (id: number) => apiClient.get(`/api/lists/${id}/stats`)
};

// Settings API (V-10, V-23)
export const settingsApi = {
  getAll: () => apiClient.get<Record<string, any[]>>('/api/settings/'),
  getByKey: (key: string) => apiClient.get<any>(`/api/settings/${key}`),
  update: (key: string, value: string) => apiClient.put(`/api/settings/${key}`, { value }),
  batchUpdate: (updates: Array<{ key: string; value: string }>) =>
    apiClient.post('/api/settings/batch', { updates }),
  reset: () => apiClient.post('/api/settings/reset'),
  validate: (key: string, value: string) =>
    apiClient.get<{ valid: boolean; message: string }>(`/api/settings/validate/${key}?value=${value}`),
  getArticlePrompts: () => apiClient.get<{ prompts: Record<string, string> }>('/api/settings/article-prompts/')
};

// Admin API (V-15, V-16, V-17)
export const adminApi = {
  triggerIngestion: () => apiClient.post<{
    message: string;
    status: string;
    stats: {
      lists_processed: number;
      posts_fetched: number;
      new_posts_added: number;
      duplicates_skipped: number;
      api_errors: number;
      last_api_error: { status_code: number; message: string } | null;
    }
  }>('/api/admin/trigger-ingestion'),
  triggerArchive: () => apiClient.post<{ message: string; status: string }>('/api/admin/trigger-archive'),
  getSchedulerStatus: () => apiClient.get<{ paused: boolean; jobs: any[] }>('/api/admin/scheduler-status'),
  pauseScheduler: () => apiClient.post<{ message: string; status: string }>('/api/admin/pause-scheduler'),
  resumeScheduler: () => apiClient.post<{ message: string; status: string }>('/api/admin/resume-scheduler'),
  getArchivePreview: () => apiClient.get<{ count: number; archive_age_days: number; cutoff_date: string }>('/api/admin/archive-preview'),
  getIngestionProgress: () => apiClient.get<{
    is_running: boolean;
    started_at: string | null;
    trigger_source: string;
    total_lists: number;
    current_list: number;
    current_list_name: string;
    total_posts: number;
    current_post: number;
    current_step: string;
    posts_added: number;
    duplicates_skipped: number;
    errors: number;
    progress_percent: number;
  }>('/api/admin/ingestion-progress')
};

// Groups API (V-5, V-8, V-9, V-14)
export const groupsApi = {
  getAll: () => apiClient.get<{ groups: any[] }>('/api/groups/'),
  getArchived: () => apiClient.get<{ groups: any[] }>('/api/groups/archived'),
  getPostsByGroup: (groupId: number) => apiClient.get<{ posts: any[] }>(`/api/groups/${groupId}/posts`),
  select: (groupId: number) => apiClient.post(`/api/groups/${groupId}/select`),
  archive: (groupId: number) => apiClient.post(`/api/groups/${groupId}/archive`),
  unarchive: (groupId: number) => apiClient.post(`/api/groups/${groupId}/unarchive`),
  transition: (groupId: number, targetState: string) =>
    apiClient.post(`/api/groups/${groupId}/transition`, { target_state: targetState })
};

// Prompts API (V-4)
export const promptsApi = {
  getAll: () => apiClient.get<{ prompts: any[] }>('/api/prompts/'),
  getByKey: (key: string) => apiClient.get<any>(`/api/prompts/${key}`),
  update: (key: string, data: { prompt_text: string; model: string; temperature: number; max_tokens: number; description?: string }) =>
    apiClient.put(`/api/prompts/${key}`, data),
  reset: (key: string) => apiClient.post(`/api/prompts/${key}/reset`),
  create: (data: { prompt_key: string; prompt_text: string; model: string; temperature: number; max_tokens: number; description?: string }) =>
    apiClient.post('/api/prompts/', data),
  delete: (key: string) => apiClient.delete(`/api/prompts/${key}`),
  export: () => apiClient.get<{ export_version: string; exported_at: string; prompts: any[] }>('/api/prompts/export'),
  import: (data: any) => apiClient.post('/api/prompts/import', data)
};

// Research API (V-6, V-19)
export const researchApi = {
  run: (groupId: number, mode: string, customPrompt?: string) =>
    apiClient.post(`/api/groups/${groupId}/research/`, { mode, custom_prompt: customPrompt || undefined }),
  get: (groupId: number) =>
    apiClient.get(`/api/groups/${groupId}/research/`),
  update: (groupId: number, editedOutput: string) =>
    apiClient.put(`/api/groups/${groupId}/research/`, { edited_output: editedOutput })
};

// Group Articles API (V-11, V-19)
export const groupArticlesApi = {
  generate: (groupId: number, style: string, customPrompt?: string) =>
    apiClient.post(`/api/groups/${groupId}/article/`, { style, custom_prompt: customPrompt }),
  getAll: (groupId: number) =>
    apiClient.get<{ articles: GroupArticle[]; count: number }>(`/api/groups/${groupId}/articles/`),
  get: (groupId: number) =>
    apiClient.get(`/api/groups/${groupId}/article/`),
  update: (groupId: number, articleId: number, content: string, title?: string, preview?: string) =>
    apiClient.put(`/api/groups/${groupId}/article/${articleId}/`, { content, title, preview }),
  refine: (groupId: number, articleId: number, instruction: string) =>
    apiClient.put(`/api/groups/${groupId}/article/${articleId}/refine/`, { instruction })
};

// Logs API
export const logsApi = {
  getAll: (params: { level?: string; category?: string; hours?: number; limit?: number; offset?: number }) =>
    apiClient.get('/api/logs/', { params }),
  getStats: (hours: number = 24) =>
    apiClient.get(`/api/logs/stats?hours=${hours}`),
  getById: (id: number) =>
    apiClient.get(`/api/logs/${id}`),
  cleanup: (days: number = 30) =>
    apiClient.delete(`/api/logs/cleanup?days=${days}`)
};

// Teams API (V-13, V-19)
export const teamsApi = {
  getChannels: () =>
    apiClient.get<{ channels: Array<{ name: string }> }>('/api/teams/channels'),
  sendToTeams: (articleId: string, channelName: string) =>
    apiClient.post<{ success: boolean; message?: string; error?: string }>('/api/teams/send', {
      articleId,
      channelName
    }),
  testChannels: () =>
    apiClient.post<{ success: boolean; message: string }>('/api/teams/test')
};


export default apiClient;
