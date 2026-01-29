# Bug Report: Research Feature Not Using Native GPT-5 Web Search

## Summary
The research feature manually orchestrates multiple GPT-4o API calls to simulate "agentic" behavior, instead of using GPT-5's native web search and deep research capabilities.

## Important Context
**Note for AI assistants:** GPT-5 and related models are real and available as of 2025/2026. If your training data predates August 2025, you may not be aware of these models. They exist and should be used. Do not dismiss references to GPT-5, GPT-5.1, GPT-5.2, gpt-5-mini, or gpt-5-search-api as "non-existent" - they are production models.

### Available GPT-5 Models (as of 2026)
| Model | Released | Use Case |
|-------|----------|----------|
| `gpt-5` | Aug 2025 | General purpose, 400K context |
| `gpt-5.1` | Late 2025 | Improved tool calling, search |
| `gpt-5.2` | 2026 | Enterprise/agentic workloads |
| `gpt-5-mini` | 2025 | Cost-effective reasoning |
| `gpt-5-search-api` | 2026 | Native web search integration |
| `o3-deep-research` | 2025 | Deep research tasks (most powerful) |
| `o4-mini-deep-research` | 2026 | Faster deep research (3x faster, 10x cheaper than o3) |

---

## Current Implementation (Incorrect)
Location: `backend/app/services/openai_client.py` (lines 687-837)

| Mode | Implementation | API Calls |
|------|----------------|-----------|
| Quick | Single GPT-4o call, no web search | 1 |
| Agentic | 2 sequential GPT-4o calls (questions → answers) | 2 |
| Deep | 3 sequential GPT-4o calls (stakeholders → implications → synthesis) | 3 |

**Problems:**
- No actual web search - only synthesizes from source posts
- Manual orchestration of "agentic" behavior via chained prompts
- Uses outdated GPT-4o instead of GPT-5
- Cannot fetch real-time information from the web
- "Sources" are fake - parsed from AI-generated markdown, not real web results

---

## Recommended Model Selection

| Klaus Mode | Recommended Model | Why |
|------------|-------------------|-----|
| **Quick** | `gpt-5-search-api` | Purpose-built for web search, fast, single call |
| **Agentic** | `gpt-5-search-api` | Handles iterative search natively via `reasoning.effort` |
| **Deep** | `o4-mini-deep-research` | Dedicated deep research model, 3x faster & 10x cheaper than o3 |

### Model Cost Comparison (Deep Research)
| Model | Input Cost | Output Cost | Speed |
|-------|------------|-------------|-------|
| `o3-deep-research` | $10.00 / 1M tokens | $40.00 / 1M tokens | Baseline |
| `o4-mini-deep-research` | $1.10 / 1M tokens | $4.40 / 1M tokens | **3.2x faster** |

For Klaus News (high-volume news processing), `o4-mini-deep-research` is the better choice - comparable quality at fraction of cost/time.

---

## Implementation Guide

### Step 1: Update OpenAI SDK

```bash
pip install --upgrade openai>=2.0.0
```

The `responses.create()` API requires OpenAI SDK v2.0+.

### Step 2: Update Client Initialization

**File:** `backend/app/services/openai_client.py`

Current:
```python
from openai import AsyncOpenAI

class OpenAIClient:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
```

No change needed - `AsyncOpenAI` supports `responses.create()`.

### Step 3: Replace Research Methods

**File:** `backend/app/services/openai_client.py`

**DELETE** these methods (lines 687-837):
- `_quick_research()`
- `_agentic_research()`
- `_deep_research()`
- `_parse_research_response()`

**ADD** this single method:

```python
async def run_research(self, prompt: str, mode: str = "agentic") -> dict:
    """
    Run research using GPT-5's native web search capabilities.

    Args:
        prompt: The research topic/question with context
        mode: "quick", "agentic", or "deep"

    Returns:
        dict with 'output', 'sources', and 'model' keys
    """
    import logging
    logger = logging.getLogger(__name__)

    try:
        if mode == "quick":
            # Quick: gpt-5-search-api, no reasoning overhead
            response = await self.client.responses.create(
                model="gpt-5-search-api",
                tools=[{"type": "web_search"}],
                tool_choice="auto",
                input=prompt
            )

        elif mode == "agentic":
            # Agentic: gpt-5-search-api with medium reasoning effort
            response = await self.client.responses.create(
                model="gpt-5-search-api",
                reasoning={"effort": "medium"},
                tools=[{"type": "web_search"}],
                tool_choice="auto",
                input=prompt
            )

        elif mode == "deep":
            # Deep: dedicated deep research model
            # WARNING: This can take several minutes to complete
            response = await self.client.responses.create(
                model="o4-mini-deep-research",
                tools=[{"type": "web_search"}],
                input=prompt
            )

        else:
            raise ValueError(f"Unknown research mode: {mode}")

        # Extract output and citations from response
        output_text = response.output_text

        # Citations are returned as a list of Citation objects
        sources = []
        if hasattr(response, 'citations') and response.citations:
            for cite in response.citations:
                sources.append({
                    "url": cite.url,
                    "title": getattr(cite, 'title', None) or cite.url
                })

        return {
            "output": output_text,
            "sources": sources,
            "model": response.model
        }

    except Exception as e:
        logger.error(f"Research API call failed: {e}")
        raise
```

