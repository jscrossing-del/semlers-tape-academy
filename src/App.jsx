import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

// ─── Constants ───────────────────────────────────────────────────────────────
const STORAGE_KEY = "semlers_tma_v2";
const STUDENTS_COLLECTION = "students";
const TEACHER_PIN = "2468";

const firebaseConfig = {
  apiKey: "AIzaSyDqEde94XfunCtGHGwqDeLhJ7v5qeoV0go",
  authDomain: "semlers-tape-app.firebaseapp.com",
  projectId: "semlers-tape-app",
  storageBucket: "semlers-tape-app.firebasestorage.app",
  messagingSenderId: "1944725816",
  appId: "1:1944725816:web:758d61d9a7e2c98dd939cd",
  measurementId: "G-0VSPWVYE6Q",
};

const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);

const QUESTION_MIX = [
  "find", "find", "find", "story", "find",
  "type", "read", "find", "type", "read",
];

const LEVELS = [
  {
    id: "basics",
    name: "Tape Measure Basics",
    den: 0,
    goal: 80,
    requiredQ: 5,
    reviewDens: [],
    cert: false,
    intro: [
      { step: "The Hook", body: "The hook at the end should wiggle slightly — that's by design. It compensates for inside vs outside measurements so your readings stay accurate." },
      { step: "The Blade", body: "Never kink, bend, or twist the blade. A damaged blade won't lay flat and will give you bad measurements." },
      { step: "Extending", body: "Only pull out as much tape as you need. The lock button holds the blade open so you don't have to keep tension on it." },
      { step: "Retracting", body: "Control the blade as it goes back in. Never let it snap — the hook can break and the blade edge can cut." },
      { step: "Reading Position", body: "Hold the tape straight, flat, and flush against the work. A sagging or angled tape reads longer than the true distance." },
    ],
    questions: [
      { q: "Why does the hook wiggle?", a: "It compensates for inside vs outside measurements.", choices: ["It's broken", "It compensates for inside vs outside measurements.", "It makes it easier to hold", "It's decorative"] },
      { q: "What should you never do to the blade?", a: "Kink, bend, or twist it.", choices: ["Kink, bend, or twist it.", "Pull it out", "Lock it in place", "Read it carefully"] },
      { q: "What does the lock button do?", a: "Holds the blade extended so you don't need to hold tension.", choices: ["Retracts the blade", "Holds the blade extended so you don't need to hold tension.", "Measures inside dimensions", "Cleans the blade"] },
      { q: "How should you retract the tape?", a: "Control it slowly.", choices: ["Let it snap back fast", "Control it slowly.", "Pull it by hand all the way", "Leave it extended"] },
      { q: "What causes a false reading?", a: "A sagging or angled tape.", choices: ["Reading in bright light", "A sagging or angled tape.", "Using the lock button", "A slightly loose hook"] },
    ],
  },
  {
    id: "whole",
    name: "Whole Inches",
    den: 1,
    goal: 80,
    requiredQ: 8,
    reviewDens: [],
    cert: false,
    intro: [
      { step: "The Inch Mark", body: "The longest marks on the tape are whole-inch marks. They're also the only ones with numbers printed next to them." },
      { step: "Counting Up", body: "Start at zero (the hook end) and count the numbered marks. Each number is exactly that many inches from the hook." },
    ],
  },
  {
    id: "half",
    name: "Half Inches",
    den: 2,
    goal: 80,
    requiredQ: 10,
    reviewDens: [1],
    cert: false,
    intro: [
      { step: "The Half-Inch Mark", body: "The second-tallest mark sits exactly halfway between two inch marks. That mark is 1/2 inch." },
      { step: "Reading It", body: "Say the whole inch first, then add 1/2. Example: if the arrow is one mark past the 3, you read 3-1/2 inches." },
    ],
  },
  {
    id: "quarter",
    name: "Quarter Inches",
    den: 4,
    goal: 85,
    requiredQ: 12,
    reviewDens: [1, 2],
    cert: false,
    intro: [
      { step: "Four Parts", body: "Quarter-inch marks divide each inch into four equal parts: 1/4, 2/4 (= 1/2), 3/4, and 4/4 (= the next whole inch)." },
      { step: "Simplifying", body: "2/4 is the same as 1/2. You'll usually say it as 1/2, not 2/4. 4/4 just becomes the next whole inch." },
    ],
  },
  {
    id: "eighth",
    name: "Eighth Inches",
    den: 8,
    goal: 85,
    requiredQ: 15,
    reviewDens: [1, 2, 4],
    cert: false,
    intro: [
      { step: "Eight Parts", body: "Eighth-inch marks are shorter than quarter marks. They divide each inch into 8 parts: 1/8, 2/8, 3/8, 4/8, 5/8, 6/8, 7/8." },
      { step: "Simplify As You Go", body: "2/8 = 1/4, 4/8 = 1/2, 6/8 = 3/4. Always simplify. Count from the nearest whole inch and reduce the fraction." },
    ],
  },
  {
    id: "sixteenth",
    name: "Sixteenth Inches",
    den: 16,
    goal: 90,
    requiredQ: 18,
    reviewDens: [1, 2, 4, 8],
    cert: true,
    intro: [
      { step: "The Smallest Common Mark", body: "Sixteenth-inch marks are the shortest marks on a standard tape. There are 16 of them per inch." },
      { step: "Counting Strategy", body: "Find the nearest whole inch. Count the tiny marks forward. Every other tiny mark is a 1/8, every fourth is a 1/4, every eighth is a 1/2." },
      { step: "Feet + Inches", body: "At 12 inches you'll see a foot mark. Beyond that, read as feet and inches: 1'-3-5/16\" means 1 foot, 3 and 5/16 inches." },
    ],
  },
  {
    id: "mixed",
    name: "Mixed Mastery Review",
    den: 16,
    mixed: true,
    goal: 90,
    requiredQ: 20,
    reviewDens: [1, 2, 4, 8, 16],
    cert: false,
    intro: [
      { step: "Real-World Reading", body: "On a real job, measurements aren't labeled by difficulty. You need to read whatever the tape shows — whole inches, halves, quarters, eighths, sixteenths — all mixed together." },
      { step: "Strategy", body: "Always start at the nearest whole inch. Then count marks toward the arrow. Identify the mark size by its height, then name the fraction." },
    ],
  },
  {
    id: "advanced32",
    name: "Advanced: 32nds",
    den: 32,
    goal: 90,
    requiredQ: 22,
    reviewDens: [1, 2, 4, 8, 16],
    cert: true,
    advanced: true,
    intro: [
      { step: "Precision Work", body: "32nd-inch marks appear on precision tapes used in woodworking, metalworking, and engineering. There are 32 marks per inch." },
      { step: "Counting", body: "Count from the nearest 1/16 mark, then add one more half-step. It's easy to be off by one — count slowly and double-check." },
      { step: "Where You'll See This", body: "Cabinet makers, machinists, finish carpenters, and engineers use 32nds. If you're doing precision joinery or fitting metal parts, you need this." },
    ],
  },
];

