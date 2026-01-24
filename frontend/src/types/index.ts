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
