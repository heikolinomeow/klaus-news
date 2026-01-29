"""API endpoints for prompt management (V-4)"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models.prompt import Prompt
from datetime import datetime

router = APIRouter(prefix="/api/prompts", tags=["prompts"])


@router.get("/")
async def get_all_prompts(db: Session = Depends(get_db)):
    """Get all prompts"""
    prompts = db.execute(select(Prompt).order_by(Prompt.prompt_key)).scalars().all()
    return {
        "prompts": [{
            "id": p.id,
            "prompt_key": p.prompt_key,
            "prompt_text": p.prompt_text,
            "model": p.model,
            "temperature": p.temperature,
            "max_tokens": p.max_tokens,
            "version": p.version,
            "description": p.description
        } for p in prompts]
    }


@router.get("/{prompt_key}")
async def get_prompt(prompt_key: str, db: Session = Depends(get_db)):
    """Get prompt by key"""
    prompt = db.execute(
        select(Prompt).where(Prompt.prompt_key == prompt_key)
    ).scalar_one_or_none()

    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    return {
        "id": prompt.id,
        "prompt_key": prompt.prompt_key,
        "prompt_text": prompt.prompt_text,
        "model": prompt.model,
        "temperature": prompt.temperature,
        "max_tokens": prompt.max_tokens,
        "version": prompt.version,
        "description": prompt.description
    }


@router.put("/{prompt_key}")
async def update_prompt(
    prompt_key: str,
    data: dict,
    db: Session = Depends(get_db)
):
    """Update prompt (V-4)"""
    prompt = db.execute(
        select(Prompt).where(Prompt.prompt_key == prompt_key)
    ).scalar_one_or_none()

    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    if "prompt_text" in data:
        prompt.prompt_text = data["prompt_text"]
    if "model" in data:
        prompt.model = data["model"]
    if "temperature" in data:
        prompt.temperature = data["temperature"]
    if "max_tokens" in data:
        prompt.max_tokens = data["max_tokens"]
    if "description" in data:
        prompt.description = data["description"]

    prompt.version += 1
    db.commit()

    return {"message": "Prompt updated", "version": prompt.version}


@router.post("/{prompt_key}/reset")
async def reset_prompt(prompt_key: str, db: Session = Depends(get_db)):
    """Reset prompt to default (V-4)"""
    defaults = {
        "categorize_post": {
            "prompt_text": "You are categorizing social media posts about AI. Read the post carefully and assign it to exactly ONE category based on the primary topic. Consider the main subject matter, not peripheral mentions.\n\nCategorize into one of the following categories:\n{{CATEGORIES}}\n\nReturn ONLY the category name, nothing else.",
            "model": "gpt-5-mini",  # Cost-effective for simple classification
            "temperature": 0.3,
            "max_tokens": 50
        },
        "score_worthiness": {
            "prompt_text": "Rate this post's value for an e-commerce team improving their AI skills (0.0-1.0). High scores for: new AI models/tools, practical AI applications, actionable AI techniques, breaking AI news. Low scores for: opinion pieces, hype without substance, non-actionable content. Return ONLY a number.",
            "model": "gpt-5-mini",  # Cost-effective for scoring
            "temperature": 0.3,
            "max_tokens": 50
        },
        "detect_duplicate": {
            "prompt_text": "Rate how similar these two news headlines are on a scale from 0.0 to 1.0, where 0.0 means completely different topics and 1.0 means they describe the exact same news story. Return ONLY a number.",
            "model": "gpt-5-mini",  # Cost-effective for similarity check
            "temperature": 0.0,
            "max_tokens": 10
        },
        "research_prompt": {
            "prompt_text": "Research this story to help write an article that answers: \"How does this help me work better with AI?\"\n\n**Story:** {{TITLE}}\n**Details:** {{SUMMARY}}\n\nUse web search to find:\n- What's actually new or different here\n- Real-world examples of people/companies benefiting\n- Step-by-step applications if any exist\n- Honest assessment of limitations\n- Links to try it yourself (tools, demos, papers)\n\nWrite for someone with 5 minutes who wants to know if this matters.",
            "model": "gpt-5-search-api",
            "temperature": 0.7,
            "max_tokens": 4000
        }
    }

    if prompt_key not in defaults:
        raise HTTPException(status_code=404, detail="No default available for this prompt")

    prompt = db.execute(
        select(Prompt).where(Prompt.prompt_key == prompt_key)
    ).scalar_one_or_none()

    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    default = defaults[prompt_key]
    prompt.prompt_text = default["prompt_text"]
    prompt.model = default["model"]
    prompt.temperature = default["temperature"]
    prompt.max_tokens = default["max_tokens"]
    prompt.version += 1
    db.commit()

    return {"message": "Prompt reset to default", "version": prompt.version}


@router.get("/export")
async def export_prompts(db: Session = Depends(get_db)):
    """Export all prompts to JSON (V-5)"""
    prompts = db.execute(select(Prompt).order_by(Prompt.prompt_key)).scalars().all()
    return {
        "export_version": "1.0",
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "prompts": [{
            "prompt_key": p.prompt_key,
            "prompt_text": p.prompt_text,
            "model": p.model,
            "temperature": p.temperature,
            "max_tokens": p.max_tokens,
            "description": p.description
        } for p in prompts]
    }


@router.post("/import")
async def import_prompts(import_data: dict, db: Session = Depends(get_db)):
    """Import prompts from JSON (V-5)"""
    if "prompts" not in import_data:
        raise HTTPException(status_code=400, detail="Invalid format: missing 'prompts' key")

    imported_count = 0
    for prompt_data in import_data["prompts"]:
        if "prompt_key" not in prompt_data or "prompt_text" not in prompt_data:
            continue

        existing = db.execute(
            select(Prompt).where(Prompt.prompt_key == prompt_data["prompt_key"])
        ).scalar_one_or_none()

        if existing:
            existing.prompt_text = prompt_data["prompt_text"]
            existing.model = prompt_data.get("model", "gpt-5.1")
            existing.temperature = prompt_data.get("temperature", 0.7)
            existing.max_tokens = prompt_data.get("max_tokens", 500)
            existing.description = prompt_data.get("description")
            existing.version += 1
        else:
            new_prompt = Prompt(
                prompt_key=prompt_data["prompt_key"],
                prompt_text=prompt_data["prompt_text"],
                model=prompt_data.get("model", "gpt-5.1"),
                temperature=prompt_data.get("temperature", 0.7),
                max_tokens=prompt_data.get("max_tokens", 500),
                description=prompt_data.get("description")
            )
            db.add(new_prompt)

        imported_count += 1

    db.commit()
    return {"imported": imported_count}
