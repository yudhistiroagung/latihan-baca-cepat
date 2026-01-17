const dashboardTab = document.getElementById("dashboardTab");
const quizTab = document.getElementById("quizTab");
const dashboardSection = document.getElementById("dashboardSection");
const quizSection = document.getElementById("quizSection");
const setupModal = document.getElementById("setupModal");
const closeModal = document.getElementById("closeModal");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const goalSecondsInput = document.getElementById("goalSeconds");
const numQuestionsInput = document.getElementById("numQuestions");
const startQuizBtn = document.getElementById("startQuizBtn");
const playOverlay = document.getElementById("playOverlay");
const questionText = document.getElementById("questionText");
const progressText = document.getElementById("progressText");
const nextBtn = document.getElementById("nextBtn");
const resultModal = document.getElementById("resultModal");
const closeResult = document.getElementById("closeResult");
const goDashboard = document.getElementById("goDashboard");
const resultType = document.getElementById("resultType");
const resultQuestions = document.getElementById("resultQuestions");
const resultGoal = document.getElementById("resultGoal");
const resultAvg = document.getElementById("resultAvg");
const resultScore = document.getElementById("resultScore");
const perQuestionList = document.getElementById("perQuestionList");
const totalQuizzesEl = document.getElementById("totalQuizzes");
const averageScoreEl = document.getElementById("averageScore");
const bestScoreEl = document.getElementById("bestScore");
const countSingleEl = document.getElementById("countSingle");
const countSentenceEl = document.getElementById("countSentence");
const recentResultsEl = document.getElementById("recentResults");

let quizzesData = [];
let selectedType = null;
let quizState = null;
let timings = [];
let scores = [];
let startTime = 0;

function setTab(tab) {
  if (tab === "dashboard") {
    dashboardTab.classList.add("active");
    quizTab.classList.remove("active");
    dashboardSection.classList.remove("hidden");
    quizSection.classList.add("hidden");
  } else {
    quizTab.classList.add("active");
    dashboardTab.classList.remove("active");
    quizSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
  }
}

dashboardTab.addEventListener("click", () => setTab("dashboard"));
quizTab.addEventListener("click", () => setTab("quiz"));

async function loadQuizzes() {
  const res = await fetch("quizzes.json");
  quizzesData = await res.json();
}

function openSetup(type) {
  selectedType = type;
  modalTitle.textContent = type === "single" ? "Baca Kata" : "Baca Kalimat";
  modalDesc.textContent =
    type === "single"
      ? "Kamu akan membaca kata tunggal. Atur target waktu per soal. Klik di mana saja atau tombol Lanjut untuk lanjut."
      : "Kamu akan membaca kalimat tiga kata. Atur target waktu per soal. Klik di mana saja atau tombol Lanjut untuk lanjut.";
  setupModal.classList.remove("hidden");
}

