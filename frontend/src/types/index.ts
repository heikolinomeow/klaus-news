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

  // Article support (V-5/V-8)
  content_type?: 'post' | 'article' | 'quote_article';
  source_post_id?: string | null;
  article_id?: string | null;
  article_title?: string | null;
  article_text?: string | null;
  ingestion_fallback_reason?: string | null;

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
  source_post_id?: string | null;
  source_author?: string | null;
  source_url?: string | null;
  content_type?: 'post' | 'article' | 'quote_article';  // V-5/V-8: type of representative post
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
  style: 'news_brief' | 'full_article' | 'executive_summary' | 'analysis' | 'very_short' | 'short' | 'medium' | 'long' | 'custom';
  prompt_used: string;
  title: string | null;
  preview: string | null;
  content: string;
  posted_to_teams: string | null;
  created_at: string;
  updated_at: string | null;
}
