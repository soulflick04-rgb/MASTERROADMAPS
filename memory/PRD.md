# MasterRoadmaps — PRD

## Original Problem Statement
Build a complete responsive animated website "MasterRoadmaps" — user types any skill + picks intensity (1h/2h/4h Extreme per day), gets a 30-day extreme learning roadmap: 4 phases (Foundation, Core Practice, Real Projects, Final Challenge & Portfolio) with daily tasks, daily timetable, free resources, project ideas, realistic expected results. Premium futuristic design: black bg, neon green/cyan glow, glassmorphism, animated gradient, floating particles, glowing buttons, animated roadmap reveal, mobile responsive. Extra: Copy / Download as Text / Reset / Regenerate buttons, empty-input validation, 8 sample skill chips, footer. Realistic positioning (no fake "expert in 30 days" promises).

## User Choices
- Files as standalone static site: /app/masterroadmaps/{index.html, style.css, script.js}
- Generation: AI-powered (Emergent LLM Key, OpenAI gpt-5.4)

## Architecture
- Static site (HTML/CSS/vanilla JS) served from /app/frontend/public (React entry no-op'd). Standalone copy in /app/masterroadmaps.
- FastAPI backend: POST /api/generate-roadmap {skill, intensity} → gpt-5.4 via emergentintegrations → strict JSON (motivation, 4 phases×6 tasks, 6 resources, 4 projects, 3 result tiers). Generated roadmaps logged to MongoDB `roadmaps` collection.
- script.js: template-based fallback identical to spec templates if API unreachable → site still fully works as pure static files on GitHub Pages/Netlify (shows TEMPLATE badge instead of AI-POWERED).
- Timetable is client-side per intensity (per spec). Fonts: Unbounded / Manrope / JetBrains Mono.

## User Personas
Students, working professionals, self-learners wanting fast structured progress in any skill.

## Implemented (June 2026)
- All 11 spec sections: hero + input + intensity selector + chips, how-it-works cards, animated result reveal (phases, timetable, resources, projects, expected results + disclaimer), action buttons (copy/download/reset/regenerate), empty-input warning, footer, toast.
- AI generation with skill-specific content, ~15s response; template fallback.
- Tested by testing agent: 100% backend, 100% frontend (iteration_1.json).

## Backlog
- P1: Toast/explanation when AI fails and template fallback is used
- P2: Per-day (day 1–30) expanded task view; save/share roadmap links; PDF export
- P2: Migrate deprecated @app.on_event to lifespan handler

## Test Credentials
None — no auth.
