/**
 * Netlify Serverless Function: generate-roadmap
 * Generates a structured 30-day learning roadmap using Google Gemini API.
 * Keeps GEMINI_API_KEY secure on the server side.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Target model: Prefer gemini-2.5-flash-lite for low-latency structured text generation
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

exports.handler = async function (event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // Parse input
  let skill = '';
  let intensity = '2 hours/day';
  try {
    const body = JSON.parse(event.body || '{}');
    skill = (body.skill || '').trim();
    if (body.intensity && typeof body.intensity === 'string') {
      intensity = body.intensity.trim();
    }
  } catch (err) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body.' }),
    };
  }

  if (!skill) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Please provide a "skill".' }),
    };
  }

  // Check API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY environment variable');
    return {
      statusCode: 503,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'AI generation service is currently unconfigured.' }),
    };
  }

  const prompt = `Create a realistic, highly actionable 30-day learning roadmap for the skill: "${skill}" at daily intensity "${intensity}".
Output strictly valid JSON only (no markdown, no code fences, no introductory or trailing text) matching this exact schema:
{
  "motivation": "One short motivational line about making maximum realistic progress in ${skill} in 30 days (no fake expert promises).",
  "phases": [
    {
      "name": "Foundation",
      "days": "Days 1-7",
      "goal": "One sentence goal specific to ${skill}.",
      "tasks": [
        "Concrete daily task 1",
        "Concrete daily task 2",
        "Concrete daily task 3",
        "Concrete daily task 4",
        "Concrete daily task 5",
        "Concrete daily task 6"
      ]
    },
    {
      "name": "Core Practice",
      "days": "Days 8-15",
      "goal": "One sentence goal specific to ${skill}.",
      "tasks": ["Concrete daily task 1", "Concrete daily task 2", "Concrete daily task 3", "Concrete daily task 4", "Concrete daily task 5", "Concrete daily task 6"]
    },
    {
      "name": "Real Projects",
      "days": "Days 16-23",
      "goal": "One sentence goal specific to ${skill}.",
      "tasks": ["Concrete daily task 1", "Concrete daily task 2", "Concrete daily task 3", "Concrete daily task 4", "Concrete daily task 5", "Concrete daily task 6"]
    },
    {
      "name": "Final Challenge & Portfolio",
      "days": "Days 24-30",
      "goal": "One sentence goal specific to ${skill}.",
      "tasks": ["Concrete daily task 1", "Concrete daily task 2", "Concrete daily task 3", "Concrete daily task 4", "Concrete daily task 5", "Concrete daily task 6"]
    }
  ],
  "timetable": [
    { "time": "Time slot", "task": "What to do during this slot" }
  ],
  "resources": [
    { "label": "YouTube", "text": "Specific search or channel recommendation" },
    { "label": "Documentation", "text": "Official docs or reference site" },
    { "label": "Practice", "text": "Specific exercise or problem source" },
    { "label": "Community", "text": "Relevant forum or community" },
    { "label": "Notes", "text": "Tracking or revision advice" },
    { "label": "Portfolio", "text": "How to showcase the result" }
  ],
  "projects": [
    { "label": "Beginner Project", "text": "Specific beginner project idea" },
    { "label": "Practice Project", "text": "Intermediate recreation project idea" },
    { "label": "Final Project", "text": "Complete capstone project idea" },
    { "label": "Share It", "text": "Where and how to publish proof of work" }
  ],
  "results": {
    "minimum": "Realistic minimum outcome after 30 days",
    "good": "Realistic solid outcome with consistent practice",
    "extreme": "Realistic ambitious outcome if completed at full intensity"
  },
  "disclaimer": "Result depends on your consistency, starting level, daily time, and quality of practice."
}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  };

  try {
    const url = `${GEMINI_API_BASE}/${MODEL_NAME}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini API error (${response.status}):`, errText);
      return {
        statusCode: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'AI provider error. Please try again.' }),
      };
    }

    const data = await response.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      console.error('Empty candidate response from Gemini');
      return {
        statusCode: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Empty response from AI.' }),
      };
    }

    // Clean any accidental markdown code fences
    const cleanJson = candidateText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    let roadmapData;
    try {
      roadmapData = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output:', candidateText);
      return {
        statusCode: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Malformed JSON from AI.' }),
      };
    }

    // Validate minimal roadmap schema
    if (
      !roadmapData.phases ||
      !Array.isArray(roadmapData.phases) ||
      roadmapData.phases.length === 0 ||
      !roadmapData.results
    ) {
      console.error('Incomplete schema from Gemini:', roadmapData);
      return {
        statusCode: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Incomplete roadmap data from AI.' }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        skill,
        intensity,
        roadmap: roadmapData,
      }),
    };
  } catch (err) {
    console.error('Handler execution error:', err.message);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal generation error.' }),
    };
  }
};
