/* ═══════════════════════════════════════════════════════════
   WHAT YOUR HAND HOLDS — app.js
   Vanilla JS + MediaPipe Hands
═══════════════════════════════════════════════════════════ */

'use strict';

// ─────────────────────────────────────────────
// OBJECTS DATA
// ─────────────────────────────────────────────
const OBJECTS = [
  {
    id: 'penny',
    name: 'A Penny (1¢)',
    emoji: '🪙',
    bigNum: '2.7¢',
    bigLabel: 'to manufacture',
    fact: "costs more to make than it's worth. It weighs 2.5g — the same as a hummingbird mid-flight.",
    color: '#F4A261',
    bubbleBg: '#FFF3E8',
    weight: 2.5,
    water: 0,
    value: 0.01,
  },
  {
    id: 'egg',
    name: 'An Egg',
    emoji: '🥚',
    bigNum: '26',
    bigLabel: 'hours to produce',
    fact: "A chicken spent 24–26 hours making this. You'll eat it in about 3 minutes.",
    color: '#F7C948',
    bubbleBg: '#FFFBEA',
    weight: 50,
    water: 0,
    value: 0.20,
  },
  {
    id: 'coffee',
    name: 'A Cup of Coffee',
    emoji: '☕',
    bigNum: '140L',
    bigLabel: 'of water used',
    fact: "went into growing, processing, and brewing this one cup. That's a full bathtub — for one coffee.",
    color: '#4ECDC4',
    bubbleBg: '#E8FAFA',
    weight: 240,
    water: 140,
    value: 3.50,
  },
  {
    id: 'iphone',
    name: 'An iPhone',
    emoji: '📱',
    bigNum: '34kg',
    bigLabel: 'of rock mined',
    fact: "had to be extracted to get the minerals inside this one phone. For. One. Phone.",
    color: '#74B9FF',
    bubbleBg: '#EAF4FF',
    weight: 206,
    water: 0,
    value: 999,
  },
  {
    id: 'rice',
    name: 'A Bowl of Rice',
    emoji: '🍚',
    bigNum: '270L',
    bigLabel: 'of water',
    fact: "and 3–4 months of sunlight went into growing this bowl. Worth every single grain.",
    color: '#A8E063',
    bubbleBg: '#F2FCE8',
    weight: 200,
    water: 270,
    value: 0.50,
  },
  {
    id: 'brick',
    name: 'A Brick',
    emoji: '🧱',
    bigNum: '0.7kg',
    bigLabel: 'of CO₂ released',
    fact: "baking this at 1,000°C. There are 10,000 of these in an average house. Do the math.",
    color: '#E17055',
    bubbleBg: '#FEF0EC',
    weight: 2300,
    water: 0,
    value: 0.50,
  },
  {
    id: 'gold',
    name: 'A Gold Bar (1kg)',
    emoji: '🏅',
    bigNum: '$75,000',
    bigLabel: 'in your hand',
    fact: "To mine this, workers dug through 20 tons of earth. Please don't drop it.",
    color: '#FDCB6E',
    bubbleBg: '#FFFBEA',
    weight: 1000,
    water: 0,
    value: 75000,
  },
  {
    id: 'data',
    name: 'Your Daily Data',
    emoji: '💾',
    bigNum: '2.5GB',
    bigLabel: 'generated today',
    fact: "If stored on floppy disks, that stack would be taller than you. Every. Single. Day.",
    color: '#A29BFE',
    bubbleBg: '#F0EFFF',
    weight: 0,
    water: 0,
    value: 0,
  },
];

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let state = {
  currentIdx:    -1,          // which object is showing (-1 = none yet)
  objectVisible: false,       // is an object currently on screen?
  isTransition:  false,       // mid-advance animation?
  needsReopen:   false,       // must close+reopen hand before next object shows
  fistStartMs:   null,        // when the current fist hold began
  smoothX:       -1,
  smoothY:       -1,
};

const FIST_HOLD_MS    = 900;   // how long to hold a fist to drop
const FIST_RING_CIRC  = 238.76; // circumference of SVG ring (2π×38)
const SMOOTH_FACTOR   = 0.25;  // hand position lerp

// ─────────────────────────────────────────────
// DOM REFS
// ─────────────────────────────────────────────
const $ = id => document.getElementById(id);

const screens = {
  landing: $('screen-landing'),
  loading: $('screen-loading'),
  camera:  $('screen-camera'),
  summary: $('screen-summary'),
};

