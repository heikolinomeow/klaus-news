**Brief: Article-Aware X Ingestion + Feed UX**

**Objective**
Upgrade the current X ingestion flow so that when a post is an X Article or quotes an X Article, we ingest and process the article content (metadata + text where available) instead of treating it like a normal short post.

**Current Flow**
1. Fetch X post.
2. Generate `title` + `summary`.
3. Classify `worthiness`.
4. Show in news feed.

**Target Flow**
1. Fetch X post with article-capable fields/expansions.
2. Detect content type:
   1. `POST` (normal)
   2. `ARTICLE` (post has `article`)
   3. `QUOTE_ARTICLE` (post quotes another post that has `article`)
3. Route ingestion:
   1. `POST` -> existing post pipeline
   2. `ARTICLE` / `QUOTE_ARTICLE` -> article pipeline (extract article metadata/text first, then summarize/classify)
4. Persist unified output for feed rendering with a type tag.
5. UI shows an Article badge + feed filter.

**API Fetch Requirements**
Use post fetch with:
- `tweet.fields=article,note_tweet,entities,referenced_tweets,text,suggested_source_links,card_uri`
- `expansions=referenced_tweets.id,article.cover_media,article.media_entities`

**Processing Rules**
1. If `article` exists, article is primary source.
2. If quoted post exists and quoted has `article`, quoted article is primary source.
3. If article text unavailable (permissions/restrictions), fallback to available metadata + post context.
4. Run summarization + worthiness on article content when present; otherwise fallback gracefully.

**Data Model Additions**
- `content_type`: `post | article | quote_article`
- `source_post_id`
- `quoted_post_id` (nullable)
- `article_id` (nullable)
- `article_title`, `article_subtitle`, `article_text`, `article_entities` (nullable)
- `is_article` (derived bool)
- `ingestion_fallback_reason` (nullable)

**UI Requirements**
1. Add badge/tag on cards: `Article`.
2. Add filter control: `All | Posts | Articles`.
3. Article cards can route to article-specific sectioning (e.g. cooking) using existing classifier outputs.
4. Keep current feed behavior for non-article posts unchanged.

**Acceptance Criteria**
1. Article post is detected and ingested as `content_type=article`.
2. Quote of article is detected and ingested as `content_type=quote_article`.
3. Summary/title/worthiness are produced from article data when available.
4. Feed shows Article badge and filter works correctly.
5. Non-article posts continue through existing pipeline with no regression.
6. Missing/partial article payloads do not fail ingestion; they fallback and log reason.

**Rollout Plan**
1. Ship backend detection + routing behind feature flag.
2. Backfill recent ingested posts for article typing (optional).
3. Enable UI badge/filter.
4. Monitor ingestion success rate, empty-content rate, and classifier quality by `content_type`.
