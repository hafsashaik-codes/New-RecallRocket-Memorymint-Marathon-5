/**
 * RecallRocket: MemoryMint Marathon (Examiner Showcase Edition)
 * Implements SM-2 Spaced Repetition (EF >= 1.3), ISO UTC Streak Tracking,
 * 3D Flashcard Engine, Live Retention Curve Canvas, CSV I/O & Web Speech TTS
 */

const DB_KEY = "recallrocket_examiner_v3";

// Normalize all dates to ISO UTC YYYY-MM-DD to prevent midnight/timezone drift
function isoUtcDate(offsetDays = 0) {
  const now = new Date();
  const utc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays);
  return new Date(utc).toISOString().split("T")[0];
}

// Pre-seeded 10 Computer Science Interview Cards (Algorithms Deck)
const DEFAULT_DB = {
  theme: "dark",
  activeDeckId: "algorithms",
  profile: {
    name: "You (Presenter)",
    streak: 6, // Advances to 7-day streak upon completing today's review session
    lastUtcDate: isoUtcDate(-1),
    reviewedCount: 54
  },
  cohort: [
    { name: "Ananya Reddy", streak: 15, reviews: 92 },
    { name: "Siddharth Rao", streak: 9, reviews: 78 },
    { name: "Karthik Nair", streak: 11, reviews: 61 },
    { name: "Neha Kulkarni", streak: 5, reviews: 44 },
    { name: "Arjun Menon", streak: 3, reviews: 31 }
  ],
  decks: [
    {
      id: "algorithms",
      name: "Algorithms",
      cards: [
        {
          id: "alg-1",
          front: "What is the time complexity of **QuickSort**?",
          back: "Average: `O(n log n)` · Best: `O(n log n)` · Worst: `O(n²)` (already sorted with poor pivot).",
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReviewDate: isoUtcDate(0)
        },
        {
          id: "alg-2",
          front: "Why does **MergeSort** guarantee `O(n log n)` in the worst case?",
          back: "It always splits the array into **two equal halves** (`log n` levels) and merges in `O(n)` linear time.",
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReviewDate: isoUtcDate(0)
        },
        {
          id: "alg-3",
          front: "What data structure is used by **Dijkstra's Algorithm** for greedy vertex selection?",
          back: "A **Min-Priority Queue (Binary Min-Heap)** keyed by shortest tentative distance.",
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReviewDate: isoUtcDate(0)
        },
        {
          id: "alg-4",
          front: "What is the time complexity of building a **Binary Heap** from an unsorted array?",
          back: "`O(n)` using bottom-up `heapify` (Floyd's algorithm).",
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReviewDate: isoUtcDate(0)
        },
        {
          id: "alg-5",
          front: "Which two properties define a **Dynamic Programming** problem?",
          back: "1. **Optimal Substructure** and 2. **Overlapping Subproblems**.",
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReviewDate: isoUtcDate(0)
        },
        {
          id: "alg-6",
          front: "How do you detect a cycle in a **Directed Graph**?",
          back: "Track active recursion stack nodes during **DFS** (back-edge detection) or check if **Kahn's Topological Sort** visits fewer than `V` vertices.",
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReviewDate: isoUtcDate(0)
        },
        {
          id: "alg-7",
          front: "What is the space complexity of **Depth-First Search (DFS)** on a balanced binary tree?",
          back: "`O(log n)` due to recursion stack depth (`O(n)` in a skewed tree).",
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReviewDate: isoUtcDate(0)
        },
        {
          id: "alg-8",
          front: "Why is **Binary Search** `O(log n)`?",
          back: "Each comparison eliminates **half** of the remaining sorted search interval.",
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReviewDate: isoUtcDate(0)
        },
        {
          id: "alg-9",
          front: "What is the amortized time complexity of appending to a **Dynamic Array**?",
          back: "`O(1)` amortized, as geometric resizing (`2x`) occurs exponentially less frequently.",
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReviewDate: isoUtcDate(0)
        },
        {
          id: "alg-10",
          front: "Which BST traversal outputs keys in **sorted ascending order**?",
          back: "**In-order Traversal** (`Left → Node → Right`).",
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReviewDate: isoUtcDate(0)
        }
      ]
    }
  ]
};