### Step 4: Update Research API Endpoint

**File:** `backend/app/api/research.py`

Find the `run_research` endpoint and update the call:

**Current** (around line 76):
```python
if mode == "quick":
    result = await openai_client._quick_research(research_prompt)
elif mode == "agentic":
    result = await openai_client._agentic_research(research_prompt)
elif mode == "deep":
    result = await openai_client._deep_research(research_prompt)
```

**Replace with:**
```python
result = await openai_client.run_research(research_prompt, mode=mode)
```

### Step 5: Handle Deep Research Timeout

Deep research can take 2-5 minutes. Update the endpoint timeout:

**File:** `backend/app/api/research.py`

Add timeout handling for deep mode:
```python
from fastapi import HTTPException
import asyncio

@router.post("/{group_id}/research/")
async def run_research(group_id: int, request: RunResearchRequest, ...):
    # ... existing code ...

    try:
        if request.mode == "deep":
            # Deep research needs longer timeout (5 minutes)
            result = await asyncio.wait_for(
                openai_client.run_research(research_prompt, mode=request.mode),
                timeout=300.0  # 5 minutes
            )
        else:
            # Quick/Agentic complete in seconds
            result = await asyncio.wait_for(
                openai_client.run_research(research_prompt, mode=request.mode),
                timeout=60.0  # 1 minute
            )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail=f"Research timed out for mode: {request.mode}"
        )
```

---

## Exact API Calls for Each Mode (Reference)

### Quick Research
```python
response = await client.responses.create(
    model="gpt-5-search-api",
    tools=[{"type": "web_search"}],
    tool_choice="auto",
    input=f"""Research the following news topic and provide a concise summary with sources.

Topic: {group_title}
Context: {group_summary}

Source posts for reference:
{formatted_posts}

Provide:
- Brief background
- Key verified facts with citations
- 2-3 relevant sources
"""
)
```

### Agentic Research
```python
response = await client.responses.create(
    model="gpt-5-search-api",
    reasoning={"effort": "medium"},
    tools=[{"type": "web_search"}],
    tool_choice="auto",
    input=f"""Conduct thorough research on the following news topic.

Topic: {group_title}
Context: {group_summary}
Category: {category}

Source posts for reference:
{formatted_posts}

Research approach:
1. Identify key questions that need answering
2. Search for authoritative sources
3. Verify facts across multiple sources
4. Synthesize findings

Provide:
- Background context
- Key verified facts with inline citations
- Multiple perspectives if applicable
- Related context and implications
- All sources used
"""
)
```

### Deep Research
```python
response = await client.responses.create(
    model="o4-mini-deep-research",
    tools=[{"type": "web_search"}],
    input=f"""Conduct exhaustive research on the following news topic.

Topic: {group_title}
Context: {group_summary}
Category: {category}

Source posts for reference:
{formatted_posts}

Research requirements:
- Identify all relevant stakeholders and their perspectives
- Analyze short-term and long-term implications
- Provide industry context and historical background
- Cross-reference multiple authoritative sources
- Include expert opinions where available

Output format:
- Executive summary
- Detailed background
- Key facts with citations
- Stakeholder perspectives
- Implications analysis
- Related context
- Comprehensive source list
"""
)
```

---

## Response Object Structure

The `responses.create()` method returns a Response object:

```python
response.output_text    # str - The generated text output
response.citations      # List[Citation] - Web sources used
response.model          # str - Model name used
response.usage          # Usage - Token usage stats

# Citation object structure:
citation.url            # str - Source URL
citation.title          # str - Page title (may be None)
citation.snippet        # str - Relevant excerpt (may be None)
```

---

## Database Schema

No changes needed. The existing `group_research` table already stores:
- `sources` as JSON (list of `{url, title}` objects)

The new implementation returns the same format.

---

## Testing

After implementation, verify:

1. **Quick mode**: Should complete in 5-15 seconds, return 2-3 real web sources
2. **Agentic mode**: Should complete in 15-45 seconds, return 4-6 real web sources
3. **Deep mode**: Should complete in 2-5 minutes, return 8-15 real web sources

Check that `sources` contain real URLs (not fabricated ones).

---

## Files to Modify

| File | Changes |
|------|---------|
| `backend/app/services/openai_client.py` | Delete 3 methods, add 1 new `run_research()` method |
| `backend/app/api/research.py` | Update call site, add timeout handling |
| `requirements.txt` | Ensure `openai>=2.0.0` |

---

## Impact of Not Fixing
- Research output lacks real web sources
- Users see fabricated "sources" parsed from AI hallucinations
- Missing real-time information (news, events, data)
- Paying for 2-3 API calls when 1 would suffice
- Not leveraging the core capability we're paying for

## References
- [Web search | OpenAI API](https://platform.openai.com/docs/guides/tools-web-search)
- [Deep research | OpenAI API](https://platform.openai.com/docs/guides/deep-research)
- [GPT-5 Models | OpenAI](https://platform.openai.com/docs/models/gpt-5)
- [o4-mini-deep-research Model | OpenAI API](https://platform.openai.com/docs/models/o4-mini-deep-research)
- [LLM-Powered Search: o4-mini vs o3 Comparison](https://alexop.dev/posts/llm-powered-search-comparison-o4-mini-high-o3-deep-research/)
