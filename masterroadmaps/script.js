/* ============================================================
   MasterRoadmaps — script.js
   Generates a 30-day learning roadmap for any skill.

   How generation works:
   1. First we try the AI backend (POST /api/generate-roadmap)
      for a fully personalized roadmap.
   2. If the backend is not available (e.g. the site is hosted
      as pure static files on GitHub Pages / Netlify), we fall
      back to smart built-in templates, so the site ALWAYS works.
   ============================================================ */

// ---------- State ----------
let currentSkill = '';                 // the skill the user typed
let currentIntensity = '2 hours/day';  // selected intensity option
let currentData = null;                // the generated roadmap data
let generationMode = '';               // 'AI-POWERED' or 'TEMPLATE'

// ---------- Elements ----------
const skillInput = document.getElementById('skillInput');
const generateBtn = document.getElementById('generateBtn');
const warningMsg = document.getElementById('warningMsg');
const resultSection = document.getElementById('resultSection');
const toast = document.getElementById('toast');

// API endpoint (same-origin — works when backend is deployed with the site)
const API_ENDPOINT = '/api/generate-roadmap';

/* ============================================================
   TIMETABLE — based on selected intensity
   ============================================================ */
function getTimetable(intensity) {
  const timetables = {
    '1 hour/day': [
      { time: '10 min', task: "Revise yesterday's learning" },
      { time: '35 min', task: 'Learn and practice the main topic' },
      { time: '15 min', task: 'Create small output or notes' },
    ],
    '2 hours/day': [
      { time: '15 min', task: 'Revision' },
      { time: '45 min', task: 'Learning' },
      { time: '45 min', task: 'Practice' },
      { time: '15 min', task: 'Notes, output, or reflection' },
    ],
    '4 hours/day Extreme': [
      { time: '30 min', task: 'Revision and warm-up' },
      { time: '90 min', task: 'Deep learning' },
      { time: '90 min', task: 'Deep practice' },
      { time: '45 min', task: 'Project/output work' },
      { time: '15 min', task: 'Reflection and next-day planning' },
    ],
  };
  return timetables[intensity] || timetables['2 hours/day'];
}

/* ============================================================
   TEMPLATE FALLBACK — used when the AI backend is unreachable
   ============================================================ */
function buildTemplateData(skill) {
  return {
    motivation: `Here is your 30-day extreme roadmap to make maximum progress in ${skill}.`,
    phases: [
      {
        name: 'Foundation', days: 'Days 1-7',
        goal: `Understand the basics of ${skill}.`,
        tasks: [
          `Learn the basic terms and concepts of ${skill}.`,
          'Watch beginner-friendly tutorials.',
          'Take simple notes every day.',
          'Practice small beginner exercises.',
          'Identify common mistakes beginners make.',
          `Create your first small output related to ${skill}.`,
        ],
      },
      {
        name: 'Core Practice', days: 'Days 8-15',
        goal: 'Build consistency and practical understanding.',
        tasks: [
          `Practice ${skill} daily using simple exercises.`,
          'Follow one complete beginner course or playlist.',
          'Repeat important concepts until they become clear.',
          'Start one mini project.',
          'Track daily progress.',
          'Improve weak areas.',
        ],
      },
      {
        name: 'Real Projects', days: 'Days 16-23',
        goal: `Apply ${skill} in practical work.`,
        tasks: [
          `Build 2 small projects or outputs related to ${skill}.`,
          `Study examples from people already good at ${skill}.`,
          'Try to copy and recreate beginner-level examples for practice.',
          'Get feedback from online communities or friends.',
          'Fix mistakes and improve quality.',
          'Document what you learned.',
        ],
      },
      {
        name: 'Final Challenge & Portfolio', days: 'Days 24-30',
        goal: 'Create a final visible result.',
        tasks: [
          `Choose one final challenge related to ${skill}.`,
          'Create one complete final project/output.',
          'Polish and improve it.',
          'Make a simple portfolio, document, video, post, or presentation showing your progress.',
          'Review your 30-day journey.',
          'Decide the next 30-day advanced plan.',
        ],
      },
    ],
    resources: [
      { label: 'YouTube', text: `Search "best ${skill} beginner course"` },
      { label: 'Google', text: `Search "${skill} roadmap for beginners"` },
      { label: 'Practice', text: `Build one small ${skill} project or output every week` },
      { label: 'Community', text: `Join Reddit, Discord, Telegram, Quora, or online communities related to ${skill}` },
      { label: 'Notes', text: 'Use Notion, Google Docs, or a notebook to track your progress' },
      { label: 'Portfolio', text: 'Save your best work so you can show your progress after 30 days' },
    ],
    projects: [
      { label: 'Beginner Project', text: `Create a simple beginner-level output using ${skill}.` },
      { label: 'Practice Project', text: `Recreate 3 examples from YouTube or online tutorials related to ${skill}.` },
      { label: 'Final Project', text: `Build one complete final project that proves your progress in ${skill}.` },
      { label: 'Share It', text: 'Post your 30-day progress on LinkedIn, Instagram, YouTube, GitHub, or a personal portfolio depending on the skill.' },
    ],
    results: {
      minimum: `Basic understanding of ${skill}, simple practice habit, and one beginner-level output.`,
      good: `Clear foundation, daily practice experience, 2-3 small projects or outputs, and better confidence in ${skill}.`,
      extreme: `If followed seriously, you can create a strong beginner portfolio, understand the core of ${skill}, and know exactly what to learn next.`,
    },
  };
}

