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
const countdownFill = document.getElementById("countdownFill");
const resultModal = document.getElementById("resultModal");
const closeResult = document.getElementById("closeResult");
const goDashboard = document.getElementById("goDashboard");
const settingsTab = document.getElementById("settingsTab");
const settingsSection = document.getElementById("settingsSection");
const settingsWords = document.getElementById("settingsWords");
const settingsSentences = document.getElementById("settingsSentences");
const saveSettings = document.getElementById("saveSettings");
const cancelSettings = document.getElementById("cancelSettings");
const resultType = document.getElementById("resultType");
const resultQuestions = document.getElementById("resultQuestions");
const resultGoal = document.getElementById("resultGoal");
const resultAvg = document.getElementById("resultAvg");
const resultScore = document.getElementById("resultScore");
const perQuestionList = document.getElementById("perQuestionList");
const resetHistoryBtn = document.getElementById("resetHistoryBtn");
const resetModal = document.getElementById("resetModal");
const closeReset = document.getElementById("closeReset");
const confirmReset = document.getElementById("confirmReset");
const cancelReset = document.getElementById("cancelReset");
const totalQuizzesEl = document.getElementById("totalQuizzes");
const averageScoreEl = document.getElementById("averageScore");
const bestScoreEl = document.getElementById("bestScore");
const countSingleEl = document.getElementById("countSingle");
const countSentenceEl = document.getElementById("countSentence");
const recentResultsEl = document.getElementById("recentResultsBody");

let quizzesData = [];
let selectedType = null;
let quizState = null;
let timings = [];
let scores5 = [];
let scoresRatio = [];
let startTime = 0;
let countdownRAF = null;
let countdownStart = 0;
let customWords = [];
let customSentences = [];

function setTab(tab) {
  dashboardTab.classList.toggle("active", tab === "dashboard");
  quizTab.classList.toggle("active", tab === "quiz");
  settingsTab.classList.toggle("active", tab === "settings");
  dashboardSection.classList.toggle("hidden", tab !== "dashboard");
  quizSection.classList.toggle("hidden", tab !== "quiz");
  settingsSection.classList.toggle("hidden", tab !== "settings");
}

dashboardTab.addEventListener("click", () => setTab("dashboard"));
quizTab.addEventListener("click", () => setTab("quiz"));
settingsTab.addEventListener("click", () => {
  setTab("settings");
  populateSettingsForm();
});

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
  if (type === "single" && customWords.length) pool.push(...customWords);
  if (type === "sentence" && customSentences.length) pool.push(...customSentences);
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

function bucketScore(elapsed, goal) {
  const p = 1 - (elapsed / goal);
  if (p >= 0.8) return 5;
  if (p >= 0.6) return 4;
  if (p >= 0.3) return 3;
  if (p >= 0.15) return 2;
  
  return 1;
}

function startQuiz() {
  const goalSeconds = Math.max(1, Number(goalSecondsInput.value || 5));
  const numQuestions = Math.max(1, Number(numQuestionsInput.value || 10));
  const questions = buildQuestions(selectedType, numQuestions);
  quizState = { type: selectedType, goalSeconds, numQuestions, questions, index: 0 };
  timings = [];
  scores5 = [];
  scoresRatio = [];
  playOverlay.classList.remove("hidden");
  showQuestion();
}

function showQuestion() {
  const current = quizState.questions[quizState.index];
  questionText.textContent = current;
  progressText.textContent = `${quizState.index + 1} / ${quizState.numQuestions}`;
  startTime = performance.now();
  startCountdown(quizState.goalSeconds);
}

function nextQuestion() {
  cancelCountdown();
  const elapsed = (performance.now() - startTime) / 1000;
  timings.push(elapsed);
  scoresRatio.push(computeScore(elapsed, quizState.goalSeconds));
  scores5.push(bucketScore(elapsed, quizState.goalSeconds));
  quizState.index += 1;
  if (quizState.index >= quizState.numQuestions) {
    finishQuiz();
  } else {
    showQuestion();
  }
}

function finishQuiz() {
  cancelCountdown();
  playOverlay.classList.add("hidden");
  const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
  const totalRatio = Math.round(scoresRatio.reduce((a, b) => a + b, 0) / scoresRatio.length);
  const avgScore5 = +(scores5.reduce((a, b) => a + b, 0) / scores5.length).toFixed(2);
  resultType.textContent = quizState.type === "single" ? "Kata" : "Kalimat";
  resultQuestions.textContent = String(quizState.numQuestions);
  resultGoal.textContent = String(quizState.goalSeconds);
  resultAvg.textContent = avg.toFixed(2);
  resultScore.textContent = String(avgScore5);
  perQuestionList.innerHTML = "";
  quizState.questions.forEach((q, i) => {
    const row = document.createElement("div");
    row.className = "result-item";
    row.innerHTML = `<div>${i + 1}</div><div>${q}</div><div>${quizState.goalSeconds} dtk</div><div>${timings[i].toFixed(2)} dtk</div><div><span class="score-val">${scores5[i]}</span><span class="star-icon">★</span></div>`;
    perQuestionList.appendChild(row);
  });
  saveResult({
    type: quizState.type,
    createdAt: Date.now(),
    goalSeconds: quizState.goalSeconds,
    numQuestions: quizState.numQuestions,
    averageTime: avg,
    score: totalRatio,
    avgScore5,
    details: quizState.questions.map((q, i) => ({
      text: q,
      time: timings[i],
      score: scoresRatio[i],
      score5: scores5[i]
    }))
  }).then(() => {
    loadDashboard();
  });
  resultModal.classList.remove("hidden");
}

