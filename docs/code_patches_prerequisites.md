# Code Patches Prerequisites

**Apply these patches BEFORE applying code_patches_confirmed.md**

Status: BLOCKING - V-6, V-11, A.2 cannot be applied without these

---

## Prerequisite 1: Add Group.state column

**File:** `backend/app/models/group.py`
**Operation:** INSERT AFTER
**Anchor:**
```python
    selected = Column(Boolean, default=False, nullable=False)  # User selected for article
```

**New Code:**
```python

    # State machine (NEW → COOKING → REVIEW → PUBLISHED)
    state = Column(String, default='NEW', nullable=False, index=True)
```

**Why needed:** V-11 Patch 11.1 line 329 references `Group.state` which doesn't exist yet

---

## Prerequisite 2: Create ResearchClient

**File:** `backend/app/services/openai_client.py`
**Operation:** INSERT AFTER
**Anchor:**
```python
openai_client = OpenAIClient()
```

**New Code:**
```python


class ResearchClient:
    """Client for AI research operations with multiple depth modes"""

    def __init__(self):
        self.api_key = settings.openai_api_key

    async def quick_research(self, prompt: str) -> dict:
        """Quick research mode - single OpenAI call, fast response

        Args:
            prompt: Research prompt with topic and source posts

        Returns:
            dict with keys:
                - output (str): Research findings in markdown
                - sources (list): List of dicts with url and title keys
                - model_used (str): Model name used
        """
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.api_key)

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a research assistant. Provide concise, factual research based on the given sources. Format output with markdown headings: ## Background, ## Key Facts Verified, ## Related Context, ## Sources."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1000
        )

        output = response.choices[0].message.content.strip()

        return self._parse_research_response(response, "gpt-4o")

    async def agentic_research(self, prompt: str) -> dict:
        """Agentic research mode - multi-step reasoning, moderate depth

        Args:
            prompt: Research prompt with topic and source posts

        Returns:
            dict with keys:
                - output (str): Research findings in markdown
                - sources (list): List of dicts with url and title keys
                - model_used (str): Model name used
        """
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.api_key)

        # Step 1: Identify key questions
        questions_response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "Extract 3-5 key research questions that should be answered about this topic."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=300
        )

        questions = questions_response.choices[0].message.content.strip()

        # Step 2: Research each question
        research_response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a research assistant. Answer each research question thoroughly based on the sources. Format output with markdown headings: ## Background, ## Key Facts Verified, ## Related Context, ## Sources."
                },
                {"role": "user", "content": f"{prompt}\n\nResearch questions to address:\n{questions}"}
            ],
            temperature=0.4,
            max_tokens=2000
        )

        output = research_response.choices[0].message.content.strip()

        return self._parse_research_response(research_response, "gpt-4o")

    async def deep_research(self, prompt: str) -> dict:
        """Deep research mode - comprehensive research, multiple perspectives

        Args:
            prompt: Research prompt with topic and source posts

        Returns:
            dict with keys:
                - output (str): Research findings in markdown
                - sources (list): List of dicts with url and title keys
                - model_used (str): Model name used
        """
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.api_key)

        # Step 1: Identify stakeholders and perspectives
        perspectives_response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "Identify key stakeholders and different perspectives that should be considered for this topic."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=400
        )

        perspectives = perspectives_response.choices[0].message.content.strip()

        # Step 2: Research implications and context
        implications_response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "Analyze the implications, industry context, and broader significance of this topic."
                },
                {"role": "user", "content": f"{prompt}\n\nConsider these perspectives:\n{perspectives}"}
            ],
            temperature=0.4,
            max_tokens=1500
        )

        implications = implications_response.choices[0].message.content.strip()

        # Step 3: Synthesize comprehensive research
        synthesis_response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a senior research analyst. Synthesize comprehensive research that covers background, verified facts, different perspectives, implications, and related context. Format output with markdown headings: ## Executive Summary, ## Background, ## Key Facts Verified, ## Multiple Perspectives, ## Industry Implications, ## Related Context, ## Sources."
                },
                {
                    "role": "user",
                    "content": f"{prompt}\n\nPerspectives identified:\n{perspectives}\n\nImplications analysis:\n{implications}"
                }
            ],
            temperature=0.5,
            max_tokens=3000
        )

        output = synthesis_response.choices[0].message.content.strip()

        return self._parse_research_response(synthesis_response, "gpt-4o")

    def _parse_research_response(self, response, model_used: str) -> dict:
        """Parse OpenAI response into research result format

        Args:
            response: OpenAI API response object
            model_used: Model name used for the request

        Returns:
            dict with keys:
                - output (str): Research findings text
                - sources (list): List of source dicts
                - model_used (str): Model name
        """
        output = response.choices[0].message.content.strip()

        # Extract sources from markdown (look for ## Sources section)
        sources = []
        if "## Sources" in output:
            sources_section = output.split("## Sources")[-1].strip()
            # Parse numbered list like "1. URL - Title"
            for line in sources_section.split("\n"):
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith("-")):
                    # Simple heuristic: if line contains http, extract URL
                    if "http" in line:
                        # Format: {"url": "...", "title": "..."}
                        parts = line.split("http", 1)
                        url = "http" + parts[1].split()[0].rstrip(".,;)")
                        title = parts[0].strip("1234567890.-) ")
                        if not title:
                            title = url
                        sources.append({"url": url, "title": title})

        return {
            "output": output,
            "sources": sources,
            "model_used": model_used
        }


research_client = ResearchClient()
```

**Why needed:** V-6 Patch 6.1 line 49 imports `research_client` which doesn't exist yet

---

## Prerequisite 3: Fix A.2 anchor (CRITICAL)

**Problem:** Current anchor `}` is non-unique (6 occurrences in file)

**File:** Replace in `docs/code_patches.md` V-A.2 section

**Current (BROKEN):**
```markdown
**Anchor:**
```typescript
}
```
**Anchor Context:** End of Group interface (after `post_count: number;` line)
```

**Fixed (UNIQUE):**
```markdown
**Anchor:**
```typescript
  post_count: number;
}
```
```

**Why needed:** Edit tool requires unique anchors. Single `}` matches 6 interfaces.

---

## Application Order

1. **Apply Prerequisite 1** (Group.state column)
2. **Apply Prerequisite 2** (ResearchClient)
3. **Fix Prerequisite 3** (A.2 anchor in code_patches.md)
4. **Then apply:** V-6, V-11, A.2 from code_patches.md

---

## Verification Commands

After applying prerequisites, verify:

```bash
# Check Group.state exists
grep -n "state = Column" backend/app/models/group.py

# Check research_client exists
grep -n "research_client = ResearchClient()" backend/app/services/openai_client.py

# Check A.2 anchor is unique
grep -c "  post_count: number;" frontend/src/types/index.ts  # Should output: 1
```

All three must succeed before applying V-6, V-11, A.2.
