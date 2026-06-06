// frontend/js/app.js
import { BrainManager } from './ai/BrainManager.js';
import { ScheduleEngine } from './engine/scheduler.js';
import { signUp, signIn, signOut, onAuthChange } from './lib/auth.js';
import { savePlan, loadPlans, loadPlanById, deletePlan, loadProgress, toggleDayComplete } from './lib/plans.js';

const consoleLog = document.getElementById('status-console');
const outputArea = document.getElementById('output-area');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const syllabusInput = document.getElementById('syllabus-input');
const daysInput = document.getElementById('days-input');
const groqKeyInput = document.getElementById('groq-key-input');
const geminiKeyInput = document.getElementById('gemini-key-input');
const crunchBtn = document.getElementById('crunch-btn');

const authSection = document.getElementById('auth-section');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authError = document.getElementById('auth-error');
const userInfo = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const signOutBtn = document.getElementById('sign-out-btn');

const historySection = document.getElementById('history-section');
const historyList = document.getElementById('history-list');

const planProgressSection = document.getElementById('plan-progress-section');
const planProgressTitle = document.getElementById('plan-progress-title');
const planProgressList = document.getElementById('plan-progress-list');

let currentUser = null;
let isSignUpMode = false;
let currentPlanId = null;

function updateConsole(msg) {
  if (consoleLog) {
    consoleLog.innerText += `\n> ${msg}`;
    consoleLog.scrollTop = consoleLog.scrollHeight;
  }
}

function setProgress(percent, color) {
  if (progressBar) {
    progressBar.style.width = `${percent}%`;
    if (color) progressBar.style.backgroundColor = color;
  }
}

function loadKeys() {
  const groq = groqKeyInput ? groqKeyInput.value.trim() : "";
  const gemini = geminiKeyInput ? geminiKeyInput.value.trim() : "";
  return {
    GROQ_API_KEY: groq || localStorage.getItem('groq_api_key') || "",
    GEMINI_API_KEY: gemini || localStorage.getItem('gemini_api_key') || ""
  };
}

function saveKeys(keys) {
  if (keys.GROQ_API_KEY) localStorage.setItem('groq_api_key', keys.GROQ_API_KEY);
  if (keys.GEMINI_API_KEY) localStorage.setItem('gemini_api_key', keys.GEMINI_API_KEY);
}

function validateSyllabusData(data) {
  if (!data || !data.subject_name || !Array.isArray(data.modules)) {
    throw new Error("AI returned invalid data structure. Missing subject_name or modules.");
  }
  for (const mod of data.modules) {
    if (!mod.name || !Array.isArray(mod.daily_tasks)) {
      throw new Error(`Module "${mod.name || 'unnamed'}" is missing daily_tasks.`);
    }
  }
  return true;
}

function showAuthForm(show) {
  if (!authSection) return;
  if (show) {
    authForm.style.display = 'flex';
    userInfo.style.display = 'none';
  } else {
    authForm.style.display = 'none';
    userInfo.style.display = 'flex';
    if (currentUser) userEmailSpan.textContent = currentUser.email;
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    authError.textContent = "Please fill in both fields.";
    return;
  }
  if (password.length < 6) {
    authError.textContent = "Password must be at least 6 characters.";
    return;
  }

  authError.textContent = "";
  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = isSignUpMode ? "Creating account..." : "Signing in...";

  try {
    if (isSignUpMode) {
      await signUp(email, password);
    } else {
      await signIn(email, password);
    }
    emailInput.value = "";
    passwordInput.value = "";
  } catch (err) {
    authError.textContent = err.message || "Authentication failed.";
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = isSignUpMode ? "Sign Up" : "Sign In";
  }
}

async function handleSignOut() {
  try {
    await signOut();
    currentUser = null;
    currentPlanId = null;
    if (historySection) historySection.style.display = 'none';
    if (planProgressSection) planProgressSection.style.display = 'none';
  } catch (err) {
    authError.textContent = err.message;
  }
}