/* ============================================================
   MAIN GENERATION FLOW
   ============================================================ */
async function generateRoadmap() {
  const skill = skillInput.value.trim();

  // 9. Empty input validation
  if (!skill) {
    warningMsg.classList.remove('show');
    void warningMsg.offsetWidth; // restart the shake animation
    warningMsg.classList.add('show');
    skillInput.focus();
    return;
  }
  warningMsg.classList.remove('show');

  currentSkill = skill;
  setLoading(true);

  // Try AI backend first, fall back to templates if unreachable
  try {
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill: currentSkill, intensity: currentIntensity }),
    });
    if (!res.ok) throw new Error('API error');
    const json = await res.json();
    currentData = json.data;
    generationMode = 'AI-POWERED';
  } catch (err) {
    currentData = buildTemplateData(currentSkill);
    generationMode = 'TEMPLATE';
  }

  setLoading(false);
  renderRoadmap();
}

// Toggle loading state on the generate button
function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  generateBtn.classList.toggle('loading', isLoading);
  generateBtn.querySelector('.btn-text').textContent = isLoading
    ? 'Generating your roadmap…'
    : 'Generate My Roadmap';
}

/* ============================================================
   RENDERING
   ============================================================ */
function renderRoadmap() {
  const data = currentData;

  // Header
  document.getElementById('resultSkill').textContent = currentSkill;
  document.getElementById('resultIntensity').textContent = currentIntensity;
  document.getElementById('resultMode').textContent = generationMode;
  document.getElementById('motivationLine').textContent =
    data.motivation || `Here is your 30-day extreme roadmap to make maximum progress in ${currentSkill}.`;

  // Phases
  const phasesWrap = document.getElementById('phasesWrap');
  phasesWrap.innerHTML = data.phases.map((phase, i) => `
    <div class="phase-card" data-testid="phase-card-${i + 1}">
      <div class="phase-top">
        <span class="phase-days">${escapeHtml(phase.days)}</span>
        <span class="phase-name">Phase ${i + 1}: ${escapeHtml(phase.name)}</span>
      </div>
      <p class="phase-goal">Goal: ${escapeHtml(phase.goal)}</p>
      <ul class="phase-tasks">
        ${phase.tasks.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  // Timetable
  const timetable = getTimetable(currentIntensity);
  document.getElementById('timetableWrap').innerHTML = timetable.map(row => `
    <div class="timetable-row">
      <span class="timetable-time">${escapeHtml(row.time)}</span>
      <span class="timetable-task">${escapeHtml(row.task)}</span>
    </div>
  `).join('');

  // Resources
  document.getElementById('resourcesWrap').innerHTML = data.resources.map(r => `
    <div class="info-card">
      <div class="info-label">${escapeHtml(r.label)}</div>
      <div class="info-text">${escapeHtml(r.text)}</div>
    </div>
  `).join('');

  // Projects
  document.getElementById('projectsWrap').innerHTML = data.projects.map(p => `
    <div class="info-card">
      <div class="info-label">${escapeHtml(p.label)}</div>
      <div class="info-text">${escapeHtml(p.text)}</div>
    </div>
  `).join('');

  // Expected results
  document.getElementById('resultsWrap').innerHTML = `
    <div class="result-card minimum">
      <div class="result-tier">MINIMUM RESULT</div>
      <p>${escapeHtml(data.results.minimum)}</p>
    </div>
    <div class="result-card good">
      <div class="result-tier">GOOD RESULT</div>
      <p>${escapeHtml(data.results.good)}</p>
    </div>
    <div class="result-card extreme">
      <div class="result-tier">⚡ EXTREME RESULT</div>
      <p>${escapeHtml(data.results.extreme)}</p>
    </div>
  `;

  // Show the section with a reveal animation, then smooth-scroll to it
  resultSection.classList.add('show');
  resultSection.classList.remove('animate-in');
  void resultSection.offsetWidth; // restart animation
  resultSection.classList.add('animate-in');
  setTimeout(() => {
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// Prevent HTML injection from AI/user text
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

/* ============================================================
   ROADMAP AS PLAIN TEXT (for copy + download)
   ============================================================ */
function buildRoadmapText() {
  const data = currentData;
  const lines = [];
  lines.push('MASTERROADMAPS — 30-DAY EXTREME ROADMAP');
  lines.push('========================================');
  lines.push(`Skill: ${currentSkill}`);
  lines.push(`Intensity: ${currentIntensity}`);
  lines.push('');
  lines.push(data.motivation || '');
  lines.push('');

  data.phases.forEach((phase, i) => {
    lines.push(`PHASE ${i + 1}: ${phase.days} — ${phase.name}`);
    lines.push(`Goal: ${phase.goal}`);
    phase.tasks.forEach(t => lines.push(`  - ${t}`));
    lines.push('');
  });

  lines.push('DAILY TIMETABLE (' + currentIntensity + ')');
  getTimetable(currentIntensity).forEach(row => lines.push(`  ${row.time}: ${row.task}`));
  lines.push('');

  lines.push('FREE RESOURCES');
  data.resources.forEach(r => lines.push(`  - ${r.label}: ${r.text}`));
  lines.push('');

  lines.push('PROJECT IDEAS');
  data.projects.forEach(p => lines.push(`  - ${p.label}: ${p.text}`));
  lines.push('');

  lines.push('EXPECTED FINAL RESULT');
  lines.push(`  Minimum: ${data.results.minimum}`);
  lines.push(`  Good: ${data.results.good}`);
  lines.push(`  Extreme: ${data.results.extreme}`);
  lines.push('');
  lines.push('Disclaimer: Result depends on your consistency, starting level, daily time, and quality of practice.');
  lines.push('');
  lines.push('MasterRoadmaps — No excuses, only execution.');
  return lines.join('\n');
}

/* ============================================================
   ACTION BUTTONS
   ============================================================ */
function copyRoadmap() {
  if (!currentData) return;
  navigator.clipboard.writeText(buildRoadmapText())
    .then(() => showToast('✓ Roadmap copied to clipboard!'))
    .catch(() => showToast('Copy failed — please try again.'));
}

function downloadRoadmap() {
  if (!currentData) return;
  const blob = new Blob([buildRoadmapText()], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  // File name: "[skill]-30-day-roadmap.txt"
  link.download = `${currentSkill.toLowerCase().replace(/\s+/g, '-')}-30-day-roadmap.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('↓ Roadmap downloaded!');
}

function resetRoadmap() {
  skillInput.value = '';
  currentSkill = '';
  currentData = null;
  warningMsg.classList.remove('show');
  resultSection.classList.remove('show', 'animate-in');
  document.getElementById('hero').scrollIntoView({ behavior: 'smooth' });
  skillInput.focus();
}

function regenerateRoadmap() {
  if (!currentSkill) return;
  skillInput.value = currentSkill;
  generateRoadmap();
}

/* ============================================================
   UI HELPERS
   ============================================================ */
// 10. Skill chips fill the input box
function fillSkill(skill) {
  skillInput.value = skill;
  warningMsg.classList.remove('show');
  skillInput.focus();
}

// Toast notification
let toastTimer = null;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

/* ============================================================
   SETUP — intensity buttons, particles, scroll reveal, enter key
   ============================================================ */
// Intensity selector buttons
document.querySelectorAll('.intensity-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentIntensity = btn.dataset.value;
  });
});

// Press Enter inside the input to generate
skillInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') generateRoadmap();
});

// Floating particles background
function createParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 26; i++) {
    const p = document.createElement('div');
    p.className = 'particle' + (Math.random() > 0.5 ? ' cyan' : '');
    const size = Math.random() * 3 + 1.5;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = 100 + Math.random() * 20 + '%';
    p.style.animationDuration = (Math.random() * 14 + 10) + 's';
    p.style.animationDelay = (Math.random() * 14) + 's';
    container.appendChild(p);
  }
}
createParticles();

// Scroll reveal for "How it works" cards and section titles
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
