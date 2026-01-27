# OpenAI API Audit Report - Klaus News

**Date:** January 26, 2026
**Scope:** Complete audit of OpenAI API usage, model recommendations, and upgrade path

---

## Executive Summary

The Klaus News codebase uses **outdated models** (`gpt-4-turbo`, `gpt-4o-mini`) and an **outdated SDK version** (`openai==1.10.0`). Significant cost savings and performance improvements are available by upgrading to newer models like **GPT-4.1** and **GPT-4.1-mini**.

---

## 1. Current OpenAI Usage in Codebase

### 1.1 SDK Version
| Current | Latest | Status |
|---------|--------|--------|
| `openai==1.10.0` | `openai==2.15.0` | ⚠️ **Outdated** |

**Location:** [requirements.txt:9](backend/requirements.txt#L9)

### 1.2 Models Currently Used

| Model | Purpose | Files Using It |
|-------|---------|----------------|
| `gpt-4-turbo` | Title generation, article generation, categorization, worthiness scoring | [openai_client.py:17](backend/app/services/openai_client.py#L17) |
| `gpt-4o-mini` | Duplicate detection, title similarity | [openai_client.py:68](backend/app/services/openai_client.py#L68), [openai_client.py:228](backend/app/services/openai_client.py#L228) |

### 1.3 API Call Inventory

| Method | File:Line | Model Used | Tokens | Purpose |
|--------|-----------|------------|--------|---------|
| `generate_title_and_summary()` | [openai_client.py:80-113](backend/app/services/openai_client.py#L80-L113) | `gpt-4-turbo` | 30+100 | Generate AI title and summary |
| `categorize_post()` | [openai_client.py:115-140](backend/app/services/openai_client.py#L115-L140) | `gpt-4-turbo` | 20 | Classify post category |
| `generate_article()` | [openai_client.py:142-166](backend/app/services/openai_client.py#L142-L166) | `gpt-4-turbo` | 1000 | Generate full article |
| `score_worthiness()` | [openai_client.py:169-208](backend/app/services/openai_client.py#L169-L208) | `gpt-4-turbo` | 50 | Rate post worthiness |
| `detect_duplicate()` | [openai_client.py:211-252](backend/app/services/openai_client.py#L211-L252) | `gpt-4o-mini` | 10 | Detect duplicate posts |
| `compare_titles_semantic()` | [openai_client.py:254-296](backend/app/services/openai_client.py#L254-L296) | `gpt-4o-mini` | 10 | Compare title similarity |

### 1.4 Configuration Locations

| File | Line | Purpose |
|------|------|---------|
| [config.py:12](backend/app/config.py#L12) | API key configuration |
| [.env.example:65](.env.example#L65) | Environment variable template |
| [docker-compose.yml:34](docker-compose.yml#L34) | Docker environment injection |
| [main.py:21-27](backend/app/main.py#L21-L27) | Default prompt configurations |
| [models/prompt.py:13](backend/app/models/prompt.py#L13) | Database model field |

---

## 2. Latest OpenAI Models (2026)

### 2.1 GPT-5 Series (Flagship Models)

| Model | Input $/1M | Output $/1M | Context | Release Date | Best For |
|-------|------------|-------------|---------|--------------|----------|
| **GPT-5** | $1.25 | $10.00 | 400K | Aug 7, 2025 | Advanced reasoning, multi-step tasks |
| **GPT-5.1** | $1.25 | $10.00 | 400K | Oct 2025 | Conversational, adaptive reasoning |
| **GPT-5.1-Codex-Mini** | $0.25 | $2.00 | 400K | Oct 2025 | Code tasks, cost-optimized |
| **GPT-5.2** | ~$2.00 | $14.00 (reasoning) | 1M+ | Dec 2025 | Flagship - coding, agentic, complex projects |
| **GPT-5.2 Pro** | $15.00 | $120.00 | 1M+ | Dec 2025 | Scientific research, expert-level tasks |

**GPT-5.2 Highlights:**
- 55.6% on SWE-bench Pro (vs 50.8% for GPT-5.1)
- 93.2% on GPQA Diamond (graduate-level benchmark)
- Better at spreadsheets, presentations, code, images, long contexts, tool use
- Supports `reasoning.effort`: none, low, medium, high, xhigh

**Batch Processing:** 50% discount for non-urgent workloads (24h turnaround)
- GPT-5 batch: $0.625/$5.00 per 1M tokens

### 2.2 GPT-4 Series (Production Workhorses)

| Model | Input $/1M tokens | Output $/1M tokens | Context | Best For |
|-------|-------------------|--------------------|---------|---------|
| **GPT-4.1** | $2.00 | $8.00 | **1M tokens** | General purpose, replaces GPT-4-turbo |
| **GPT-4.1-mini** | ~$0.10 | ~$0.40 | 1M tokens | Cost-optimized tasks, replaces GPT-4o-mini |
| GPT-4o | $2.50 | $10.00 | 128K | Legacy, still good for audio |
| GPT-4o-mini | $0.15 | $0.60 | 128K | Legacy lightweight |
| gpt-4-turbo | $10.00 | $30.00 | 128K | ⚠️ **Deprecated** |

### 2.3 Recommended Model Migration

| Current Model | Option A (Cost-Optimized) | Option B (Quality-Optimized) |
|---------------|---------------------------|------------------------------|
| `gpt-4-turbo` | `gpt-4.1` (~80% cheaper) | `gpt-5` or `gpt-5.1` (better quality, ~87% cheaper) |
| `gpt-4o-mini` | `gpt-4.1-mini` (~30% cheaper) | `gpt-5.1-codex-mini` (better for code) |

**Recommendation for Klaus News:**

| Use Case | Recommended Model | Rationale |
|----------|-------------------|-----------|
| Article generation | `gpt-5.1` | Better writing quality, same price as GPT-5, more conversational |
| Title/Summary | `gpt-4.1` | Cost-effective for short outputs |
| Categorization | `gpt-4.1-mini` | Simple classification task |
| Worthiness scoring | `gpt-4.1` | Adequate for numeric scoring |
| Duplicate detection | `gpt-4.1-mini` | Simple similarity check |

**Why not GPT-5.2?** Overkill for news article generation. The reasoning token costs ($14/1M) add up, and GPT-5.1 is sufficient for content creation tasks.

---

## 3. Cost Analysis

### 3.1 Estimated Current Costs (per 1,000 articles)

Assuming average usage per article:
- Title/Summary: ~200 input + 130 output tokens
- Categorization: ~150 input + 20 output tokens
- Article generation: ~300 input + 1000 output tokens
- Worthiness scoring: ~200 input + 50 output tokens
- Duplicate detection (3 checks): ~300 input + 30 output tokens

| Operation | Input Tokens | Output Tokens | gpt-4-turbo Cost | gpt-4.1 Cost |
|-----------|--------------|---------------|------------------|--------------|
| Title/Summary | 200K | 130K | $5.90 | $0.64 |
| Categorization | 150K | 20K | $2.10 | $0.46 |
| Article Gen | 300K | 1000K | $33.00 | $8.60 |
| Worthiness | 200K | 50K | $3.50 | $0.80 |
| **Subtotal (gpt-4-turbo)** | | | **$44.50** | **$10.50** |

| Operation | Input Tokens | Output Tokens | gpt-4o-mini Cost | gpt-4.1-mini Cost |
|-----------|--------------|---------------|------------------|-------------------|
| Duplicate (3x) | 300K | 30K | $0.06 | ~$0.04 |

**Total per 1,000 articles:**
- Current (gpt-4-turbo + gpt-4o-mini): ~$44.56
- Upgraded (gpt-4.1 + gpt-4.1-mini): ~$10.54
- **Savings: ~76%**

---

## 4. Required Changes

### 4.1 Update SDK Version

**File:** `backend/requirements.txt`

```diff
- openai==1.10.0
+ openai>=2.15.0
```

### 4.2 Update Default Model in OpenAI Client

**File:** `backend/app/services/openai_client.py`

```diff
# Line 17
- self.model = "gpt-4-turbo"
+ self.model = "gpt-4.1"
```

### 4.3 Update Fallback Prompts

**File:** `backend/app/services/openai_client.py`

```diff
# Lines 44, 50, 56, 62, 75, 186
- "model": "gpt-4-turbo",
+ "model": "gpt-4.1",

# Lines 68, 228, 272
- "model": "gpt-4o-mini",
+ "model": "gpt-4.1-mini",
```

### 4.4 Update Default Prompts in main.py

**File:** `backend/app/main.py`

Update all default prompt definitions (lines 21-27) to use new model names.

### 4.5 Update Prompts API Reset Defaults

**File:** `backend/app/api/prompts.py`

Update reset endpoint defaults (lines 88-123) to use new model names.

### 4.6 Database Migration

Existing prompts in database will have old model names. Options:
1. Run a SQL update: `UPDATE prompts SET model = 'gpt-4.1' WHERE model = 'gpt-4-turbo';`
2. Reset prompts via admin UI after deployment
3. Add a migration script

---

## 5. API Call Pattern Verification

The current API call pattern is **compatible** with the new SDK:

```python
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=self.api_key)
response = await client.chat.completions.create(
    model="gpt-4.1",  # Updated model name
    messages=[{"role": "user", "content": prompt}],
    temperature=0.7,
    max_tokens=1000
)
```

No changes needed to the call structure - only model names need updating.

---

## 6. Testing Checklist

After making changes, verify:

- [ ] API key is set in environment (`OPENAI_API_KEY`)
- [ ] `generate_title_and_summary()` returns valid title and summary
- [ ] `categorize_post()` returns valid category name
- [ ] `generate_article()` returns markdown-formatted article
- [ ] `score_worthiness()` returns float between 0.0 and 1.0
- [ ] `detect_duplicate()` correctly identifies similar posts
- [ ] `compare_titles_semantic()` correctly compares titles
- [ ] Scheduler processes posts successfully
- [ ] Article regeneration works from UI

---

## 7. Sources

- [OpenAI Models Documentation](https://platform.openai.com/docs/models/)
- [OpenAI API Pricing](https://platform.openai.com/docs/pricing)
- [OpenAI Python SDK (GitHub)](https://github.com/openai/openai-python)
- [OpenAI Python SDK (PyPI)](https://pypi.org/project/openai/)
- [GPT-4.1 Pricing](https://pricepertoken.com/pricing-page/model/openai-gpt-4.1)
- [GPT-4o Mini Pricing](https://pricepertoken.com/pricing-page/model/openai-gpt-4o-mini)
- [GPT-5 API Pricing](https://pricepertoken.com/pricing-page/model/openai-gpt-5)
- [GPT-5.2 Model Documentation](https://platform.openai.com/docs/models/gpt-5.2)
- [Introducing GPT-5.2 (OpenAI)](https://openai.com/index/introducing-gpt-5-2/)
- [GPT-5.1 Pricing Guide](https://chatlyai.app/blog/gpt-5-1-pricing-explained)
- [OpenAI API Pricing 2026 (All Models)](https://pricepertoken.com/pricing-page/provider/openai)

---

## 8. Recommendation

### Option A: Cost-Optimized (Recommended for most use cases)
Upgrade to `gpt-4.1` and `gpt-4.1-mini`:
- ~76% cost reduction vs current setup
- 1M context window (vs 128K)
- Actively maintained (gpt-4-turbo is deprecated)

### Option B: Quality-Optimized
Use `gpt-5.1` for article generation, `gpt-4.1` for everything else:
- Better article quality with GPT-5.1's conversational improvements
- GPT-5.1 is actually **cheaper** than gpt-4-turbo ($1.25 vs $10.00 input)
- ~87% cost reduction on article generation

### Option C: Premium (If budget allows)
Use `gpt-5.2` for article generation with `reasoning.effort=low`:
- Best-in-class writing and reasoning
- Higher cost but fewer regenerations needed
- Consider for premium/featured articles only

**My recommendation:** Start with **Option B** - use `gpt-5.1` for `generate_article()` and `gpt-4.1`/`gpt-4.1-mini` for everything else. This gives you the best quality-to-cost ratio.

The code changes are minimal and backward-compatible. The OpenAI SDK v2.x maintains the same async API structure.