async function refreshHistory() {
  if (!historyList) return;
  try {
    const plans = await loadPlans();
    historyList.innerHTML = '';

    if (plans.length === 0) {
      historyList.innerHTML = '<li class="history-empty">No saved plans yet.</li>';
      return;
    }

    for (const plan of plans) {
      const li = document.createElement('li');
      li.className = 'history-item';
      const dateStr = new Date(plan.created_at).toLocaleDateString();
      li.innerHTML = `
        <div class="history-info">
          <span class="history-subject">${plan.subject_name}</span>
          <span class="history-meta">${plan.total_days} days &middot; ${dateStr}</span>
        </div>
        <div class="history-actions">
          <button class="btn-small btn-view" data-plan-id="${plan.id}">View</button>
          <button class="btn-small btn-delete" data-plan-id="${plan.id}">Delete</button>
        </div>
      `;
      historyList.appendChild(li);
    }

    historyList.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', () => viewPlan(btn.dataset.planId));
    });
    historyList.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => removePlan(btn.dataset.planId));
    });
  } catch (err) {
    updateConsole(`Failed to load history: ${err.message}`);
  }
}

async function viewPlan(planId) {
  try {
    const plan = await loadPlanById(planId);
    const progress = await loadProgress(planId);
    currentPlanId = planId;

    const engine = new ScheduleEngine(plan.structured_data);
    const compiledPlan = engine.crunch();

    if (outputArea) {
      outputArea.style.display = 'block';
      outputArea.innerText = compiledPlan;
    }

    renderProgress(plan.structured_data, progress);
    updateConsole(`Loaded plan: ${plan.subject_name}`);
  } catch (err) {
    updateConsole(`Failed to load plan: ${err.message}`);
  }
}

async function removePlan(planId) {
  if (!confirm("Delete this plan? This cannot be undone.")) return;
  try {
    await deletePlan(planId);
    if (currentPlanId === planId) {
      currentPlanId = null;
      if (outputArea) outputArea.style.display = 'none';
      if (planProgressSection) planProgressSection.style.display = 'none';
    }
    await refreshHistory();
    updateConsole("Plan deleted.");
  } catch (err) {
    updateConsole(`Failed to delete: ${err.message}`);
  }
}

function renderProgress(syllabusData, progressRows) {
  if (!planProgressSection || !planProgressList || !planProgressTitle) return;

  const progressMap = {};
  for (const row of progressRows) {
    progressMap[row.day_number] = row.completed;
  }

  planProgressTitle.textContent = `Progress: ${syllabusData.subject_name}`;
  planProgressList.innerHTML = '';

  const totalDays = syllabusData.total_days;
  const completedCount = Object.values(progressMap).filter(Boolean).length;
  const pct = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;

  const summary = document.createElement('div');
  summary.className = 'progress-summary';
  summary.textContent = `${completedCount}/${totalDays} days completed (${pct}%)`;
  planProgressList.appendChild(summary);

  for (const mod of syllabusData.modules) {
    for (const task of mod.daily_tasks) {
      const isDone = progressMap[task.day] || false;
      const row = document.createElement('div');
      row.className = `progress-day ${isDone ? 'completed' : ''}`;
      row.innerHTML = `
        <label class="progress-day-label">
          <input type="checkbox" ${isDone ? 'checked' : ''} data-day="${task.day}">
          Day ${task.day}: ${task.topics.map(t => t.name).join(', ')}
        </label>
      `;
      const checkbox = row.querySelector('input');
      checkbox.addEventListener('change', async (e) => {
        try {
          await toggleDayComplete(currentPlanId, task.day, e.target.checked);
          if (e.target.checked) {
            row.classList.add('completed');
          } else {
            row.classList.remove('completed');
          }
          refreshProgressSummary(syllabusData);
        } catch (err) {
          e.target.checked = !e.target.checked;
          updateConsole(`Failed to update progress: ${err.message}`);
        }
      });
      planProgressList.appendChild(row);
    }
  }

  planProgressSection.style.display = 'block';
}

function refreshProgressSummary(syllabusData) {
  if (!planProgressList) return;
  const checkboxes = planProgressList.querySelectorAll('input[type="checkbox"]');
  const completed = [...checkboxes].filter(cb => cb.checked).length;
  const total = syllabusData.total_days;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const summary = planProgressList.querySelector('.progress-summary');
  if (summary) summary.textContent = `${completed}/${total} days completed (${pct}%)`;
}