let db = loadDb();
let sessionQueue = [];
let pointer = 0;
let cardFlipped = false;
let cramMode = false;

function loadDb() {
  const cached = localStorage.getItem(DB_KEY);
  if (!cached) {
    localStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_DB));
    return structuredClone(DEFAULT_DB);
  }
  return JSON.parse(cached);
}

function saveDb() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

/**
 * SuperMemo-2 (SM-2) Algorithm
 * Enforces Ease Factor floor of 1.3 per SM-2 specification.
 */
function computeSM2(card, grade) {
  let { easeFactor, interval, repetitions } = card;

  if (grade < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  return {
    easeFactor: Number(easeFactor.toFixed(2)),
    interval,
    repetitions,
    nextReviewDate: isoUtcDate(interval)
  };
}

function formatRichText(raw) {
  const safe = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return safe
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function updateStreak(recordToday = false) {
  const today = isoUtcDate(0);
  const yesterday = isoUtcDate(-1);
  if (db.profile.lastUtcDate && db.profile.lastUtcDate !== today && db.profile.lastUtcDate !== yesterday) {
    db.profile.streak = 0;
  }
  if (recordToday && db.profile.lastUtcDate !== today) {
    db.profile.streak += 1;
    db.profile.lastUtcDate = today;
  }
}

function getTierName(streak) {
  if (streak >= 30) return "🏆 Grandmaster";
  if (streak >= 14) return "⚡ Marathoner";
  if (streak >= 7) return "🔥 7-Day Streak";
  if (streak >= 3) return "🌱 Consistent";
  return "🚀 Starter";
}

function currentDeck() {
  return db.decks.find(d => d.id === db.activeDeckId) || db.decks[0];
}

function refreshQueue() {
  const deck = currentDeck();
  const today = isoUtcDate(0);
  sessionQueue = cramMode ? [...deck.cards] : deck.cards.filter(c => c.nextReviewDate <= today);
  pointer = 0;
  cardFlipped = false;
}

function renderApp() {
  document.documentElement.setAttribute("data-theme", db.theme);
  document.getElementById("themeBtn").textContent = db.theme === "dark" ? "☀️" : "🌙";
  updateStreak(false);

  document.getElementById("streakDays").textContent = db.profile.streak;
  document.getElementById("tierBadge").textContent = getTierName(db.profile.streak);

  const selector = document.getElementById("deckSelector");
  selector.innerHTML = db.decks
    .map(d => `<option value="${d.id}" ${d.id === db.activeDeckId ? "selected" : ""}>${d.name} (${d.cards.length})</option>`)
    .join("");

  const deck = currentDeck();
  const dueCount = deck.cards.filter(c => c.nextReviewDate <= isoUtcDate(0)).length;
  document.getElementById("dueChip").textContent = `${dueCount} due today`;

  renderStudyCard();
  renderExplorer();
  renderLeaderboard();
  renderDecayCanvas();
}

function renderStudyCard() {
  const zone = document.getElementById("studyZone");
  const complete = document.getElementById("completeCard");
  const card3d = document.getElementById("card3d");
  const gradeDeck = document.getElementById("gradeDeck");

  if (!sessionQueue.length || pointer >= sessionQueue.length) {
    zone.classList.add("hidden");
    complete.classList.remove("hidden");
    return;
  }

  zone.classList.remove("hidden");
  complete.classList.add("hidden");

  const card = sessionQueue[pointer];
  card3d.classList.toggle("flipped", cardFlipped);
  gradeDeck.classList.toggle("hidden", !cardFlipped);

  document.getElementById("frontBody").innerHTML = formatRichText(card.front);
  document.getElementById("backBody").innerHTML = formatRichText(card.back);
  document.getElementById("cardIndexText").textContent = `Card ${pointer + 1} of ${sessionQueue.length}`;
  document.getElementById("efTag").textContent = `EF: ${card.easeFactor.toFixed(2)}`;
  document.getElementById("intTag").textContent = `Interval: ${card.interval}d`;
  document.getElementById("repTag").textContent = `Reps: ${card.repetitions}`;
  document.getElementById("progressBar").style.width = `${(pointer / sessionQueue.length) * 100}%`;

  [3, 4, 5].forEach(g => {
    const sim = computeSM2(card, g);
    document.getElementById(`next-${g}`).textContent = `Next · ${sim.interval}d`;
  });
}

function renderExplorer() {
  const rows = document.getElementById("cardRows");
  rows.innerHTML = currentDeck().cards
    .map(c => `
      <div class="row-item">
        <div>${formatRichText(c.front)}</div>
        <div class="row-due">Next: <strong>${c.nextReviewDate}</strong> · EF ${c.easeFactor.toFixed(2)}</div>
      </div>
    `)
    .join("");
}

function renderLeaderboard() {
  const board = [
    ...db.cohort.map(u => ({ ...u, isSelf: false })),
    {
      name: db.profile.name,
      streak: db.profile.streak,
      reviews: db.profile.reviewedCount,
      isSelf: true
    }
  ].map(entry => ({
    ...entry,
    score: entry.reviews * 10 + entry.streak * 25
  }));

  board.sort((a, b) => b.score - a.score);
  const myRank = board.findIndex(e => e.isSelf) + 1;
  document.getElementById("rankDisplay").textContent = `#${myRank}`;

  document.getElementById("lbRows").innerHTML = board
    .map((u, idx) => `
      <tr class="${u.isSelf ? "highlight-me" : ""}">
        <td>#${idx + 1}</td>
        <td>${u.name}</td>
        <td>${getTierName(u.streak)}</td>
        <td>🔥 ${u.streak}d</td>
        <td>${u.reviews}</td>
        <td><strong>${u.score}</strong></td>
      </tr>
    `)
    .join("");
}

function renderDecayCanvas() {
  const canvas = document.getElementById("curveCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const cards = currentDeck().cards;
  const meanEf = cards.length ? cards.reduce((sum, c) => sum + c.easeFactor, 0) / cards.length : 2.5;
  document.getElementById("deckMeanEf").textContent = meanEf.toFixed(2);

  const w = canvas.width;
  const h = canvas.height;
  const pad = 44;
  ctx.clearRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    const gy = 20 + ((h - pad - 20) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad, gy);
    ctx.lineTo(w - 20, gy);
    ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, 20);
  ctx.lineTo(pad, h - pad);
  ctx.lineTo(w - 20, h - pad);
  ctx.stroke();

  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px sans-serif";
  ctx.fillText("100% Recall", 6, 25);
  ctx.fillText("Day 0", pad, h - 18);
  ctx.fillText("Day 30 (SM-2 Review Spikes)", w - 190, h - 18);

  // Sawtooth SM-2 Retention Curve
  const reviewSpikes = [1, 6, Math.round(6 * meanEf)];
  let lastSpike = 0;
  let stability = 1.55;

  ctx.strokeStyle = "#818cf8";
  ctx.lineWidth = 3;
  ctx.beginPath();

  for (let day = 0; day <= 30; day += 0.2) {
    if (reviewSpikes.includes(Math.round(day)) && Math.abs(day - Math.round(day)) < 0.12 && day > 0) {
      lastSpike = day;
      stability *= meanEf * 0.85;
    }
    const recall = Math.exp(-(day - lastSpike) / stability);
    const x = pad + (day / 30) * (w - pad - 25);
    const y = (h - pad) - recall * (h - pad - 25);
    if (day === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// Interactions
function flipActiveCard() {
  if (!sessionQueue.length || pointer >= sessionQueue.length) return;
  cardFlipped = !cardFlipped;
  renderStudyCard();
}

function handleGrade(grade) {
  if (!cardFlipped || pointer >= sessionQueue.length) return;
  const card = sessionQueue[pointer];
  Object.assign(card, computeSM2(card, grade));
  db.profile.reviewedCount += 1;
  updateStreak(true);
  saveDb();

  pointer += 1;
  cardFlipped = false;
  renderApp();
}

function speakCardSide(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[*`]/g, "");
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(clean));
}

document.getElementById("card3d").addEventListener("click", e => {
  if (e.target.closest(".tts-btn")) return;
  flipActiveCard();
});

document.getElementById("ttsFront").addEventListener("click", () => speakCardSide(sessionQueue[pointer]?.front || ""));
document.getElementById("ttsBack").addEventListener("click", () => speakCardSide(sessionQueue[pointer]?.back || ""));

document.querySelectorAll(".grade-card").forEach(btn => {
  btn.addEventListener("click", () => handleGrade(Number(btn.dataset.q)));
});

document.addEventListener("keydown", e => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
  if (e.code === "Space") {
    e.preventDefault();
    flipActiveCard();
  } else if (["1", "2", "3", "4", "5"].includes(e.key) && cardFlipped) {
    handleGrade(Number(e.key));
  }
});

// Tabs
document.querySelectorAll(".pill-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".pill-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");
    if (tab.dataset.tab === "curve") renderDecayCanvas();
  });
});

document.getElementById("goLbBtn").addEventListener("click", () => {
  document.querySelector('[data-tab="leaderboard"]').click();
});

document.getElementById("deckSelector").addEventListener("change", e => {
  db.activeDeckId = e.target.value;
  cramMode = false;
  saveDb();
  refreshQueue();
  renderApp();
});

document.getElementById("cramAllBtn").addEventListener("click", () => {
  cramMode = true;
  refreshQueue();
  renderApp();
});

document.getElementById("themeBtn").addEventListener("click", () => {
  db.theme = db.theme === "dark" ? "light" : "dark";
  saveDb();
  renderApp();
});

// Deck Modal
const modalDeck = document.getElementById("modalDeck");
document.getElementById("addDeckBtn").addEventListener("click", () => modalDeck.classList.remove("hidden"));
document.getElementById("closeDeckBtn").addEventListener("click", () => modalDeck.classList.add("hidden"));
document.getElementById("saveDeckBtn").addEventListener("click", () => {
  const name = document.getElementById("deckNameInput").value.trim();
  if (!name) return;
  const deck = { id: `deck-${Date.now()}`, name, cards: [] };
  db.decks.push(deck);
  db.activeDeckId = deck.id;
  document.getElementById("deckNameInput").value = "";
  modalDeck.classList.add("hidden");
  saveDb();
  refreshQueue();
  renderApp();
});

// Card Modal with Live Preview
const modalCard = document.getElementById("modalCard");
const qInput = document.getElementById("qInput");
const aInput = document.getElementById("aInput");

document.getElementById("addCardBtn").addEventListener("click", () => modalCard.classList.remove("hidden"));
document.getElementById("closeCardBtn").addEventListener("click", () => modalCard.classList.add("hidden"));

qInput.addEventListener("input", () => {
  document.getElementById("qPreview").innerHTML = formatRichText(qInput.value || "Question preview...");
});
aInput.addEventListener("input", () => {
  document.getElementById("aPreview").innerHTML = formatRichText(aInput.value || "Answer preview...");
});

document.getElementById("saveCardBtn").addEventListener("click", () => {
  const front = qInput.value.trim();
  const back = aInput.value.trim();
  if (!front || !back) return;
  currentDeck().cards.push({
    id: `c-${Date.now()}`,
    front,
    back,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: isoUtcDate(0)
  });
  qInput.value = "";
  aInput.value = "";
  modalCard.classList.add("hidden");
  saveDb();
  refreshQueue();
  renderApp();
});

// CSV Export & Import
document.getElementById("csvExportBtn").addEventListener("click", () => {
  const deck = currentDeck();
  const rows = [["Question", "Answer"], ...deck.cards.map(c => [c.front, c.back])];
  const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${deck.name.toLowerCase().replace(/\s+/g, "-")}.csv`;
  a.click();
});

document.getElementById("csvImportInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const lines = ev.target.result.split(/\r?\n/).slice(1);
    const deck = currentDeck();
    lines.forEach(line => {
      if (!line.trim()) return;
      const cols = line.split(",");
      if (cols.length >= 2) {
        deck.cards.push({
          id: `c-${Date.now()}-${Math.random()}`,
          q: undefined,
          front: cols[0].replace(/^"|"$/g, "").trim(),
          back: cols.slice(1).join(",").replace(/^"|"$/g, "").trim(),
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReviewDate: isoUtcDate(0)
        });
      }
    });
    saveDb();
    refreshQueue();
    renderApp();
  };
  reader.readAsText(file);
});

refreshQueue();
renderApp();