const webcamEl       = $('webcam');
const bgTint         = $('bg-tint');
const palmObjectEl   = $('palm-object');
const objectBubbleEl = $('object-bubble');
const objectEmojiEl  = $('object-emoji');
const fistIndicator  = $('fist-indicator');
const fistRingPath   = $('fist-ring-path');
const handStatusEl   = $('hand-status');
const statusTextEl   = $('status-text');
const topBarEl       = $('top-bar');
const objNumEl       = $('obj-num');
const progressDotsEl = $('progress-dots');
const factCardEl     = $('fact-card');
const fcNameEl       = $('fc-name');
const fcBigNumEl     = $('fc-big-num');
const fcBigLabelEl   = $('fc-big-label');
const fcFactEl       = $('fc-fact');
const toastEl        = $('toast');
const summaryGridEl  = $('summary-grid');
const summaryStatsEl = $('summary-stats');

// ─────────────────────────────────────────────
// SCREEN MANAGEMENT
// ─────────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ─────────────────────────────────────────────
// HIT COUNTER
// ─────────────────────────────────────────────
$('hit-count').textContent =
  (Math.floor(Math.random() * 900000) + 100000).toLocaleString();

// ─────────────────────────────────────────────
// PROGRESS DOTS
// ─────────────────────────────────────────────
function renderProgressDots() {
  progressDotsEl.innerHTML = '';
  OBJECTS.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'pdot' +
      (i < state.currentIdx  ? ' done' :
       i === state.currentIdx ? ' current' : '');
    if (i < state.currentIdx) {
      dot.style.background    = OBJECTS[i].color;
      dot.style.borderColor   = OBJECTS[i].color;
    } else if (i === state.currentIdx) {
      dot.style.borderColor   = OBJECTS[i].color;
      dot.style.boxShadow     = `0 0 0 2px ${OBJECTS[i].color}`;
    }
    progressDotsEl.appendChild(dot);
  });
}

// ─────────────────────────────────────────────
// SHOW OBJECT
// ─────────────────────────────────────────────
function showObject(idx) {
  if (idx >= OBJECTS.length) { showSummary(); return; }

  const obj = OBJECTS[idx];
  state.currentIdx    = idx;
  state.objectVisible = true;
  state.isTransition  = false;
  state.needsReopen   = false;
  state.fistStartMs   = null;

  // Background tint
  bgTint.style.backgroundColor = obj.color;

  // Bubble
  objectEmojiEl.textContent          = obj.emoji;
  objectBubbleEl.style.backgroundColor = obj.bubbleBg;
  objectBubbleEl.style.borderColor     = obj.color;
  objectBubbleEl.style.boxShadow       = `5px 5px 0 rgba(0,0,0,0.5)`;

  // Re-trigger pop-in animation
  palmObjectEl.classList.remove('hidden', 'dropping');
  objectBubbleEl.style.animation = 'none';
  requestAnimationFrame(() => {
    objectBubbleEl.style.animation = '';
  });

  // Fact card
  fcNameEl.textContent      = obj.name;
  fcBigNumEl.textContent    = obj.bigNum;
  fcBigNumEl.style.color    = obj.color;
  fcBigLabelEl.textContent  = obj.bigLabel;
  fcFactEl.textContent      = obj.fact;
  factCardEl.style.borderTopColor = obj.color;
  factCardEl.classList.remove('hidden');

  // Top bar
  objNumEl.textContent = idx + 1;
  topBarEl.classList.remove('hidden');
  renderProgressDots();

  // Hide status
  handStatusEl.classList.add('hidden');
  fistIndicator.classList.add('hidden');
}

// ─────────────────────────────────────────────
// ADVANCE (drop object, show next)
// ─────────────────────────────────────────────
function advanceObject() {
  if (state.isTransition || !state.objectVisible) return;

  state.isTransition  = true;
  state.objectVisible = false;
  state.fistStartMs   = null;
  state.needsReopen   = true;

  // Hide controls immediately
  factCardEl.classList.add('hidden');
  fistIndicator.classList.add('hidden');
  fistRingPath.style.strokeDashoffset = FIST_RING_CIRC;

  // Drop animation
  palmObjectEl.classList.add('dropping');

  setTimeout(() => {
    palmObjectEl.classList.add('hidden');
    palmObjectEl.classList.remove('dropping');

    state.isTransition = false;

    if (state.currentIdx + 1 >= OBJECTS.length) {
      showSummary();
    } else {
      // Show "open palm" instruction
      statusTextEl.innerHTML = 'OPEN YOUR PALM<br>FOR THE NEXT ONE';
      handStatusEl.classList.remove('hidden');
    }
  }, 420);
}

