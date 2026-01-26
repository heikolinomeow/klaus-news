# AI-Powered Duplicate Detection via Title Semantic Comparison

## 1. Problem Statement

### 1.1 Current Implementation Limitations

**Requirement (Merged Narrative)**

The current duplicate detection system compares raw tweet text using TF-IDF. This approach is noisy because tweets contain hashtags, mentions, links, emoji, and different writing styles. Two tweets about the same story often don't match well.

The current data model stores posts with a `group_id` (just a UUID). When comparing a new post, the system has no clear logic for what to compare against—all posts in a group, the first post, or a random post. There is no clear "representative" for each story.

**Constraints / Non-Goals**

The current approach using TF-IDF on noisy tweets is insufficient for accurate duplicate detection.

---

## 2. Proposed Solution

### 2.1 Detection Method

**Requirement (Merged Narrative)**

Replace TF-IDF comparison with AI semantic comparison of AI-generated titles. The system already generates AI titles for incoming posts. These titles extract the core topic and normalize the noise—for example, "BREAKING: Apple launches iPhone 16! 🔥 #Apple" and "Apple just announced new iPhone 16 https://..." both become "Apple Announces iPhone 16."

Use a cheap AI model (GPT-4o-mini, approximately $0.002 per post) to semantically compare titles using the prompt: "Are these about the same news story? YES/NO"

Compare within category and last 7 days only. This constraint reduces cost and improves accuracy.

**Acceptance Criteria**

- AI titles are generated for incoming posts (already implemented)
- GPT-4o-mini performs semantic comparison of titles
- Comparison uses the prompt: "Are these about the same news story? YES/NO"
- Comparison is scoped to same category and last 7 days only

**Constraints / Non-Goals**

- Cost per post: approximately $0.002 using GPT-4o-mini
- Comparison limited to category and 7-day window

---

## 3. Architectural Changes

### 3.1 Groups as First-Class Entities

**Requirement (Merged Narrative)**

Introduce a Groups table as an explicit entity representing a news story. The Groups table contains:

- Representative title (canonical version)
- Category
- First seen timestamp
- Post count

The Posts table contains individual instances belonging to a group. Each post has its own `ai_title` and references a group via foreign key.

The mental model: Every incoming post either joins an existing group or becomes a new group.

**Acceptance Criteria**

- Groups table exists with fields: representative title, category, first seen timestamp, post count
- Posts table has foreign key reference to Groups
- Each post stores its own `ai_title`
- Incoming posts are assigned to existing groups or create new groups

**Constraints / Non-Goals**

- This replaces the current broken model where posts have `group_id` with no clear representative

---

## 4. UX Improvements

### 4.1 Group-Based Display

**Requirement (Merged Narrative)**

Replace the current UX where PostList shows one post per `group_id` and hidden duplicates are invisible with no context about how many similar posts exist.

The new UX displays groups as cards with a representative title. A badge shows post count (e.g., "5 posts about this story"). Users can click to expand and see all variations. This allows users to understand story popularity and coverage, and to pick which version to use for article generation.

**Acceptance Criteria**

- Groups are displayed as cards with representative title
- Badge displays post count in format "N posts about this story"
- Users can click to expand and view all post variations
- Users can select which post version to use for article generation

**Constraints / Non-Goals**

- Current UX limitation: PostList shows one post per group_id, duplicates are invisible, no visibility into story depth

---

## 5. Expected Benefits

**Requirement (Merged Narrative)**

This approach delivers the following benefits:

- **Accuracy**: Semantic comparison on clean titles vs fuzzy matching on noisy tweets
- **Cost**: Negligible (~$0.002/post for GPT-4o-mini)
- **Scalability**: Compare against ~100 group titles, not ~1000 individual posts
- **UX**: Clear story grouping, visibility into coverage depth
- **Architecture**: Clean separation of concerns (Groups = topics, Posts = instances)
