# Brief: Article-Aware X Ingestion + Feed UX

## 1. Objective

Upgrade the current X ingestion flow so that when a post is an X Article or quotes an X Article, we ingest and process the article content (metadata + text where available) instead of treating it like a normal short post.

## 2. Current Flow

The existing pipeline operates as follows:

1. Fetch X post.
2. Generate title + summary.
3. Classify worthiness.
4. Show in news feed.

## 3. Target Flow

### 3.1 Fetch

Fetch X posts with article-capable fields and expansions.

### 3.2 Content Type Detection

Detect content type for each ingested post:

- **POST** — normal post (no article attached).
- **ARTICLE** — the post itself has an article.
- **QUOTE_ARTICLE** — the post quotes another post that has an article.

### 3.3 Routing

Route ingestion based on detected content type:

- **POST** → existing post pipeline (unchanged).
- **ARTICLE / QUOTE_ARTICLE** → article pipeline: extract article metadata and text first, then run summarization and classification.

### 3.4 Persistence

Persist unified output for feed rendering with a type tag.

### 3.5 UI

Display an "Article" badge on article cards and provide a feed filter.

## 4. API Fetch Requirements

Use the post fetch endpoint with the following parameters:

- `tweet.fields=article,note_tweet,entities,referenced_tweets,text,suggested_source_links,card_uri`
- `expansions=referenced_tweets.id,article.cover_media,article.media_entities`

## 5. Processing Rules

1. If the post has an article, the article is the primary source.
2. If the post quotes another post and the quoted post has an article, the quoted article is the primary source.
3. If article text is unavailable (due to permissions or restrictions), fall back to available metadata combined with post context.
4. Run summarization + worthiness on article content when present; otherwise fall back gracefully.

## 6. Data Model Additions

The following fields are added:

| Field | Notes |
|---|---|
| `content_type` | `post \| article \| quote_article` |
| `source_post_id` | |
| `quoted_post_id` | nullable |
| `article_id` | nullable |
| `article_title`, `article_subtitle`, `article_text`, `article_entities` | nullable |
| `is_article` | derived bool |
| `ingestion_fallback_reason` | nullable |

## 7. UI Requirements

1. **Article badge**: Add an "Article" badge/tag on feed cards for article-type content.
2. **Filter control**: Add a feed filter with options: All | Posts | Articles.
3. **Article-specific routing**: Article cards can route to article-specific sectioning (e.g., cooking) using existing classifier outputs.
4. **Non-article behavior**: Keep current feed behavior for non-article posts unchanged.

## 8. Acceptance Criteria

1. An article post is detected and ingested as `content_type=article`.
2. A quote of an article is detected and ingested as `content_type=quote_article`.
3. Summary, title, and worthiness are produced from article data when available.
4. The feed shows the "Article" badge and the filter works correctly.
5. Non-article posts continue through the existing pipeline with no regression.
6. Missing or partial article payloads do not fail ingestion; they fall back and log the reason via `ingestion_fallback_reason`.

## 9. Rollout Plan

1. Ship backend detection + routing behind a feature flag.
2. Backfill recent ingested posts for article typing (optional).
3. Enable UI badge/filter.
4. Monitor ingestion success rate, empty-content rate, and classifier quality segmented by `content_type`.

## Notes / Unplaced Fragments (verbatim from source)

- "If you want, I can turn this into an implementation ticket set (backend, schema migration, UI, QA) with estimated effort per ticket."
