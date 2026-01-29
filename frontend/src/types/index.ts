/**
 * Type definitions for Klaus News
 */

export interface Post {
  id: number;
  post_id: string;
  original_text: string;
  author: string | null;
  created_at: string;

  // AI-generated fields
  ai_title: string | null;
  ai_summary: string | null;

  // Categorization
  category: string | null;

  // Evaluation scores
  categorization_score: number | null;
  worthiness_score: number | null;

  // Duplicate detection
  group_id: string | null;

  // State
  archived: boolean;
  selected: boolean;

  // Timestamps
  ingested_at: string;
  updated_at: string;
}

export interface Article {
  id: number;
  post_id: number;
  title: string;
  content: string; // Rich text / Markdown
  research_summary: string | null;
  generation_count: number;
  posted_to_teams: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostsResponse {
  posts?: Post[];
  [category: string]: Post[] | undefined;
}

export interface ArticlesResponse {
  articles: Article[];
}

export interface Group {
  id: number;
  representative_title: string;
  category: string;
  first_seen: string;
  state?: 'NEW' | 'COOKING' | 'REVIEW' | 'PUBLISHED';
  archived?: boolean;
  selected?: boolean;
  representative_summary?: string;
  post_count: number;
  max_worthiness?: number;
}

export interface GroupsResponse {
  groups: Group[];
}

// V-18: Research types
export interface GroupResearch {
  id: number;
  group_id: number;
  research_mode: 'quick' | 'agentic' | 'deep';
  original_output: string;
  edited_output: string | null;
  sources: Array<{ url: string; title: string }>;
  model_used: string;
  created_at: string;
  updated_at: string | null;
}

// V-18: Group Article types
export interface GroupArticle {
  id: number;
  group_id: number;
  research_id: number | null;
  style: 'news_brief' | 'full_article' | 'executive_summary' | 'analysis' | 'custom';
  prompt_used: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string | null;
}