function closeSetup() {
  setupModal.classList.add("hidden");
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildQuestions(type, count) {
  const entry = quizzesData.find((q) => q.name === type);
  const pool = entry ? [...entry.data] : [];
  shuffle(pool);
  const res = [];
  for (let i = 0; i < count; i++) {
    const item = pool[i % pool.length];
    res.push(item);
  }
  shuffle(res);
  return res;
}

function computeScore(elapsed, goal) {
  const ratio = Math.max(0, (goal - elapsed) / goal);
  return Math.round(ratio * 100);
}

function startQuiz() {
  const goalSeconds = Math.max(1, Number(goalSecondsInput.value || 5));
  const numQuestions = Math.max(1, Number(numQuestionsInput.value || 10));
  const questions = buildQuestions(selectedType, numQuestions);
  quizState = { type: selectedType, goalSeconds, numQuestions, questions, index: 0 };
  timings = [];
  scores = [];
  playOverlay.classList.remove("hidden");
  showQuestion();
}

function showQuestion() {
  const current = quizState.questions[quizState.index];
  questionText.textContent = current;
  progressText.textContent = `${quizState.index + 1} / ${quizState.numQuestions}`;
  startTime = performance.now();
}

function nextQuestion() {
  const elapsed = (performance.now() - startTime) / 1000;
  timings.push(elapsed);
  scores.push(computeScore(elapsed, quizState.goalSeconds));
  quizState.index += 1;
  if (quizState.index >= quizState.numQuestions) {
    finishQuiz();
  } else {
    showQuestion();
  }
}

function finishQuiz() {
  playOverlay.classList.add("hidden");
  const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
  const totalScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  resultType.textContent = quizState.type === "single" ? "Kata" : "Kalimat";
  resultQuestions.textContent = String(quizState.numQuestions);
  resultGoal.textContent = String(quizState.goalSeconds);
  resultAvg.textContent = avg.toFixed(2);
  resultScore.textContent = String(totalScore);
  perQuestionList.innerHTML = "";
  quizState.questions.forEach((q, i) => {
    const row = document.createElement("div");
    row.className = "result-item";
    row.innerHTML = `<div>${i + 1}</div><div>${q}</div><div>${timings[i].toFixed(2)} dtk</div><div>${scores[i]}</div><div>${quizState.goalSeconds} dtk</div>`;
    perQuestionList.appendChild(row);
  });
  saveResult({
    type: quizState.type,
    createdAt: Date.now(),
    goalSeconds: quizState.goalSeconds,
    numQuestions: quizState.numQuestions,
    averageTime: avg,
    score: totalScore,
    details: quizState.questions.map((q, i) => ({
      text: q,
      time: timings[i],
      score: scores[i]
    }))
  }).then(() => {
    loadDashboard();
  });
  resultModal.classList.remove("hidden");
}

quizSection.addEventListener("click", (e) => {
  const btn = e.target.closest(".menu-card");
  if (btn) {
    openSetup(btn.getAttribute("data-quiz"));
  }
});

closeModal.addEventListener("click", () => closeSetup());
startQuizBtn.addEventListener("click", () => {
  closeSetup();
  startQuiz();
});
nextBtn.addEventListener("click", () => nextQuestion());
playOverlay.addEventListener("click", (e) => {
  const isNext = e.target.closest("#nextBtn");
  if (!isNext) nextQuestion();
});
closeResult.addEventListener("click", () => {
  resultModal.classList.add("hidden");
});
goDashboard.addEventListener("click", () => {
  resultModal.classList.add("hidden");
  setTab("dashboard");
});

let db = null;
function setupDB() {
  db = new Dexie("reading_quiz_db");
  db.version(1).stores({
    results: "++id,type,createdAt,score"
  });
}

async function saveResult(result) {
  if (!db) setupDB();
  await db.results.add(result);
}

async function loadDashboard() {
  if (!db) setupDB();
  const all = await db.results.orderBy("createdAt").reverse().toArray();
  totalQuizzesEl.textContent = String(all.length);
  if (all.length === 0) {
    averageScoreEl.textContent = "0";
    bestScoreEl.textContent = "0";
    countSingleEl.textContent = "0";
    countSentenceEl.textContent = "0";
    recentResultsEl.innerHTML = "";
    return;
  }
  const avgScore = Math.round(all.reduce((a, r) => a + (r.score || 0), 0) / all.length);
  const best = Math.max(...all.map((r) => r.score || 0));
  const singleCount = all.filter((r) => r.type === "single").length;
  const sentenceCount = all.filter((r) => r.type === "sentence").length;
  averageScoreEl.textContent = String(avgScore);
  bestScoreEl.textContent = String(best);
  countSingleEl.textContent = String(singleCount);
  countSentenceEl.textContent = String(sentenceCount);
  recentResultsEl.innerHTML = "";
  all.slice(0, 10).forEach((r) => {
    const row = document.createElement("div");
    row.className = "result-item";
    row.dataset.id = r.id;
    const date = new Date(r.createdAt);
    const typeLabel = r.type === "single" ? "Kata" : "Kalimat";
    row.innerHTML = `<div>${typeLabel}</div><div>${r.score}</div><div>${r.averageTime.toFixed(2)} dtk</div><div>${r.numQuestions}</div><div>${formatDateTime(date)}</div>`;
    recentResultsEl.appendChild(row);
  });
}

function pad(n) { return n.toString().padStart(2, "0"); }
function formatDateTime(d) {
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  const DD = pad(d.getDate());
  const MM = pad(d.getMonth() + 1);
  const YYYY = d.getFullYear();
  return `${HH}:${mm}:${ss}, ${DD}-${MM}-${YYYY}`;
}

async function openStoredResultById(id) {
  if (!db) setupDB();
  const r = await db.results.get(Number(id));
  if (!r) return;
  resultType.textContent = r.type === "single" ? "Kata" : "Kalimat";
  resultQuestions.textContent = String(r.numQuestions);
  resultGoal.textContent = String(r.goalSeconds);
  resultAvg.textContent = r.averageTime.toFixed(2);
  resultScore.textContent = String(r.score);
  perQuestionList.innerHTML = "";
  (r.details || []).forEach((d, i) => {
    const row = document.createElement("div");
    row.className = "result-item";
    row.innerHTML = `<div>${i + 1}</div><div>${d.text}</div><div>${d.time.toFixed(2)} dtk</div><div>${d.score}</div><div>${r.goalSeconds} dtk</div>`;
    perQuestionList.appendChild(row);
  });
  resultModal.classList.remove("hidden");
}

recentResultsEl.addEventListener("click", (e) => {
  const item = e.target.closest(".result-item");
  if (item && item.dataset.id) {
    openStoredResultById(item.dataset.id);
  }
});
window.addEventListener("load", async () => {
  setTab("dashboard");
  await loadQuizzes();
  await loadDashboard();
});