async function startCrunchPipeline() {
  const rawText = syllabusInput ? syllabusInput.value.trim() : "";
  const days = daysInput ? parseInt(daysInput.value, 10) : 0;

  if (!rawText) {
    alert("Please paste your raw syllabus text before running.");
    return;
  }
  if (isNaN(days) || days <= 0) {
    alert("Please enter a valid number of days.");
    return;
  }

  const keys = loadKeys();
  if (!keys.GROQ_API_KEY && !keys.GEMINI_API_KEY) {
    alert("Please enter at least one API key (Groq or Gemini) in the settings panel.");
    return;
  }
  saveKeys(keys);

  if (outputArea) outputArea.style.display = "none";
  if (planProgressSection) planProgressSection.style.display = "none";
  consoleLog.innerText = "> Starting Exam Cruncher pipeline...";
  if (progressContainer && progressBar) {
    progressContainer.style.display = "block";
    setProgress(5, "var(--accent-color)");
  }
  crunchBtn.disabled = true;
  crunchBtn.textContent = "Crunching...";

  try {
    const brain = new BrainManager(keys, updateConsole);
    updateConsole("Routing through AI extraction tier...");

    const extractedData = await brain.getSyllabusData(rawText, days, (progressDecimal) => {
      const pct = Math.round(5 + progressDecimal * 90);
      setProgress(pct);
    });

    updateConsole("Validating extracted data contract...");
    validateSyllabusData(extractedData);
    extractedData.total_days = days;

    setProgress(95);
    updateConsole("Running deterministic schedule crunch engine...");

    const engine = new ScheduleEngine(extractedData);
    const compiledPlan = engine.crunch();

    if (currentUser) {
      updateConsole("Saving plan to your account...");
      try {
        currentPlanId = await savePlan(extractedData.subject_name, days, rawText, extractedData);
        updateConsole("Plan saved.");
        await refreshHistory();
        renderProgress(extractedData, []);
      } catch (saveErr) {
        updateConsole(`Save failed: ${saveErr.message}`);
      }
    }

    setProgress(100);
    setTimeout(() => {
      if (progressContainer) progressContainer.style.display = "none";
    }, 800);

    if (outputArea) {
      outputArea.style.display = "block";
      outputArea.innerText = compiledPlan;
      outputArea.scrollTop = 0;
    }
    updateConsole("Schedule generated successfully.");

  } catch (err) {
    updateConsole(`Error: ${err.message}`);
    setProgress(100, "#ef4444");
    console.error("Pipeline error:", err);
  } finally {
    crunchBtn.disabled = false;
    crunchBtn.textContent = "Initialize & Crunch Plan";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (crunchBtn) crunchBtn.addEventListener("click", startCrunchPipeline);

  const savedGroq = localStorage.getItem('groq_api_key');
  const savedGemini = localStorage.getItem('gemini_api_key');
  if (groqKeyInput && savedGroq) groqKeyInput.value = savedGroq;
  if (geminiKeyInput && savedGemini) geminiKeyInput.value = savedGemini;

  const toggle = document.getElementById('settings-toggle');
  const panel = document.getElementById('settings-panel');
  if (toggle && panel) {
    toggle.addEventListener('click', () => {
      const isOpen = panel.style.display !== 'none';
      panel.style.display = isOpen ? 'none' : 'block';
      toggle.textContent = isOpen ? 'API Settings' : 'Hide Settings';
    });
  }

  if (authForm) authForm.addEventListener("submit", handleAuthSubmit);
  if (authToggleBtn) {
    authToggleBtn.addEventListener("click", () => {
      isSignUpMode = !isSignUpMode;
      authSubmitBtn.textContent = isSignUpMode ? "Sign Up" : "Sign In";
      authToggleBtn.textContent = isSignUpMode ? "Already have an account? Sign In" : "Need an account? Sign Up";
    });
  }
  if (signOutBtn) signOutBtn.addEventListener("click", handleSignOut);

  onAuthChange((user) => {
    currentUser = user;
    if (user) {
      showAuthForm(false);
      if (historySection) {
        historySection.style.display = 'block';
        refreshHistory();
      }
    } else {
      showAuthForm(true);
      if (historySection) historySection.style.display = 'none';
      if (planProgressSection) planProgressSection.style.display = 'none';
      currentPlanId = null;
    }
  });
});