// ─────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────
function showSummary() {
  // Stop camera
  if (webcamEl.srcObject) {
    webcamEl.srcObject.getTracks().forEach(t => t.stop());
  }

  showScreen('summary');

  // Build grid
  summaryGridEl.innerHTML = '';
  OBJECTS.forEach(obj => {
    const item = document.createElement('div');
    item.className = 'sg-item';
    item.innerHTML = `
      <div class="sg-emoji">${obj.emoji}</div>
      <div class="sg-name">${obj.name}</div>
    `;
    item.style.borderColor = obj.color + '60';
    summaryGridEl.appendChild(item);
  });

  // Compute totals
  const totalWeightG = OBJECTS.reduce((s, o) => s + o.weight, 0);
  const totalWaterL  = OBJECTS.reduce((s, o) => s + o.water,  0);
  const totalValue   = OBJECTS.reduce((s, o) => s + o.value,  0);

  summaryStatsEl.innerHTML = `
    <div class="stat-line">⚖ Total weight: <strong>${(totalWeightG / 1000).toFixed(2)}kg</strong></div>
    <div class="stat-line">💧 Water footprint: <strong>${totalWaterL}L</strong></div>
    <div class="stat-line">💰 Total value: <strong>$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></div>
    <div class="stat-line">💾 Plus 2.5GB of invisible data</div>
  `;
}

// ─────────────────────────────────────────────
// SHARE + RESTART
// ─────────────────────────────────────────────
function shareExperience() {
  const url = window.location.href;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => showToast('LINK COPIED! ✓'));
  } else {
    showToast('Share: ' + url);
  }
}

function restart() {
  // Stop existing camera + mediapipe
  frameLoopActive = false;
  if (webcamEl.srcObject) {
    webcamEl.srcObject.getTracks().forEach(t => t.stop());
    webcamEl.srcObject = null;
  }
  if (mpHands) {
    try { mpHands.close(); } catch (e) {}
    mpHands = null;
  }

  // Reset state
  state = {
    currentIdx:    -1,
    objectVisible: false,
    isTransition:  false,
    needsReopen:   false,
    fistStartMs:   null,
    smoothX:       -1,
    smoothY:       -1,
  };

  // Reset UI
  palmObjectEl.classList.add('hidden');
  palmObjectEl.classList.remove('dropping');
  factCardEl.classList.add('hidden');
  topBarEl.classList.add('hidden');
  fistIndicator.classList.add('hidden');
  bgTint.style.backgroundColor = 'transparent';
  statusTextEl.innerHTML = 'SHOW YOUR OPEN<br>PALM TO BEGIN';
  handStatusEl.classList.remove('hidden');

  // Re-init camera
  showScreen('loading');
  startCamera();
}

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2200);
}

// ─────────────────────────────────────────────
// MEDIAPIPE — HAND DETECTION LOGIC
// ─────────────────────────────────────────────

// Is finger[i] extended?
// Tip idx, PIP idx, MCP idx — if tip.y < mcp.y the finger points up (extended)
function isExtended(lm, tipIdx, mcpIdx) {
  return lm[tipIdx].y < lm[mcpIdx].y;
}

function isPalmOpen(lm) {
  // Need ≥ 3 of 4 fingers extended (index/middle/ring/pinky)
  const ext = [
    isExtended(lm, 8,  5),   // index
    isExtended(lm, 12, 9),   // middle
    isExtended(lm, 16, 13),  // ring
    isExtended(lm, 20, 17),  // pinky
  ];
  return ext.filter(Boolean).length >= 3;
}

function isFistClosed(lm) {
  // ≥ 3 of 4 fingers curled (tip y > pip y)
  const curled = [
    lm[8].y  > lm[6].y,
    lm[12].y > lm[10].y,
    lm[16].y > lm[14].y,
    lm[20].y > lm[18].y,
  ];
  return curled.filter(Boolean).length >= 3;
}