// ─── Math helpers ─────────────────────────────────────────────────────────────
function gcd(a, b) { while (b) { [a, b] = [b, a % b]; } return Math.abs(a); }
function reduce(n, d) { const g = gcd(n, d); return [n / g, d / g]; }
function fmtMeasure(w, n, d) {
  if (n === 0 || d <= 1) return `${w}"`;
  const [rn, rd] = reduce(n, d);
  return w > 0 ? `${w}-${rn}/${rd}"` : `${rn}/${rd}"`;
}
function decimalToFraction(value, maxDen = 32) {
  const whole = Math.trunc(value);
  const frac = Math.abs(value - whole);
  const n = Math.round(frac * maxDen);
  return { w: whole, n, d: maxDen };
}
function parseMeasureText(value) {
  const cleaned = String(value || "")
    .toLowerCase()
    .replace(/inches|inch|in\.|"/g, "")
    .replace(/\s+/g, "")
    .trim();
  if (!cleaned) return null;

  if (cleaned.includes(".")) {
    const decimal = Number(cleaned);
    if (Number.isFinite(decimal)) return decimalToFraction(decimal);
  }

  const mixed = cleaned.match(/^(\d+)-(\d+)\/(\d+)$/) || cleaned.match(/^(\d+)(\d+)\/(\d+)$/);
  if (mixed) return { w: Number(mixed[1]), n: Number(mixed[2]), d: Number(mixed[3]) };
  const fraction = cleaned.match(/^(\d+)\/(\d+)$/);
  if (fraction) return { w: 0, n: Number(fraction[1]), d: Number(fraction[2]) };
  const whole = cleaned.match(/^\d+$/);
  if (whole) return { w: Number(cleaned), n: 0, d: 1 };
  return null;
}
function normalizeMeasureText(value) {
  const parsed = parseMeasureText(value);
  if (!parsed || !Number.isFinite(parsed.w) || !Number.isFinite(parsed.n) || !Number.isFinite(parsed.d) || parsed.d <= 0) return "";
  const carry = Math.floor(parsed.n / parsed.d);
  const n = parsed.n % parsed.d;
  return fmtMeasure(parsed.w + carry, n, parsed.d);
}
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function currentMarkNumerator(d) {
  const marks = [];
  for (let n = 1; n < d; n++) {
    if (gcd(n, d) === 1) marks.push(n);
  }
  return marks[randInt(0, marks.length - 1)] ?? 0;
}
function lessonExampleNumerator(d) {
  if (d <= 1) return 0;
  for (let n = d - 1; n > 0; n--) {
    if (gcd(n, d) === 1) return n;
  }
  return 0;
}
function shuffled(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function measurementKey(q) { return q ? `${q.w}:${q.n}:${q.d}` : ""; }
function questionKey(q) { return measurementKey(q); }

// ─── Storage ──────────────────────────────────────────────────────────────────
function loadDB() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { students: {} }; }
  catch { return { students: {} }; }
}
function saveDB(db) { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
function makeKey(first, last, pin) {
  return `${(first || "").toLowerCase()}_${(last || "").toLowerCase().slice(0, 1)}_${pin || "0000"}`;
}
function displayName(first, last) {
  return `${first || "Student"}${last ? " " + last.slice(0, 1).toUpperCase() + "." : ""}`;
}
function newStudent(name) {
  const stats = {};
  LEVELS.forEach((lv, i) => {
    stats[lv.id] = { unlocked: i === 0, done: false, attempts: 0, correct: 0, recent: [], misses: {}, guided: false };
  });
  return { name, active: "basics", certified: false, advCertified: false, certDate: "", advCertDate: "", stats };
}

function normalizeStudent(student) {
  const base = newStudent(student?.name || "Student");
  const stats = { ...base.stats };
  LEVELS.forEach(lv => {
    stats[lv.id] = { ...base.stats[lv.id], ...(student?.stats?.[lv.id] || {}) };
  });
  return {
    ...base,
    ...student,
    stats,
  };
}

async function saveStudentRecord(key, student) {
  await setDoc(doc(firestore, STUDENTS_COLLECTION, key), {
    ...student,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

async function deleteStudentRecord(key) {
  await deleteDoc(doc(firestore, STUDENTS_COLLECTION, key));
}

// ─── Question generator ───────────────────────────────────────────────────────
// qNum: which question number within session (0-indexed), used to decide review vs new
function makeQuestion(level, qNum, recentQuestionKeys = [], repeatCandidate = null) {
  if (level.id === "basics") return null; // handled separately

  const focusCurrentLevel = [4, 8, 16].includes(level.den) && !level.mixed;
  const reviewOptions = level.reviewDens.length ? level.reviewDens : [1];
  const useCurrentLevel = focusCurrentLevel ? qNum % 5 !== 4 : true;
  const isReview = !repeatCandidate && (focusCurrentLevel
    ? !useCurrentLevel
    : level.reviewDens.length > 0 && qNum >= 3 && Math.random() < 0.30);
  const reviewDen = isReview
    ? reviewOptions[randInt(0, reviewOptions.length - 1)]
    : null;

  const d = repeatCandidate?.d || (level.mixed
    ? [1, 2, 4, 8, 16][randInt(0, 4)]
    : isReview ? reviewDen : level.den);

  const maxW = d === 32 ? 5 : 7;
  let w = repeatCandidate?.w ?? randInt(1, maxW);
  const chooseN = () => {
    if (d <= 1) return 0;
    if (focusCurrentLevel && !isReview && d === level.den) return currentMarkNumerator(d);
    return randInt(0, d - 1);
  };
  let n = repeatCandidate?.n ?? chooseN();
  while (w === 0 && n === 0) {
    w = randInt(1, maxW);
    n = chooseN();
  }
  const mode = d <= 1 ? "read" : QUESTION_MIX[qNum % QUESTION_MIX.length];
  const findMode = mode === "find" || mode === "story";
  const typeMode = mode === "type";
  const storyMode = mode === "story";

  const questionDen = d;
  const showDen = level.mixed ? 16 : Math.max(1, level.den || d);

  function buildQuestion(ww, nn) {
    const answer = fmtMeasure(ww, nn, d);
    const distractors = new Set([answer]);
    let tries = 0;
    while (distractors.size < 4 && tries < 40) {
      tries++;
      const dw = Math.max(1, Math.min(maxW, ww + randInt(-1, 1)));
      const dn = Math.max(0, Math.min(d - 1, nn + randInt(-Math.max(1, d / 8), Math.max(1, d / 8))));
      distractors.add(fmtMeasure(dw, dn, d));
    }
    const fillers = [`${Math.min(maxW, ww + 1)}"`, `${Math.max(1, ww - 1)}-1/2"`, `${ww}-1/4"`, `${ww}-3/4"`];
    fillers.forEach(f => { if (distractors.size < 4) distractors.add(f); });
    return {
      w: ww,
      n: nn,
      d: questionDen,
      answer,
      findMode,
      typeMode,
      storyMode,
      story: storyMode ? `A board needs to be cut to ${answer}. Mark that length on the tape.` : "",
      showDen,
      isReview,
      choices: shuffled([...distractors].slice(0, 4))
    };
  }

  let q = buildQuestion(w, n);
  let repeatTries = 0;
  while (!repeatCandidate && recentQuestionKeys.includes(questionKey(q)) && repeatTries < 20) {
    repeatTries++;
    w = randInt(1, maxW);
    n = chooseN();
    q = buildQuestion(w, n);
  }
  return q;
}

function hintFor(lv, q) {
  if (!q) return "";
  if (q.d === 1) return `Look for the large number ${q.w} on the tape.`;
  return `Start at the ${q.w}" mark. Count ${q.n} of the ${q.d}-per-inch marks forward.`;
}

function explainMiss(q, choice) {
  if (!q) return "";
  const picked = parseMeasureText(choice);
  const answer = parseMeasureText(q.answer);
  if (!picked || !answer) return hintFor(null, q);
  if (picked.w !== answer.w) return `Check the whole inch first. This answer starts at ${answer.w}", not ${picked.w}".`;
  const pickedTicks = Math.round((picked.n / picked.d) * q.d);
  const answerTicks = Math.round((answer.n / answer.d) * q.d);
  const diff = pickedTicks - answerTicks;
  if (diff === 1) return "You counted one mark too far.";
  if (diff === -1) return "You stopped one mark too soon.";
  if (Math.abs(diff) > 1) return `Count the small marks again from ${answer.w}".`;
  return "The fraction may need to be simplified before answering.";
}

function topMisses(stats, limit = 3) {
  return Object.entries(stats?.misses || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([measure, count]) => `${measure} (${count})`)
    .join(", ");
}

function levelAccuracyValue(student, levelId) {
  const s = student.stats[levelId];
  return s?.attempts ? `${Math.round(s.correct / s.attempts * 100)}%` : "";
}

function reportAccuracyLevels() {
  return LEVELS.slice(1);
}

function reportAccuracyLabel(level) {
  const labels = {
    whole: "Whole",
    half: "1/2",
    quarter: "1/4",
    eighth: "1/8",
    sixteenth: "1/16",
    mixed: "Mixed",
    advanced32: "1/32",
  };
  return labels[level.id] || level.name;
}

function typedAnswerExample(q) {
  return "Enter a fraction or decimal";
}

function practicePrepFor(level) {
  if (level.id === "basics") return level.intro;
  const sampleDen = Math.max(1, level.den || 16);
  const sampleN = lessonExampleNumerator(sampleDen);
  const sample = fmtMeasure(2, sampleN, sampleDen);
  return [
    { step: "Find the whole inch", body: `Start at the big 2" mark. Whole-inch marks are the longest marks and have printed numbers.` },
    { step: "Use mark height", body: `For this level, focus on ${sampleDen === 1 ? "the numbered inch marks" : `${sampleDen} equal parts inside each inch`}. Smaller levels show fewer marks first so students can see the pattern.` },
    { step: "Count forward", body: `Count from 2" to the highlighted mark. This example reads ${sample}.` },
    { step: "Simplify", body: "If the fraction can reduce, say the reduced version. For example, 8/16 is 1/2 and 12/16 is 3/4." },
  ];
}

function lessonPreviewQuestion(level) {
  const d = Math.max(level.den, 1);
  const n = lessonExampleNumerator(d);
  return {
    w: 2,
    n,
    d,
    showDen: d,
    answer: fmtMeasure(2, n, d),
    findMode: false,
  };
}

function HookLessonVisual() {
  return (
    <div className="lesson-visual">
      <div className="visual-panel">
        <div className="visual-title">Outside measurement</div>
        <svg viewBox="0 0 320 120" className="visual-svg">
          <rect x="38" y="70" width="230" height="20" fill="#8B5E34" />
          <rect x="48" y="26" width="220" height="34" rx="4" fill="#F5C518" stroke="#1a1a1a" strokeWidth="3" />
          <rect x="24" y="24" width="22" height="38" rx="3" fill="#C0392B" stroke="#1a1a1a" strokeWidth="3" />
          <path d="M48 78 L24 78" stroke="#C0392B" strokeWidth="4" markerEnd="url(#hookArrow)" />
          <text x="58" y="49" fontFamily="DM Mono, monospace" fontSize="16" fontWeight="700">0</text>
          <text x="92" y="49" fontFamily="DM Mono, monospace" fontSize="16" fontWeight="700">1</text>
          <text x="42" y="104" fontFamily="DM Sans, sans-serif" fontSize="13">Hook pulls out to include its own thickness.</text>
          <defs>
            <marker id="hookArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#C0392B" />
            </marker>
          </defs>
        </svg>
      </div>
      <div className="visual-panel">
        <div className="visual-title">Inside measurement</div>
        <svg viewBox="0 0 320 120" className="visual-svg">
          <rect x="28" y="22" width="18" height="72" fill="#8B5E34" />
          <rect x="274" y="22" width="18" height="72" fill="#8B5E34" />
          <rect x="48" y="44" width="220" height="34" rx="4" fill="#F5C518" stroke="#1a1a1a" strokeWidth="3" />
          <rect x="44" y="42" width="22" height="38" rx="3" fill="#C0392B" stroke="#1a1a1a" strokeWidth="3" />
          <path d="M66 96 L46 96" stroke="#16a34a" strokeWidth="4" markerEnd="url(#insideArrow)" />
          <text x="76" y="67" fontFamily="DM Mono, monospace" fontSize="16" fontWeight="700">0</text>
          <text x="110" y="67" fontFamily="DM Mono, monospace" fontSize="16" fontWeight="700">1</text>
          <text x="42" y="112" fontFamily="DM Sans, sans-serif" fontSize="13">Hook slides in so inside readings stay accurate.</text>
          <defs>
            <marker id="insideArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#16a34a" />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function TapePositionVisual() {
  return (
    <div className="lesson-visual">
      <div className="visual-panel good">
        <div className="visual-title">Correct: straight and flat</div>
        <svg viewBox="0 0 320 120" className="visual-svg">
          <rect x="34" y="82" width="250" height="16" fill="#8B5E34" />
          <rect x="48" y="48" width="220" height="28" rx="4" fill="#F5C518" stroke="#1a1a1a" strokeWidth="3" />
          <line x1="58" y1="48" x2="58" y2="76" stroke="#1a1a1a" strokeWidth="3" />
          <line x1="128" y1="48" x2="128" y2="76" stroke="#1a1a1a" strokeWidth="3" />
          <line x1="198" y1="48" x2="198" y2="76" stroke="#1a1a1a" strokeWidth="3" />
          <text x="50" y="112" fontFamily="DM Sans, sans-serif" fontSize="13">The tape touches the work and reads true.</text>
        </svg>
      </div>
      <div className="visual-panel bad">
        <div className="visual-title">Incorrect: sagged or angled</div>
        <svg viewBox="0 0 320 120" className="visual-svg">
          <rect x="34" y="82" width="250" height="16" fill="#8B5E34" />
          <path d="M48 42 C105 82, 185 82, 268 42" fill="none" stroke="#F5C518" strokeWidth="28" strokeLinecap="round" />
          <path d="M48 42 C105 82, 185 82, 268 42" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
          <line x1="52" y1="31" x2="270" y2="71" stroke="#C0392B" strokeWidth="5" strokeLinecap="round" />
          <text x="42" y="112" fontFamily="DM Sans, sans-serif" fontSize="13">A sag or angle makes the reading too long.</text>
        </svg>
      </div>
    </div>
  );
}

// ─── Tape SVG ─────────────────────────────────────────────────────────────────
function TapeSVG({ q, onPick, picked, showArrow, guide = false }) {
  const W = 720, H = 130;
  const L = 40, R = W - 40;
  const tapeW = R - L;
  const tapeTop = 30, tapeH = 60;
  const totalInches = 8;
  const pxPerInch = tapeW / totalInches;

  const den = q?.showDen || 16;
  const arrowX = q ? L + (q.w + q.n / q.d) * pxPerInch : null;

  function handleClick(e) {
    if (!q || !q.findMode || !onPick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = W / rect.width;
    const rawX = (e.clientX - rect.left) * scaleX;
    const inches = (rawX - L) / pxPerInch;
    const w = Math.max(0, Math.min(totalInches - 1, Math.floor(inches)));
    const n = Math.max(0, Math.min(q.d - 1, Math.round((inches - w) * q.d)));
    onPick(fmtMeasure(w, n, q.d));
  }

  const marks = [];
  for (let i = 0; i <= totalInches; i++) {
    for (let s = 0; s < den; s++) {
      if (i === totalInches && s > 0) continue;
      const x = L + (i + s / den) * pxPerInch;
      const isInch = s === 0;
      const isHalf = den >= 2 && s % (den / 2) === 0 && !isInch;
      const isQtr = den >= 4 && s % (den / 4) === 0 && !isInch && !isHalf;
      const isEighth = den >= 8 && s % (den / 8) === 0 && !isInch && !isHalf && !isQtr;
      const isSixteenth = den >= 16 && s % (den / 16) === 0 && !isInch && !isHalf && !isQtr && !isEighth;
      const h = isInch ? tapeH : isHalf ? tapeH * 0.70 : isQtr ? tapeH * 0.55 : isEighth ? tapeH * 0.42 : isSixteenth ? tapeH * 0.30 : tapeH * 0.22;
      const sw = isInch ? 2 : isHalf ? 1.5 : isQtr ? 1.2 : 1;
      marks.push({ x, h, isInch, i, sw });
    }
  }

  return (
    <div className="tape-container">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", minWidth: 520, cursor: q?.findMode ? "crosshair" : "default" }}
        onClick={handleClick}
      >
        {/* Tape body */}
        <rect x={L - 10} y={tapeTop} width={tapeW + 20} height={tapeH} rx={6} fill="#F5C518" />
        {/* Metal sheen */}
        <rect x={L - 10} y={tapeTop} width={tapeW + 20} height={tapeH * 0.25} rx={6} fill="rgba(255,255,255,0.18)" />
        {/* Hook */}
        <rect x={L - 22} y={tapeTop} width={16} height={tapeH} rx={3} fill="#C0392B" />
        <rect x={L - 16} y={tapeTop + 4} width={6} height={tapeH - 8} rx={2} fill="#962D22" />

        {/* Marks */}
        {marks.map((m, idx) => (
          <g key={idx}>
            <line x1={m.x} y1={tapeTop} x2={m.x} y2={tapeTop + m.h} stroke="#1a1a1a" strokeWidth={m.sw} />
            {m.isInch && m.i <= totalInches && (
              <text
                x={m.x + 3} y={tapeTop + tapeH - 8}
                fontSize={13} fontFamily="'DM Mono', monospace" fontWeight="700" fill="#1a1a1a"
              >{m.i}</text>
            )}
          </g>
        ))}

        {/* Guided highlight */}
        {guide && arrowX !== null && (
          <g>
            <rect x={L + q.w * pxPerInch - 3} y={tapeTop - 6} width={6} height={tapeH + 12} fill="#16a34a" fillOpacity="0.18" />
            <circle cx={arrowX} cy={tapeTop + tapeH + 13} r={7} fill="#16a34a" />
            <text x={arrowX + 10} y={tapeTop + tapeH + 18} fontSize={12} fontFamily="'DM Mono', monospace" fill="#14532d">
              {q.answer}
            </text>
          </g>
        )}

        {/* Arrow (read mode) */}
        {!q?.findMode && arrowX !== null && (
          <g>
            <polygon
              points={`${arrowX},${tapeTop - 4} ${arrowX - 9},${tapeTop - 20} ${arrowX + 9},${tapeTop - 20}`}
              fill="#C0392B"
            />
            <line x1={arrowX} y1={tapeTop + tapeH} x2={arrowX} y2={tapeTop + tapeH + 10} stroke="#C0392B" strokeWidth={2} strokeDasharray="4 3" />
          </g>
        )}

        {/* Find mode: show where user clicked */}
        {q?.findMode && picked && (() => {
          const parts = picked.replace('"','').split('-');
          let pw = 0, pn = 0, pd = 1;
          if (parts.length === 2) {
            pw = parseInt(parts[0]);
            const fr = parts[1].split('/');
            pn = parseInt(fr[0]); pd = parseInt(fr[1]);
          } else if (picked.includes('/')) {
            const fr = picked.replace('"','').split('/');
            pn = parseInt(fr[0]); pd = parseInt(fr[1]);
          } else {
            pw = parseInt(picked);
          }
          const px = L + (pw + pn / pd) * pxPerInch;
          return (
            <circle cx={px} cy={tapeTop + tapeH / 2} r={10}
              fill={picked === q.answer ? "#27ae60" : "#e74c3c"}
              fillOpacity={0.85}
            />
          );
        })()}
      </svg>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: #F7F4EE;
    color: #1a1a1a;
    min-height: 100vh;
  }

  /* Grid texture */
  body::before {
    content: '';
    position: fixed; inset: 0;
    background-image:
      linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
    z-index: 0;
  }

  .app { position: relative; z-index: 1; }

  /* ── Layout ── */
  .page { min-height: 100vh; padding: 24px 20px 60px; }
  .page-inner { max-width: 860px; margin: 0 auto; }
  .page-inner.reports { max-width: 1160px; }
  .page-inner.narrow { max-width: 480px; }

  /* ── Logo bar ── */
  .topbar {
    display: flex; align-items: center; gap: 14px;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 18px; margin-bottom: 28px;
  }
  .logo-tape {
    width: 52px; height: 52px;
    background: #F5C518;
    border: 2px solid #1a1a1a;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 26px;
    box-shadow: 3px 3px 0 #1a1a1a;
    flex-shrink: 0;
  }
  .logo-text h1 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(22px, 4vw, 34px);
    letter-spacing: 2px;
    line-height: 1;
    color: #1a1a1a;
  }
  .logo-text p { font-size: 12px; color: #666; margin-top: 3px; letter-spacing: 0.05em; }
  .topbar-right { margin-left: auto; display: flex; gap: 8px; align-items: center; }

  /* ── Cards ── */
  .card {
    background: #fff;
    border: 2px solid #1a1a1a;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 4px 4px 0 #1a1a1a;
    margin-bottom: 16px;
  }
  .card.yellow { background: #FFF9DB; }
  .card.green { background: #F0FDF4; border-color: #16a34a; box-shadow: 4px 4px 0 #16a34a; }
  .card.red { background: #FEF2F2; border-color: #dc2626; box-shadow: 4px 4px 0 #dc2626; }
  .card.dark { background: #1a1a1a; color: #fff; box-shadow: 4px 4px 0 #F5C518; border-color: #F5C518; }

  /* ── Tags ── */
  .tag {
    display: inline-block;
    font-family: 'DM Mono', monospace;
    font-size: 10px; font-weight: 500;
    letter-spacing: 0.12em; text-transform: uppercase;
    padding: 3px 10px; border-radius: 4px;
    background: #1a1a1a; color: #fff;
    margin-bottom: 10px;
  }
  .tag.yellow { background: #F5C518; color: #1a1a1a; }
  .tag.red { background: #C0392B; color: #fff; }
  .tag.green { background: #16a34a; color: #fff; }
  .tag.gray { background: #e5e5e5; color: #555; }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
    padding: 11px 20px; border-radius: 9px;
    border: 2px solid #1a1a1a;
    cursor: pointer; transition: all 0.12s;
    background: #1a1a1a; color: #fff;
    box-shadow: 3px 3px 0 rgba(0,0,0,0.15);
    white-space: nowrap;
  }
  .btn:hover:not(:disabled) { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 rgba(0,0,0,0.2); }
  .btn:active:not(:disabled) { transform: translate(1px,1px); box-shadow: 1px 1px 0 rgba(0,0,0,0.1); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn.yellow { background: #F5C518; color: #1a1a1a; border-color: #1a1a1a; box-shadow: 3px 3px 0 #1a1a1a; }
  .btn.ghost { background: #fff; color: #1a1a1a; }
  .btn.red { background: #C0392B; color: #fff; border-color: #7f1d1d; }
  .btn.green { background: #16a34a; color: #fff; border-color: #14532d; }
  .btn.sm { font-size: 13px; padding: 8px 14px; border-radius: 7px; }
  .btn-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }

  /* ── Inputs ── */
  .input {
    width: 100%;
    background: #fff;
    border: 2px solid #1a1a1a;
    border-radius: 9px;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    padding: 12px 14px;
    outline: none;
    transition: box-shadow 0.15s;
    margin-bottom: 12px;
    box-shadow: 2px 2px 0 #1a1a1a;
  }
  .input:focus { box-shadow: 4px 4px 0 #F5C518; border-color: #F5C518; }

  /* ── Progress bar ── */
  .progress-wrap { margin-bottom: 20px; }
  .progress-label { display: flex; justify-content: space-between; font-size: 12px; font-family: 'DM Mono', monospace; color: #666; margin-bottom: 6px; }
  .progress-track { height: 8px; background: #e5e5e5; border-radius: 4px; border: 1.5px solid #1a1a1a; overflow: hidden; }
  .progress-fill { height: 100%; background: #F5C518; border-radius: 4px; transition: width 0.5s cubic-bezier(.34,1.56,.64,1); }

  /* ── Tape ── */
  .tape-container {
    background: #fff;
    border: 2px solid #1a1a1a;
    border-radius: 12px;
    padding: 16px 12px 8px;
    margin-bottom: 18px;
    overflow-x: auto;
    box-shadow: 3px 3px 0 #1a1a1a;
  }

  /* ── Answer choices ── */
  .choices { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
  .choice-btn {
    padding: 14px; border-radius: 10px;
    border: 2px solid #1a1a1a;
    background: #fff; color: #1a1a1a;
    font-family: 'DM Mono', monospace; font-size: 16px; font-weight: 500;
    cursor: pointer; transition: all 0.12s;
    box-shadow: 3px 3px 0 #1a1a1a;
    text-align: center;
  }
  .choice-btn:hover:not(:disabled) { background: #F7F4EE; transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #1a1a1a; }
  .choice-btn:disabled { cursor: not-allowed; }
  .choice-btn.correct { background: #F0FDF4; border-color: #16a34a; box-shadow: 3px 3px 0 #16a34a; color: #14532d; }
  .choice-btn.wrong { background: #FEF2F2; border-color: #dc2626; box-shadow: 3px 3px 0 #dc2626; color: #7f1d1d; }
  .choice-btn.reveal { background: #FFF9DB; border-color: #ca8a04; box-shadow: 3px 3px 0 #ca8a04; }

  .teacher-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .sync-note { font-family: 'DM Mono', monospace; font-size: 11px; color: #666; margin-top: 8px; }

  /* ── Level list ── */
  .level-row {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 18px;
    border: 2px solid #1a1a1a;
    border-radius: 12px;
    background: #fff;
    box-shadow: 3px 3px 0 #1a1a1a;
    margin-bottom: 10px;
    transition: all 0.12s;
  }
  .level-row.done { background: #F0FDF4; border-color: #16a34a; box-shadow: 3px 3px 0 #16a34a; }
  .level-row.locked { background: #f5f5f5; color: #999; box-shadow: none; border-color: #ddd; }
  .level-num {
    width: 36px; height: 36px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Bebas Neue', sans-serif; font-size: 20px;
    background: #1a1a1a; color: #F5C518;
    flex-shrink: 0;
  }
  .level-num.done { background: #16a34a; color: #fff; }
  .level-num.locked { background: #ddd; color: #999; }
  .level-info { flex: 1; min-width: 0; }
  .level-info h3 { font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .level-info p { font-size: 11px; font-family: 'DM Mono', monospace; color: #888; margin-top: 2px; }

  /* ── Stat chips ── */
  .stat-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
  .stat-chip {
    background: #f5f5f5; border: 1.5px solid #ddd;
    border-radius: 8px; padding: 8px 14px;
    font-family: 'DM Mono', monospace; font-size: 12px;
  }
  .stat-chip b { display: block; font-size: 18px; color: #1a1a1a; }

  /* ── Intro steps ── */
  .intro-step {
    border-left: 4px solid #F5C518;
    background: #FFFBEB;
    border-radius: 0 10px 10px 0;
    padding: 14px 16px;
    margin-bottom: 12px;
  }
  .intro-step .step-label { font-family: 'DM Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 4px; }
  .intro-step p { font-size: 15px; line-height: 1.6; color: #1a1a1a; }

  .lesson-visual {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 14px 0;
  }
  .visual-panel {
    border: 2px solid #1a1a1a;
    border-radius: 10px;
    background: #fff;
    padding: 12px;
    box-shadow: 2px 2px 0 #1a1a1a;
  }
  .visual-panel.good { border-color: #16a34a; box-shadow: 2px 2px 0 #16a34a; }
  .visual-panel.bad { border-color: #C0392B; box-shadow: 2px 2px 0 #C0392B; }
  .visual-title {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
  }
  .visual-svg { width: 100%; height: auto; display: block; }

  /* ── Feedback ── */
  .feedback { border-radius: 10px; padding: 14px 16px; margin-top: 14px; font-size: 14px; line-height: 1.6; border: 2px solid; }
  .feedback.correct { background: #F0FDF4; border-color: #16a34a; color: #14532d; }
  .feedback.wrong { background: #FEF2F2; border-color: #dc2626; color: #7f1d1d; }

  /* ── Cert ── */
  .cert-box {
    border: 3px solid #F5C518;
    border-radius: 16px;
    padding: 40px 32px;
    text-align: center;
    background: #fff;
    position: relative;
    overflow: hidden;
    box-shadow: 6px 6px 0 #1a1a1a;
    margin: 0 auto;
    max-width: 520px;
  }
  .cert-box::before {
    content: '';
    position: absolute; inset: 10px;
    border: 1.5px solid rgba(245,197,24,0.3);
    border-radius: 10px;
    pointer-events: none;
  }
  .cert-box .cert-icon { font-size: 52px; margin-bottom: 12px; }
  .cert-box h2 { font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: 3px; margin-bottom: 6px; }
  .cert-box .cert-name { font-family: 'Bebas Neue', sans-serif; font-size: 26px; letter-spacing: 2px; color: #C0392B; margin: 16px 0 8px; }
  .cert-box p { font-size: 14px; color: #555; line-height: 1.7; }
  .cert-box .cert-date { font-family: 'DM Mono', monospace; font-size: 11px; color: #999; margin-top: 20px; }

  /* ── Reports table ── */
  .report-scroll {
    width: 100%;
    overflow-x: auto;
    border: 2px solid #1a1a1a;
    border-radius: 8px;
  }
  .report-table { width: 100%; min-width: 980px; border-collapse: collapse; font-size: 13px; }
  .report-table th { text-align: left; padding: 10px 9px; background: #1a1a1a; color: #F5C518; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.06em; white-space: nowrap; }
  .report-table td { padding: 10px 9px; border-bottom: 1px solid #eee; vertical-align: middle; }
  .report-table th.level-accuracy, .report-table td.level-accuracy { text-align: center; min-width: 58px; }
  .report-table tr:hover td { background: #FFFBEB; }

  /* ── Responsive ── */
  @media (max-width: 560px) {
    .choices { grid-template-columns: 1fr; }
    .lesson-visual { grid-template-columns: 1fr; }
    .topbar { flex-wrap: wrap; }
    .level-row { flex-wrap: wrap; }
  }
`;

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [db, setDb] = useState({ students: {} });
  const [studentKey, setStudentKey] = useState("");
  const [progress, setProgress] = useState(null);
  const [screen, setScreen] = useState("login"); // login | dash | lesson | cert | reports
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [pin, setPin] = useState("");
  const [teacherPin, setTeacherPin] = useState("");
  const [teacherError, setTeacherError] = useState("");
  const [teacherUnlocked, setTeacherUnlocked] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Connecting to class report...");

  // Lesson state
  const [phase, setPhase] = useState("intro"); // intro | guided | practice
  const [readyChecked, setReadyChecked] = useState(false);
  const [q, setQ] = useState(null);
  const [picked, setPicked] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [feedback, setFeedback] = useState(null); // null | { correct, msg }
  const [showHint, setShowHint] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [recentQuestionKeys, setRecentQuestionKeys] = useState([]);
  const [missedRepeatQueue, setMissedRepeatQueue] = useState([]);

  // Basics quiz state
  const [basicsIdx, setBasicsIdx] = useState(0);
  // session question counter (for review mix)
  const [sessionQ, setSessionQ] = useState(0);
  // show level-complete modal
  const [showLevelDoneModal, setShowLevelDoneModal] = useState(false);

  useEffect(() => {
    setDb(loadDB());
    const connectionTimer = setTimeout(() => {
      setSyncStatus(current => current === "Connecting to class report..."
        ? "Turn on Firestore Database in Firebase"
        : current
      );
    }, 6000);
    const unsubscribe = onSnapshot(
      collection(firestore, STUDENTS_COLLECTION),
      snapshot => {
        const students = {};
        snapshot.forEach(studentDoc => {
          const { updatedAt, ...student } = studentDoc.data();
          students[studentDoc.id] = normalizeStudent(student);
        });
        const next = { students };
        setDb(next);
        saveDB(next);
        if (studentKey && students[studentKey]) setProgress(students[studentKey]);
        setSyncStatus("Class report connected");
      },
      error => {
        console.error("Firebase sync failed", error);
        setDb(loadDB());
        setSyncStatus("Class report offline - saving in this browser");
      }
    );
    return () => {
      clearTimeout(connectionTimer);
      unsubscribe();
    };
  }, [studentKey]);

  function commitProgress(updater) {
    setProgress(old => {
      if (!old) return old;
      const updated = typeof updater === "function" ? updater(old) : updater;
      const next = { students: { ...db.students, [studentKey]: updated } };
      setDb(next);
      saveDB(next);
      saveStudentRecord(studentKey, updated).catch(error => {
        console.error("Could not save student progress", error);
        setSyncStatus("Class report offline - saving in this browser");
      });
      return updated;
    });
  }

  // ── Login ──
  async function handleLogin() {
    if (!first.trim()) return;
    const safePin = pin.length === 4 ? pin : "0000";
    const k = makeKey(first, last, safePin);
    setStudentKey(k);
    let existing = db.students[k];
    try {
      const studentDoc = await getDoc(doc(firestore, STUDENTS_COLLECTION, k));
      if (studentDoc.exists()) {
        const { updatedAt, ...student } = studentDoc.data();
        existing = normalizeStudent(student);
      }
    } catch (error) {
      console.error("Could not check Firebase student record", error);
      setSyncStatus("Class report offline - saving in this browser");
    }
    const student = existing || newStudent(displayName(first, last));
    setProgress(student);
    if (!existing) {
      const next = { students: { ...db.students, [k]: student } };
      setDb(next);
      saveDB(next);
    }
    saveStudentRecord(k, student).catch(error => {
      console.error("Could not create student record", error);
      setSyncStatus("Class report offline - saving in this browser");
    });
    setScreen("dash");
  }

  // ── Start a level ──
  function startLevel(id) {
    setPhase("intro");
    setReadyChecked(false);
    setQ(null);
    setPicked(null);
    setTypedAnswer("");
    setFeedback(null);
    setShowHint(false);
    setQuestionCount(0);
    setBasicsIdx(0);
    setSessionQ(0);
    setRecentQuestionKeys([]);
    setMissedRepeatQueue([]);
    setShowLevelDoneModal(false);
    if (studentKey) commitProgress(p => ({ ...p, active: id }));
    setScreen("lesson");
  }

  const level = LEVELS.find(lv => lv.id === (progress?.active)) || LEVELS[0];

  // ── Practice prep and quiz ──
  function startPracticePrep() {
    if (level.id === "basics") {
      startPractice();
      return;
    }
    setPhase("guided");
    setPicked(null);
    setTypedAnswer("");
    setFeedback(null);
    setShowHint(false);
  }

  function startPractice() {
    if (level.id === "basics") {
      setBasicsIdx(0);
      setQ({ ...level.questions[0], answer: level.questions[0].a, choices: shuffled(level.questions[0].choices) });
    } else {
      const nextQ = makeQuestion(level, 0, []);
      setQ(nextQ);
      setRecentQuestionKeys([questionKey(nextQ)]);
    }
    setPicked(null);
    setTypedAnswer("");
    setFeedback(null);
    setShowHint(false);
    setSessionQ(0);
    setPhase("practice");
    commitProgress(old => ({
      ...old,
      stats: { ...old.stats, [level.id]: { ...old.stats[level.id], guided: true } }
    }));
  }

  // ── Answer ──
  function handleAnswer(choice) {
    if (picked) return;
    const normalizedChoice = q?.typeMode ? normalizeMeasureText(choice) : choice;
    setPicked(normalizedChoice || choice);
    const correct = normalizedChoice === q.answer;
    if (!correct && level.id !== "basics") {
      const key = measurementKey(q);
      setMissedRepeatQueue(queue => {
        const withoutDuplicate = queue.filter(item => item.key !== key);
        return [...withoutDuplicate, { key, w: q.w, n: q.n, d: q.d, availableAt: sessionQ + 3 }].slice(-8);
      });
    }

    commitProgress((old) => {
      const s = old.stats[level.id];
      const attempts = s.attempts + 1;
      const correctCount = s.correct + (correct ? 1 : 0);
      const recent = [...s.recent, correct].slice(-10);
      const misses = { ...s.misses };
      if (!correct) misses[q.answer] = (misses[q.answer] || 0) + 1;

      const requiredQ = level.requiredQ || 8;
      const passed =
        attempts >= requiredQ &&
        (
          (recent.length >= Math.min(8, requiredQ) && recent.filter(Boolean).length / recent.length * 100 >= level.goal) ||
          (attempts >= requiredQ && correctCount / attempts * 100 >= level.goal)
        );

      const stats = { ...old.stats, [level.id]: { ...s, attempts, correct: correctCount, recent, misses, done: s.done || passed } };

      // unlock next
      if (passed || s.done) {
        const idx = LEVELS.findIndex(lv => lv.id === level.id);
        if (LEVELS[idx + 1]) stats[LEVELS[idx + 1].id] = { ...stats[LEVELS[idx + 1].id], unlocked: true };
        if (level.id === "sixteenth") {
          stats["advanced32"] = { ...stats["advanced32"], unlocked: true };
        }
      }

      const coreLevels = ["basics","whole","half","quarter","eighth","sixteenth"];
      const certified = coreLevels.every(id => stats[id]?.done);
      const advCertified = stats["advanced32"]?.done;
      const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      return {
        ...old, stats,
        certified: old.certified || certified,
        advCertified: old.advCertified || advCertified,
        certDate: old.certDate || (certified ? today : ""),
        advCertDate: old.advCertDate || (advCertified ? today : ""),
      };
    });

    setFeedback({
      correct,
      msg: correct
        ? `✓ Correct! ${q.answer} is right.`
        : `✗ Not quite. The correct answer is ${q.answer}. ${explainMiss(q, normalizedChoice || choice)} ${hintFor(level, q)}`
    });
    setQuestionCount(c => c + 1);
    setSessionQ(c => c + 1);
  }

  function submitTypedAnswer() {
    if (!typedAnswer.trim()) return;
    handleAnswer(typedAnswer);
  }

  function nextMeasurementQuestion(nextSessionQ) {
    const repeatCandidate = missedRepeatQueue.find(item => item.availableAt <= nextSessionQ);
    const nextQ = makeQuestion(level, nextSessionQ, recentQuestionKeys, repeatCandidate);
    if (repeatCandidate) {
      setMissedRepeatQueue(queue => queue.filter(item => item.key !== repeatCandidate.key));
    }
    setQ(nextQ);
    setRecentQuestionKeys(keys => [...keys, questionKey(nextQ)].slice(-16));
  }

  // ── Basics answer ──
  function handleBasicsAnswer(choice) {
    if (picked) return;
    setPicked(choice);
    const correct = choice === q.answer;

    commitProgress((old) => {
      const s = old.stats["basics"];
      const attempts = s.attempts + 1;
      const correctCount = s.correct + (correct ? 1 : 0);
      const recent = [...s.recent, correct].slice(-10);
      const currentPassCorrect = recent.slice(-level.questions.length).length >= level.questions.length &&
        recent.slice(-level.questions.length).every(Boolean);
      const done = s.done || (basicsIdx >= level.questions.length - 1 && correct && currentPassCorrect);
      const misses = { ...s.misses };
      if (!correct) misses[q.answer] = (misses[q.answer] || 0) + 1;
      const stats = { ...old.stats, basics: { ...s, attempts, correct: correctCount, recent, misses, done } };
      if (stats.basics.done) stats["whole"] = { ...stats["whole"], unlocked: true };
      return { ...old, stats };
    });

    setFeedback({ correct, msg: correct ? `✓ Correct! ${q.answer}` : `✗ Not quite. The correct answer is: "${q.answer}"` });
  }

  // ── Next question ──
  function nextQuestion(currentProgress) {
    // Use passed progress snapshot or fall back to state (for modal context)
    const prog = currentProgress || progress;
    const lvStats = prog?.stats?.[level.id] || {};

    // If level just became done and modal not yet shown, show it
    if (lvStats.done && !showLevelDoneModal) {
      setShowLevelDoneModal(true);
      setPicked(null);
      setFeedback(null);
      setShowHint(false);
      return;
    }

    if (level.id === "basics") {
      const nextIdx = basicsIdx + 1;
      if (nextIdx < level.questions.length) {
        setBasicsIdx(nextIdx);
        setQ({ ...level.questions[nextIdx], answer: level.questions[nextIdx].a, choices: shuffled(level.questions[nextIdx].choices) });
        setPicked(null);
        setTypedAnswer("");
        setFeedback(null);
        setShowHint(false);
      } else {
        setShowLevelDoneModal(true);
      }
    } else {
      const nextSessionQ = sessionQ + 1;
      nextMeasurementQuestion(nextSessionQ);
      setPicked(null);
      setTypedAnswer("");
      setFeedback(null);
      setShowHint(false);
    }
  }

  function dismissModal(goNext) {
    setShowLevelDoneModal(false);
    if (goNext) {
      // advance to next level
      const idx = LEVELS.findIndex(lv => lv.id === level.id);
      const next = LEVELS[idx + 1];
      if (next) startLevel(next.id);
      else setScreen("dash");
    } else {
      // keep practicing this level
      nextMeasurementQuestion(sessionQ);
      setPicked(null);
      setTypedAnswer("");
      setFeedback(null);
      setShowHint(false);
    }
  }

  // ── Derived stats ──
  const stats = progress?.stats || {};
  const totalPassed = LEVELS.filter(lv => stats[lv.id]?.done).length;
  const overallPct = Math.round(totalPassed / LEVELS.length * 100);
  const levelStats = stats[level?.id] || {};
  const acc = levelStats.attempts ? Math.round(levelStats.correct / levelStats.attempts * 100) : 0;

  // ── CSV export ──
  function exportCSV() {
    const headers = [
      "Student",
      "Current Level",
      "Questions Answered",
      ...reportAccuracyLevels().map(lv => `${reportAccuracyLabel(lv)} Accuracy`),
      "Top Misses",
      "Certified",
      "Bonus Certified"
    ];
    const rows = Object.values(db.students).map(st => {
      const tot = Object.values(st.stats).reduce((a, s) => a + s.attempts, 0);
      const cur = LEVELS.find(lv => lv.id === st.active);
      const misses = LEVELS.map(lv => topMisses(st.stats[lv.id], 1)).filter(Boolean).slice(0, 3).join("; ");
      return [
        st.name,
        cur?.name || "",
        tot,
        ...reportAccuracyLevels().map(lv => levelAccuracyValue(st, lv.id)),
        misses,
        st.certified ? "Yes" : "No",
        st.advCertified ? "Yes" : "No"
      ];
    });
    const text = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = "semlers-report.csv"; a.click();
  }

  function resetStudent(key) {
    const st = db.students[key];
    if (!st || !confirm(`Reset progress for ${st.name}?`)) return;
    const nextStudent = newStudent(st.name);
    const next = { students: { ...db.students, [key]: nextStudent } };
    setDb(next);
    saveDB(next);
    saveStudentRecord(key, nextStudent).catch(error => {
      console.error("Could not reset student in Firebase", error);
      setSyncStatus("Class report offline - saving in this browser");
    });
    if (key === studentKey) setProgress(nextStudent);
  }

  function deleteStudent(key) {
    const st = db.students[key];
    if (!st || !confirm(`Delete ${st.name} from this browser?`)) return;
    const students = { ...db.students };
    delete students[key];
    const next = { students };
    setDb(next);
    saveDB(next);
    deleteStudentRecord(key).catch(error => {
      console.error("Could not delete student from Firebase", error);
      setSyncStatus("Class report offline - saving in this browser");
    });
    if (key === studentKey) {
      setProgress(null);
      setStudentKey("");
      setScreen("login");
    }
  }

  function unlockStudentLevel(key) {
    const st = db.students[key];
    if (!st) return;
    const stats = { ...st.stats };
    const currentIdx = LEVELS.findIndex(lv => !stats[lv.id]?.unlocked);
    const unlockIdx = currentIdx === -1 ? LEVELS.length - 1 : currentIdx;
    stats[LEVELS[unlockIdx].id] = { ...stats[LEVELS[unlockIdx].id], unlocked: true };
    const nextStudent = { ...st, stats };
    const next = { students: { ...db.students, [key]: nextStudent } };
    setDb(next);
    saveDB(next);
    saveStudentRecord(key, nextStudent).catch(error => {
      console.error("Could not unlock student level in Firebase", error);
      setSyncStatus("Class report offline - saving in this browser");
    });
    if (key === studentKey) setProgress(nextStudent);
  }

  function openTeacherLogin() {
    setTeacherPin("");
    setTeacherError("");
    setScreen("teacherLogin");
  }

  function handleTeacherLogin() {
    if (teacherPin === TEACHER_PIN) {
      setTeacherUnlocked(true);
      setTeacherError("");
      setScreen("reports");
    } else {
      setTeacherError("Incorrect teacher PIN.");
    }
  }

  function openReports() {
    if (teacherUnlocked) setScreen("reports");
    else openTeacherLogin();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="app">
      <style>{css}</style>

      {/* ── LOGIN ── */}
      {screen === "login" && (
        <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 420 }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>📏</div>
              <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 3 }}>
                Semler's Tape Measure Academy
              </h1>
              <p style={{ color: "#666", marginTop: 6, fontSize: 14 }}>Progress saves automatically in this browser.</p>
              <p className="sync-note">{syncStatus}</p>
            </div>
            <div className="card">
              <div className="tag">Sign In</div>
              <input className="input" placeholder="First name" value={first} onChange={e => setFirst(e.target.value)} />
              <input className="input" placeholder="Last initial (optional)" maxLength={1} value={last} onChange={e => setLast(e.target.value.toUpperCase())} />
              <input className="input" placeholder="4-digit PIN (new? pick any 4 digits)" maxLength={4}
                value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
              <div className="btn-row">
                <button className="btn yellow" style={{ flex: 1 }} onClick={handleLogin}>Start Training →</button>
              </div>
              <button className="btn ghost sm" style={{ marginTop: 10, width: "100%" }} onClick={openTeacherLogin}>Teacher Reports</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TEACHER LOGIN ── */}
      {screen === "teacherLogin" && (
        <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 420 }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>📏</div>
              <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 3 }}>
                Teacher Reports
              </h1>
              <p className="sync-note">{syncStatus}</p>
            </div>
            <div className="card">
              <div className="tag">Teacher PIN</div>
              <input
                className="input"
                placeholder="Teacher PIN"
                maxLength={8}
                value={teacherPin}
                onChange={e => {
                  setTeacherPin(e.target.value.replace(/\D/g, "").slice(0, 8));
                  setTeacherError("");
                }}
                onKeyDown={e => e.key === "Enter" && handleTeacherLogin()}
              />
              {teacherError && <div className="feedback wrong" style={{ marginBottom: 12 }}>{teacherError}</div>}
              <div className="btn-row">
                <button className="btn yellow" style={{ flex: 1 }} onClick={handleTeacherLogin}>Open Reports →</button>
                <button className="btn ghost" onClick={() => setScreen("login")}>Back</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REPORTS ── */}
      {screen === "reports" && teacherUnlocked && (
        <div className="page">
          <div className="page-inner reports">
            <div className="topbar">
              <div className="logo-tape">📏</div>
              <div className="logo-text">
                <h1>Semler's Tape Measure Academy</h1>
                <p>Teacher Reports</p>
                <p className="sync-note">{syncStatus}</p>
              </div>
              <div className="topbar-right">
                <button className="btn ghost sm" onClick={() => setScreen("login")}>← Back</button>
                <button className="btn sm" onClick={exportCSV}>Export CSV</button>
              </div>
            </div>

            <div className="card">
              <div className="tag">Class Overview</div>
              <div className="report-scroll">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Current Level</th>
                      <th>Questions</th>
                      {reportAccuracyLevels().map(lv => (
                        <th className="level-accuracy" key={lv.id} title={`${lv.name} Accuracy`}>{reportAccuracyLabel(lv)}</th>
                      ))}
                      <th>Misses</th>
                      <th>Certified</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(db.students).map(([key, st]) => {
                      const tot = Object.values(st.stats).reduce((a, s) => a + s.attempts, 0);
                      const cur = LEVELS.find(lv => lv.id === st.active);
                      const misses = LEVELS.map(lv => topMisses(st.stats[lv.id], 1)).filter(Boolean).slice(0, 3).join(", ");
                      return (
                        <tr key={key}>
                          <td><b>{st.name}</b></td>
                          <td>{cur?.name || "—"}</td>
                          <td>{tot}</td>
                          {reportAccuracyLevels().map(lv => (
                            <td className="level-accuracy" key={lv.id}>{levelAccuracyValue(st, lv.id) || "—"}</td>
                          ))}
                          <td>{misses || "—"}</td>
                          <td>{st.advCertified ? <span style={{color:"#C0392B"}}>Bonus</span> : st.certified ? <span style={{color:"#16a34a"}}>Core</span> : "—"}</td>
                          <td>
                            <div className="teacher-actions">
                              <button className="btn ghost sm" onClick={() => unlockStudentLevel(key)}>Unlock</button>
                              <button className="btn ghost sm" onClick={() => resetStudent(key)}>Reset</button>
                              <button className="btn red sm" onClick={() => deleteStudent(key)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {Object.keys(db.students).length === 0 && (
                      <tr><td colSpan={13} style={{textAlign:"center",color:"#999",padding:24}}>No students yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {screen === "dash" && progress && (
        <div className="page">
          <div className="page-inner">
            <div className="topbar">
              <div className="logo-tape">📏</div>
              <div className="logo-text">
                <h1>Semler's Tape Measure Academy</h1>
                <p>Welcome back, {progress.name}</p>
              </div>
              <div className="topbar-right">
                {(progress.certified || progress.advCertified) && (
                  <button className="btn yellow sm" onClick={() => setScreen("cert")}>🏅 Certificate</button>
                )}
                <button className="btn ghost sm" onClick={openReports}>Reports</button>
                <button className="btn ghost sm" onClick={() => setScreen("login")}>Sign Out</button>
              </div>
            </div>

            {/* Overall progress */}
            <div className="progress-wrap">
              <div className="progress-label">
                <span>Overall Progress</span>
                <span>{totalPassed} / {LEVELS.length} levels — {overallPct}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: overallPct + "%" }} />
              </div>
            </div>

            {/* Stats */}
            <div className="stat-row">
              {LEVELS.map(lv => {
                const s = stats[lv.id] || {};
                const a = s.attempts ? Math.round(s.correct / s.attempts * 100) : null;
                if (!s.attempts) return null;
                return (
                  <div className="stat-chip" key={lv.id}>
                    <b>{a}%</b>{lv.name.replace("Semler's","").replace("Advanced:","Adv.")}
                  </div>
                );
              })}
            </div>

            {/* Levels */}
            {LEVELS.map((lv, i) => {
              const s = stats[lv.id] || {};
              const locked = !s.unlocked;
              const done = s.done;
              const acc = s.attempts ? Math.round(s.correct / s.attempts * 100) : 0;
              return (
                <div key={lv.id} className={`level-row ${done ? "done" : locked ? "locked" : ""}`}>
                  <div className={`level-num ${done ? "done" : locked ? "locked" : ""}`}>
                    {done ? "✓" : locked ? "🔒" : i + 1}
                  </div>
                  <div className="level-info">
                    <h3>{lv.name}{lv.cert ? " 🎓" : ""}{lv.advanced ? " 🏆" : ""}</h3>
                    <p>
                      {locked ? "Complete previous level to unlock" :
                        `Attempts: ${s.attempts} • Accuracy: ${acc}% • Goal: ${lv.goal}%`}
                    </p>
                  </div>
                  <button
                    className={`btn sm ${done ? "ghost" : "yellow"}`}
                    disabled={locked}
                    onClick={() => startLevel(lv.id)}
                  >
                    {done ? "Review" : "Continue →"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LESSON ── */}
      {screen === "lesson" && progress && (
        <div className="page">
          <div className="page-inner">
            <div className="topbar">
              <div className="logo-tape">📏</div>
              <div className="logo-text">
                <h1>Semler's Tape Measure Academy</h1>
              </div>
              <div className="topbar-right">
                <button className="btn ghost sm" onClick={() => setScreen("dash")}>← Dashboard</button>
              </div>
            </div>

            {/* Level progress */}
            <div className="progress-wrap">
              <div className="progress-label">
                <span>{level.name}</span>
                <span>Goal: {level.goal}% • Accuracy: {acc}% • Questions: {questionCount}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: Math.min(acc, 100) + "%" }} />
              </div>
            </div>

            {/* Level complete modal overlay */}
            {showLevelDoneModal && (
              <div style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
                zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20
              }}>
                <div className="card" style={{ maxWidth: 440, width: "100%", textAlign: "center", padding: "36px 32px" }}>
                  <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
                  <div className="tag green" style={{ marginBottom: 12 }}>Level Complete</div>
                  <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1, marginBottom: 10 }}>
                    {level.name}
                  </h2>
                  <p style={{ color: "#555", fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
                    Great work! You've hit the goal for this level.<br/>
                    Do you want to move on to the next level, or keep practicing this one?
                  </p>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <button className="btn yellow" onClick={() => dismissModal(true)}>
                      Move On →
                    </button>
                    <button className="btn ghost" onClick={() => dismissModal(false)}>
                      Keep Practicing
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* INTRO phase */}
            {phase === "intro" && (
              <div className="card">
                <div className="tag">Lesson</div>
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1, marginBottom: 16 }}>
                  {level.name}
                </h2>
                {level.intro.map((step, i) => (
                  <div className="intro-step" key={i}>
                    <div className="step-label">Topic {i + 1} - {step.step}</div>
                    <p>{step.body}</p>
                  </div>
                ))}

                {level.id === "basics" && (
                  <>
                    <HookLessonVisual />
                    <TapePositionVisual />
                  </>
                )}

                {/* Tape preview for measurement levels */}
                {level.den > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div className="tag gray" style={{ marginBottom: 10 }}>Tape Preview</div>
                    <TapeSVG q={lessonPreviewQuestion(level)} guide />
                  </div>
                )}

                <div style={{ marginTop: 18, padding: 16, background: "#FFFBEB", borderRadius: 10, border: "1.5px solid #F5C518" }}>
                  <b>Ready check</b>
                  <p style={{ fontSize: 14, color: "#555", marginTop: 6, marginBottom: 12 }}>
                    Review the lesson topics above, then check the box to start practicing.
                  </p>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={readyChecked} onChange={e => setReadyChecked(e.target.checked)} style={{ width: 18, height: 18 }} />
                    <span>I've read the lesson and I'm ready to practice.</span>
                  </label>
                </div>

                <div className="btn-row">
                  <button className="btn yellow" disabled={!readyChecked} onClick={startPracticePrep}>
                    {level.id === "basics" ? "Start Basics Quiz →" : "Practice Together →"}
                  </button>
                </div>
              </div>
            )}

            {/* PRACTICE PREP phase */}
            {phase === "guided" && (
              <div className="card">
                <div className="tag green">Practice Together</div>
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1, marginBottom: 16 }}>
                  {level.name}
                </h2>
                {practicePrepFor(level).map((step, i) => (
                  <div className="intro-step" key={i}>
                    <div className="step-label">Teaching Point {i + 1} - {step.step}</div>
                    <p>{step.body}</p>
                  </div>
                ))}

                {level.den > 0 && (
                  <TapeSVG q={lessonPreviewQuestion(level)} guide />
                )}

                {level.id !== "basics" && (
                  <div style={{ marginTop: 16, padding: 14, background: "#F0FDF4", border: "1.5px solid #16a34a", borderRadius: 10 }}>
                    <div className="tag green" style={{ marginBottom: 8 }}>Mixed Practice</div>
                    <p style={{ fontSize: 14, color: "#14532d", lineHeight: 1.6 }}>
                      The quiz will mix different question styles: read the arrow, click the mark, type the answer, and solve shop-style prompts.
                    </p>
                  </div>
                )}

                <div className="btn-row">
                  <button className="btn yellow" onClick={startPractice}>Continue to Quiz →</button>
                  <button className="btn ghost sm" onClick={() => setPhase("intro")}>Back to Lesson</button>
                </div>
              </div>
            )}

            {/* PRACTICE phase */}
            {phase === "practice" && q && (
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div className="tag red" style={{marginBottom:0}}>Quiz</div>
                    {q.isReview && <div className="tag gray" style={{marginBottom:0}}>Review</div>}
                  </div>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#888" }}>
                    {levelStats.correct}/{levelStats.attempts} correct • {level.requiredQ ? `${Math.min(sessionQ, level.requiredQ)}/${level.requiredQ} needed` : ""}
                  </span>
                </div>

                {/* Question prompt */}
                <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 14, lineHeight: 1.6 }}>
                  {level.id === "basics"
                    ? q.q
                    : q.storyMode
                      ? q.story
                    : q.typeMode
                      ? "Type the measurement shown by the arrow."
                    : q.findMode
                      ? `Click on the tape to mark ${q.answer}`
                      : "What measurement does the arrow point to?"}
                </p>

                {/* Tape (non-basics) */}
                {level.id !== "basics" && (
                  <>
                    {level.den < 16 && (
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                        <span className="tag gray" style={{marginBottom:0}}>Level marks only</span>
                        <span style={{fontSize:12,color:"#888"}}>Master this mark family before the full tape appears.</span>
                      </div>
                    )}
                    <TapeSVG
                      q={q}
                      onPick={q.findMode ? handleAnswer : undefined}
                      picked={picked}
                      showArrow={!q.findMode}
                    />
                  </>
                )}

                {/* Hint */}
                {showHint && (
                  <div style={{ background: "#FFFBEB", border: "1.5px solid #F5C518", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 }}>
                    💡 {level.id === "basics" ? "Re-read the lesson steps." : hintFor(level, q)}
                  </div>
                )}

                {/* Answer choices */}
                {((!q.findMode && !q.typeMode) || level.id === "basics") && (
                  <div className="choices">
                    {(q.choices || q.options || []).map(choice => {
                      let cls = "choice-btn";
                      if (picked) {
                        if (choice === q.answer) cls += " correct";
                        else if (choice === picked) cls += " wrong";
                      }
                      return (
                        <button key={choice} className={cls} disabled={!!picked} onClick={() => level.id === "basics" ? handleBasicsAnswer(choice) : handleAnswer(choice)}>
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.typeMode && level.id !== "basics" && !picked && (
                  <div style={{ marginTop: 14 }}>
	                    <input
	                      className="input"
	                      placeholder={typedAnswerExample(q)}
	                      value={typedAnswer}
                      onChange={e => setTypedAnswer(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && submitTypedAnswer()}
                    />
                    <button className="btn yellow" onClick={submitTypedAnswer}>Check Answer</button>
                  </div>
                )}

                {/* Feedback */}
                {feedback && (
                  <div className={`feedback ${feedback.correct ? "correct" : "wrong"}`}>
                    {feedback.msg}
                  </div>
                )}

                {/* Actions */}
                <div className="btn-row">
                  {picked
                    ? <button className="btn yellow" onClick={() => nextQuestion()}>Next Question →</button>
                    : <button className="btn ghost sm" onClick={() => setShowHint(true)}>💡 Hint</button>
                  }
                  <button className="btn ghost sm" onClick={() => { setPhase("intro"); setReadyChecked(false); }}>Re-read Lesson</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CERTIFICATE ── */}
      {screen === "cert" && progress && (
        <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 580 }}>
            <div className="topbar" style={{ marginBottom: 24 }}>
              <div className="logo-tape">📏</div>
              <div className="logo-text"><h1>Semler's Tape Measure Academy</h1></div>
              <div className="topbar-right">
                <button className="btn ghost sm" onClick={() => setScreen("dash")}>← Dashboard</button>
              </div>
            </div>

            {progress.certified && (
              <div className="cert-box" style={{ marginBottom: 20 }}>
                <div className="cert-icon">🎓</div>
                <h2>Certificate of Completion</h2>
                <p style={{ color: "#888", fontSize: 13, letterSpacing: "0.08em" }}>SEMLER'S TAPE MEASURE ACADEMY</p>
                <div className="cert-name">{progress.name}</div>
                <p>has demonstrated mastery of reading a tape measure to <b>1/16 of an inch</b>, covering whole inches, halves, quarters, eighths, and sixteenths.</p>
                <div className="cert-date">Issued {progress.certDate} · Semler's Tape Measure Academy</div>
              </div>
            )}

            {progress.advCertified && (
              <div className="cert-box" style={{ border: "3px solid #C0392B", boxShadow: "6px 6px 0 #1a1a1a", marginBottom: 20 }}>
                <div className="cert-icon">🏆</div>
                <h2 style={{ color: "#C0392B" }}>Bonus Certificate</h2>
                <p style={{ color: "#888", fontSize: 13, letterSpacing: "0.08em" }}>SEMLER'S TAPE MEASURE ACADEMY</p>
                <div className="cert-name">{progress.name}</div>
                <p>has demonstrated <b>Advanced Mastery</b> of reading a tape measure to <b>1/32 of an inch</b> — a precision skill used in woodworking, metalworking, and engineering.</p>
                <div className="cert-date">Issued {progress.advCertDate} · Semler's Tape Measure Academy</div>
              </div>
            )}

            <div className="btn-row" style={{ justifyContent: "center" }}>
              <button className="btn ghost" onClick={() => window.print()}>🖨 Print</button>
              <button className="btn yellow" onClick={() => setScreen("dash")}>Back to Dashboard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
