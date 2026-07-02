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

// Toggle loading state on the generate button (with rotating messages)
const loadingMessages = [
  'Analyzing your skill…',
  'Designing your 30-day plan…',
  'Adding daily tasks & projects…',
  'Almost ready…',
];
let loadingMsgTimer = null;

function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  generateBtn.classList.toggle('loading', isLoading);
  const btnText = generateBtn.querySelector('.btn-text');
  clearInterval(loadingMsgTimer);
  if (isLoading) {
    let i = 0;
    btnText.textContent = loadingMessages[0];
    loadingMsgTimer = setInterval(() => {
      i = Math.min(i + 1, loadingMessages.length - 1);
      btnText.textContent = loadingMessages[i];
    }, 3000);
  } else {
    btnText.textContent = 'Generate My Roadmap';
  }
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
  // Phone-gate: ask for the number once, remember it with localStorage
  if (!localStorage.getItem('mr_phone')) {
    openPhoneModal();
    return;
  }
  generatePDF();
}

/* ============================================================
   PHONE LOGIN MODAL (India numbers only) — gates the PDF
   ============================================================ */
const phoneModal = document.getElementById('phoneModal');
const phoneInput = document.getElementById('phoneInput');
const phoneError = document.getElementById('phoneError');

function openPhoneModal() {
  phoneModal.classList.add('show');
  phoneError.classList.remove('show');
  setTimeout(() => phoneInput.focus(), 150);
}

function closePhoneModal() {
  phoneModal.classList.remove('show');
  phoneError.classList.remove('show');
}

// Validate + save the phone number, then start the PDF download
async function submitPhone() {
  // Keep digits only, drop an optional +91 prefix
  const phone = phoneInput.value.replace(/[\s\-]/g, '').replace(/^\+?91/, '');

  // Indian mobile numbers: 10 digits, starting with 6-9
  if (!/^[6-9]\d{9}$/.test(phone)) {
    phoneError.classList.remove('show');
    void phoneError.offsetWidth; // restart the shake animation
    phoneError.classList.add('show');
    return;
  }

  const submitBtn = document.getElementById('phoneSubmitBtn');
  submitBtn.disabled = true;

  // Save the lead to the backend (best effort — works offline too)
  try {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone, skill: currentSkill }),
    });
  } catch (err) { /* static hosting: still allow the download */ }

  localStorage.setItem('mr_phone', phone);
  submitBtn.disabled = false;
  closePhoneModal();
  showToast('✓ Unlocked! Downloading your PDF…');
  generatePDF();
}

// Allow only digits in the phone input + Enter to submit
phoneInput.addEventListener('input', () => {
  phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
});
phoneInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') submitPhone();
});
// Click outside the card closes the modal
phoneModal.addEventListener('click', e => {
  if (e.target === phoneModal) closePhoneModal();
});

/* ============================================================
   PDF GENERATION (jsPDF, fully client-side)
   ============================================================ */
function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = 0;

  const ORANGE = [255, 123, 28];
  const AMBER = [255, 179, 64];
  const DARK = [26, 18, 12];
  const GREY = [110, 95, 82];

  // Add a new page when we run out of space
  function checkPage(needed) {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }

  // Write one wrapped block of text
  function writeText(text, size, style, color, indent, gap) {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(String(text), pageW - margin * 2 - indent);
    lines.forEach(line => {
      checkPage(size + 5);
      doc.text(line, margin + indent, y);
      y += size + 5;
    });
    y += gap;
  }

  // Section heading with an orange underline
  function writeHeading(title) {
    checkPage(46);
    y += 10;
    writeText(title, 14, 'bold', ORANGE, 0, 2);
    doc.setDrawColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.setLineWidth(1.2);
    doc.line(margin, y - 8, margin + 70, y - 8);
    y += 6;
  }

  // ---- Header banner ----
  doc.setFillColor(12, 8, 5);
  doc.rect(0, 0, pageW, 96, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.text('MASTERROADMAPS', margin, 44);
  doc.setFontSize(11);
  doc.setTextColor(AMBER[0], AMBER[1], AMBER[2]);
  doc.text(`30-Day Extreme Roadmap  |  ${currentSkill.toUpperCase()}  |  ${currentIntensity}`, margin, 68);
  y = 126;

  writeText(currentData.motivation || '', 11, 'italic', GREY, 0, 8);

  // ---- Phases ----
  currentData.phases.forEach((phase, i) => {
    writeHeading(`PHASE ${i + 1}: ${phase.days} — ${phase.name}`);
    writeText(`Goal: ${phase.goal}`, 10.5, 'bolditalic', DARK, 0, 4);
    phase.tasks.forEach(t => writeText(`•  ${t}`, 10.5, 'normal', DARK, 10, 0));
    y += 6;
  });

  // ---- Timetable ----
  writeHeading(`DAILY TIMETABLE (${currentIntensity})`);
  getTimetable(currentIntensity).forEach(row =>
    writeText(`${row.time}  —  ${row.task}`, 10.5, 'normal', DARK, 10, 0));
  y += 6;

  // ---- Resources ----
  writeHeading('FREE RESOURCES');
  currentData.resources.forEach(r =>
    writeText(`${r.label}: ${r.text}`, 10.5, 'normal', DARK, 10, 0));
  y += 6;

  // ---- Projects ----
  writeHeading('PROJECT IDEAS');
  currentData.projects.forEach(p =>
    writeText(`${p.label}: ${p.text}`, 10.5, 'normal', DARK, 10, 0));
  y += 6;

  // ---- Expected results ----
  writeHeading('EXPECTED FINAL RESULT');
  writeText(`Minimum: ${currentData.results.minimum}`, 10.5, 'normal', DARK, 10, 0);
  writeText(`Good: ${currentData.results.good}`, 10.5, 'normal', DARK, 10, 0);
  writeText(`Extreme: ${currentData.results.extreme}`, 10.5, 'normal', DARK, 10, 4);

  writeText('Disclaimer: Result depends on your consistency, starting level, daily time, and quality of practice.', 9, 'italic', GREY, 0, 10);
  writeText('MasterRoadmaps — No excuses, only execution.   |   Created by Rishi Srivastav', 9.5, 'bold', ORANGE, 0, 0);

  // File name: "[skill]-30-day-roadmap.pdf"
  doc.save(`${currentSkill.toLowerCase().replace(/\s+/g, '-')}-30-day-roadmap.pdf`);
  showToast('↓ PDF downloaded!');
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