// ─────────────────────────────────────────────
// MEDIAPIPE RESULTS CALLBACK
// ─────────────────────────────────────────────
function onResults(results) {
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    // No hand
    state.fistStartMs = null;
    fistIndicator.classList.add('hidden');
    fistRingPath.style.strokeDashoffset = FIST_RING_CIRC;

    if (!state.objectVisible && !state.isTransition) {
      handStatusEl.classList.remove('hidden');
      if (state.currentIdx === -1) {
        statusTextEl.innerHTML = 'SHOW YOUR OPEN<br>PALM TO BEGIN';
      }
    }
    return;
  }

  const lm = results.multiHandLandmarks[0];
  const palm = lm[9]; // middle finger MCP = palm center

  const W = window.innerWidth;
  const H = window.innerHeight;

  // Flip x (mirror), smooth position
  const rawX = (1 - palm.x) * W;
  const rawY = palm.y * H;

  if (state.smoothX < 0) { state.smoothX = rawX; state.smoothY = rawY; }
  state.smoothX += (rawX - state.smoothX) * SMOOTH_FACTOR;
  state.smoothY += (rawY - state.smoothY) * SMOOTH_FACTOR;

  // Move palm object
  if (!palmObjectEl.classList.contains('hidden')) {
    palmObjectEl.style.left = state.smoothX + 'px';
    palmObjectEl.style.top  = state.smoothY + 'px';
  }

  const open  = isPalmOpen(lm);
  const fist  = isFistClosed(lm);

  // ── OPEN PALM → show next object ──────────────
  if (open && !state.objectVisible && !state.isTransition) {
    if (!state.needsReopen) {
      // First time or coming from: no previous object
      handStatusEl.classList.add('hidden');
      // Move palm object to current position before showing
      palmObjectEl.style.left = state.smoothX + 'px';
      palmObjectEl.style.top  = state.smoothY + 'px';
      showObject(state.currentIdx + 1);
    }
    // else: needsReopen = true, waiting for hand to close first
  }

  // When hand is not fully open, clear the needsReopen flag
  // so the next full open will trigger the next object
  if (!open && state.needsReopen) {
    state.needsReopen = false;
  }

  // ── FIST → hold to advance ────────────────────
  if (fist && state.objectVisible && !state.isTransition) {
    if (!state.fistStartMs) state.fistStartMs = Date.now();
    const held     = Date.now() - state.fistStartMs;
    const progress = Math.min(held / FIST_HOLD_MS, 1);

    // Show ring indicator
    fistIndicator.classList.remove('hidden');
    fistRingPath.style.strokeDashoffset = FIST_RING_CIRC * (1 - progress);

    if (progress >= 1) {
      state.fistStartMs = null;
      advanceObject();
    }
  } else if (!fist) {
    // Released fist before completing — reset
    if (state.fistStartMs && state.objectVisible) {
      state.fistStartMs = null;
      fistIndicator.classList.add('hidden');
      fistRingPath.style.strokeDashoffset = FIST_RING_CIRC;
    }
  }

  // Hide/show status
  if (state.objectVisible) {
    handStatusEl.classList.add('hidden');
  } else if (!state.isTransition) {
    if (state.currentIdx === -1 || state.needsReopen) {
      handStatusEl.classList.remove('hidden');
    }
  }
}

// ─────────────────────────────────────────────
// CAMERA + MEDIAPIPE INIT
// ─────────────────────────────────────────────
let mpHands = null;
let frameLoopActive = false;

function startCamera() {
  navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  })
  .then(stream => {
    webcamEl.srcObject = stream;
    // Wait for actual video frames to be available
    return new Promise(resolve => {
      webcamEl.onloadeddata = resolve;
    });
  })
  .then(() => {
    return webcamEl.play();
  })
  .then(() => {
    initMediaPipe();
  })
  .catch(err => {
    console.error('Camera error:', err);
    alert('Camera access is required. Please allow camera and try again.');
    showScreen('landing');
  });
}

function initMediaPipe() {
  // Clean up previous instance
  if (mpHands) {
    try { mpHands.close(); } catch (e) {}
  }
  frameLoopActive = false;

  mpHands = new Hands({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  mpHands.setOptions({
    maxNumHands:            1,
    modelComplexity:        1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence:  0.5,
  });

  mpHands.onResults(onResults);

  // Show camera screen — webcam is already playing
  showScreen('camera');

  // Send frames to MediaPipe via requestAnimationFrame (no Camera utility)
  frameLoopActive = true;
  let sending = false;

  function processFrame() {
    if (!frameLoopActive || !mpHands) return;
    if (webcamEl.readyState >= 2 && !sending) {
      sending = true;
      mpHands.send({ image: webcamEl })
        .then(() => { sending = false; })
        .catch(() => { sending = false; });
    }
    requestAnimationFrame(processFrame);
  }
  requestAnimationFrame(processFrame);
}

// ─────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────
$('btn-start').addEventListener('click', () => {
  showScreen('loading');
  startCamera();
});

$('btn-drop').addEventListener('click', () => {
  advanceObject();
});

$('btn-restart').addEventListener('click', restart);
$('btn-share').addEventListener('click', shareExperience);