function startCountdown(seconds) {
  if (!countdownFill) return;
  cancelCountdown();
  countdownStart = performance.now();
  countdownFill.style.transformOrigin = "left";
  countdownFill.style.transform = "scaleX(1)";
  const duration = seconds * 1000;
  const tick = () => {
    const t = performance.now() - countdownStart;
    const pct = Math.max(0, 1 - t / duration);
    countdownFill.style.transform = `scaleX(${pct})`;
    if (t < duration) {
      countdownRAF = requestAnimationFrame(tick);
    } else {
      cancelCountdown();
    }
  };
  countdownRAF = requestAnimationFrame(tick);
}

function cancelCountdown() {
  if (countdownRAF) {
    cancelAnimationFrame(countdownRAF);
    countdownRAF = null;
  }
  if (countdownFill) {
    countdownFill.style.transform = "scaleX(0)";
  }
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
  db.version(2).stores({
    results: "++id,type,createdAt,score",
    settings: "key"
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
    const tr = document.createElement("tr");
    tr.dataset.id = r.id;
    const date = new Date(r.createdAt);
    const typeLabel = r.type === "single" ? "Kata" : "Kalimat";
    const avg5 = r.avgScore5 ?? computeAvgScore5FromDetails(r);
    tr.innerHTML = `<td>${typeLabel}</td><td><span class="score-val">${avg5}</span><span class="star-icon">★</span></td><td>${r.averageTime.toFixed(2)} dtk</td><td>${r.numQuestions}</td><td>${dayjs(date).format("dddd, DD MMMM YYYY")}</td>`;
    recentResultsEl.appendChild(tr);
  });
}


async function openStoredResultById(id) {
  if (!db) setupDB();
  const r = await db.results.get(Number(id));
  if (!r) return;
  resultType.textContent = r.type === "single" ? "Kata" : "Kalimat";
  resultQuestions.textContent = String(r.numQuestions);
  resultGoal.textContent = String(r.goalSeconds);
  resultAvg.textContent = r.averageTime.toFixed(2);
  const avg5 = r.avgScore5 ?? computeAvgScore5FromDetails(r);
  resultScore.textContent = String(avg5);
  perQuestionList.innerHTML = "";
  (r.details || []).forEach((d, i) => {
    const row = document.createElement("div");
    row.className = "result-item";
    const s5 = d.score5 ?? bucketScore(d.time, r.goalSeconds);
    row.innerHTML = `<div>${i + 1}</div><div>${d.text}</div><div>${r.goalSeconds} dtk</div><div>${d.time.toFixed(2)} dtk</div><div><span class="score-val">${s5}</span><span class="star-icon">★</span></div>`;
    perQuestionList.appendChild(row);
  });
  resultModal.classList.remove("hidden");
}

recentResultsEl.addEventListener("click", (e) => {
  const item = e.target.closest("tr");
  if (item && item.dataset.id) {
    openStoredResultById(item.dataset.id);
  }
});

function computeAvgScore5FromDetails(r) {
  const d = r.details || [];
  if (!d.length) return 0;
  const sum = d.reduce((a, x) => {
    const val = typeof x.score5 === "number" ? x.score5 : bucketScore(x.time, r.goalSeconds);
    return a + val;
  }, 0);
  return +(sum / d.length).toFixed(2);
}
async function resetHistory() {
  try {
    if (!db) setupDB();
    await db.open();
    await db.results.clear();
  } catch (e) {
    console.error("Reset failed", e);
  } finally {
    resetModal.classList.add("hidden");
    await loadDashboard();
  }
}
async function loadSettings() {
  if (!db) setupDB();
  const s = await db.table("settings").get("custom");
  customWords = s && Array.isArray(s.words) ? s.words : [];
  customSentences = s && Array.isArray(s.sentences) ? s.sentences : [];
}
function populateSettingsForm() {
  settingsWords.value = (customWords || []).join(", ");
  settingsSentences.value = (customSentences || []).join(", ");
}
function parseCommaList(text) {
  return text.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
}
saveSettings.addEventListener("click", async () => {
  const words = parseCommaList(settingsWords.value || "");
  const sentences = parseCommaList(settingsSentences.value || "");
  if (!db) setupDB();
  await db.table("settings").put({ key: "custom", words, sentences, updatedAt: Date.now() });
  customWords = words;
  customSentences = sentences;
  setTab("dashboard");
  await loadDashboard();
});
cancelSettings.addEventListener("click", () => {
  populateSettingsForm();
  setTab("dashboard");
});
window.addEventListener("load", async () => {
  setTab("dashboard");
  await loadQuizzes();
  await loadSettings();
  await loadDashboard();
});
if (resetHistoryBtn) {
  resetHistoryBtn.addEventListener("click", () => {
    resetModal.classList.remove("hidden");
  });
}
closeReset.addEventListener("click", () => {
  resetModal.classList.add("hidden");
});
cancelReset.addEventListener("click", () => {
  resetModal.classList.add("hidden");
});
confirmReset.addEventListener("click", async () => {
  await resetHistory();
});
