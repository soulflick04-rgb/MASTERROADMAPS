from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import re
import uuid
import logging
from pathlib import Path
from pydantic import BaseModel

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RoadmapRequest(BaseModel):
    skill: str
    intensity: str


class LeadRequest(BaseModel):
    phone: str
    skill: str = ""


@api_router.post("/leads")
async def save_lead(req: LeadRequest):
    phone = re.sub(r'[\s\-]', '', req.phone).removeprefix('+91')
    if not re.fullmatch(r'[6-9]\d{9}', phone):
        raise HTTPException(status_code=400, detail="Please enter a valid Indian mobile number.")
    await db.leads.insert_one({
        "id": str(uuid.uuid4()),
        "phone": phone,
        "skill": req.skill,
    })
    return {"success": True}


SYSTEM_MESSAGE = """You are MasterRoadmaps, an expert learning-plan designer.
You create realistic, extreme-focus 30-day learning roadmaps.
Never make fake promises like "become an expert in 30 days" — the goal is maximum realistic progress.
You ALWAYS respond with valid JSON only. No markdown, no code fences, no extra text."""

PROMPT_TEMPLATE = """Create a 30-day learning roadmap for the skill: "{skill}" at intensity "{intensity}".

Respond with ONLY this JSON structure (no code fences):
{{
  "motivation": "One short motivational line about making maximum progress in {skill} in 30 days (realistic, no fake expert promises).",
  "phases": [
    {{"name": "Foundation", "days": "Days 1-7", "goal": "one sentence goal specific to {skill}", "tasks": ["6 concrete daily tasks specific to {skill}"]}},
    {{"name": "Core Practice", "days": "Days 8-15", "goal": "...", "tasks": ["6 tasks"]}},
    {{"name": "Real Projects", "days": "Days 16-23", "goal": "...", "tasks": ["6 tasks"]}},
    {{"name": "Final Challenge & Portfolio", "days": "Days 24-30", "goal": "...", "tasks": ["6 tasks"]}}
  ],
  "resources": [
    {{"label": "YouTube", "text": "specific free search suggestion for {skill}"}},
    {{"label": "Google", "text": "search suggestion"}},
    {{"label": "Practice", "text": "weekly practice suggestion"}},
    {{"label": "Community", "text": "specific free communities (Reddit/Discord/etc) for {skill}"}},
    {{"label": "Notes", "text": "progress tracking suggestion"}},
    {{"label": "Portfolio", "text": "how to save/show progress for {skill}"}}
  ],
  "projects": [
    {{"label": "Beginner Project", "text": "specific beginner output idea for {skill}"}},
    {{"label": "Practice Project", "text": "recreate 3 examples idea, specific to {skill}"}},
    {{"label": "Final Project", "text": "one complete final project idea proving progress in {skill}"}},
    {{"label": "Share It", "text": "where and how to post 30-day progress for {skill}"}}
  ],
  "results": {{
    "minimum": "realistic minimum result after 30 days of {skill}",
    "good": "realistic good result",
    "extreme": "realistic extreme result if followed seriously"
  }}
}}

Make every task concrete and specific to {skill} (mention real concepts, tools, techniques). Keep each task under 20 words."""


def parse_json_response(text: str) -> dict:
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return json.loads(text)


@api_router.get("/")
async def root():
    return {"message": "MasterRoadmaps API is running"}


@api_router.post("/generate-roadmap")
async def generate_roadmap(req: RoadmapRequest):
    skill = req.skill.strip()
    if not skill:
        raise HTTPException(status_code=400, detail="Please enter a skill first.")

    chat = LlmChat(
        api_key=os.environ['EMERGENT_LLM_KEY'],
        session_id=f"roadmap-{uuid.uuid4()}",
        system_message=SYSTEM_MESSAGE,
    ).with_model("openai", "gpt-5.4-mini")

    prompt = PROMPT_TEMPLATE.format(skill=skill, intensity=req.intensity)

    try:
        full_text = ""
        async for event in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(event, TextDelta):
                full_text += event.content
            elif isinstance(event, StreamDone):
                break
        data = parse_json_response(full_text)
    except json.JSONDecodeError:
        logger.error("LLM returned invalid JSON")
        raise HTTPException(status_code=502, detail="AI returned an invalid response. Please try again.")
    except Exception as e:
        logger.error(f"LLM error: {e}")
        raise HTTPException(status_code=502, detail="AI generation failed. Please try again.")

    await db.roadmaps.insert_one({
        "id": str(uuid.uuid4()),
        "skill": skill,
        "intensity": req.intensity,
        "data": data,
    })

    return {"success": True, "data": data}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
