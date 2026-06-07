// frontend/js/app.js
import { BrainManager, CloudExhaustedError } from './ai/BrainManager.js';
import { ScheduleEngine } from './engine/scheduler.js';

const consoleLog = document.getElementById('status-console');
const outputArea = document.getElementById('output-area');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const syllabusInput = document.getElementById('syllabus-input');
const daysInput = document.getElementById('days-input');
const crunchBtn = document.getElementById('crunch-btn');

const fallbackPanel = document.getElementById('fallback-panel');
const fallbackLocalBtn = document.getElementById('fallback-local-btn');
const fallbackKeyBtn = document.getElementById('fallback-key-btn');
const fallbackCancelBtn = document.getElementById('fallback-cancel-btn');

const keyEntryForm = document.getElementById('key-entry-form');
const keyProviderSelect = document.getElementById('key-provider-select');
const keyValueInput = document.getElementById('key-value-input');
const keySubmitBtn = document.getElementById('key-submit-btn');
const keyBackBtn = document.getElementById('key-back-btn');
const keyEntryError = document.getElementById('key-entry-error');

let brain = null;
let pendingText = '';
let pendingDays = 0;
let pendingProgressCallback = null;

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

function showFallback() {
  if (fallbackPanel) fallbackPanel.style.display = 'block';
  if (keyEntryForm) keyEntryForm.style.display = 'none';
  if (keyEntryError) keyEntryError.textContent = '';
  if (keyValueInput) keyValueInput.value = '';
}

function hideFallback() {
  if (fallbackPanel) fallbackPanel.style.display = 'none';
  if (keyEntryForm) keyEntryForm.style.display = 'none';
  if (keyEntryError) keyEntryError.textContent = '';
}

function showKeyForm() {
  if (keyEntryForm) keyEntryForm.style.display = 'block';
  if (keyEntryError) keyEntryError.textContent = '';
  if (keyValueInput) keyValueInput.value = '';
}

function hideKeyForm() {
  if (keyEntryForm) keyEntryForm.style.display = 'none';
}

async function renderPlan(extractedData) {
  extractedData.total_days = pendingDays;

  updateConsole("Validating extracted data contract...");
  validateSyllabusData(extractedData);

  setProgress(95);
  updateConsole("Running deterministic schedule crunch engine...");

  const engine = new ScheduleEngine(extractedData);
  const compiledPlan = engine.crunch();

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
}

function finishPipeline(err) {
  updateConsole(`Error: ${err.message}`);
  setProgress(100, "#ef4444");
  console.error("Pipeline error:", err);
}

function resetCrunchBtn() {
  if (crunchBtn) {
    crunchBtn.disabled = false;
    crunchBtn.textContent = "Initialize & Crunch Plan";
  }
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

  hideFallback();

  if (outputArea) outputArea.style.display = "none";
  consoleLog.innerText = "> Starting Exam Cruncher pipeline...";
  if (progressContainer && progressBar) {
    progressContainer.style.display = "block";
    setProgress(5, "var(--accent-color)");
  }
  crunchBtn.disabled = true;
  crunchBtn.textContent = "Crunching...";

  brain = new BrainManager(updateConsole);
  pendingText = rawText;
  pendingDays = days;
  pendingProgressCallback = (progressDecimal) => {
    const pct = Math.round(5 + progressDecimal * 90);
    setProgress(pct);
  };

  try {
    const extractedData = await brain.getSyllabusData(rawText, days, pendingProgressCallback);
    await renderPlan(extractedData);
  } catch (err) {
    if (err instanceof CloudExhaustedError) {
      updateConsole("Cloud providers exhausted. Choose a fallback option below.");
      showFallback();
      return; // Don't reset button yet — user may choose fallback
    }
    finishPipeline(err);
  } finally {
    // Only reset if we're done (not showing fallback)
    if (!fallbackPanel || fallbackPanel.style.display === 'none') {
      resetCrunchBtn();
    }
  }
}

async function handleLocalFallback() {
  hideFallback();
  updateConsole("Starting local engine fallback...");
  try {
    const extractedData = await brain.runLocalEngine(pendingText, pendingDays, pendingProgressCallback);
    await renderPlan(extractedData);
  } catch (err) {
    finishPipeline(err);
  } finally {
    resetCrunchBtn();
  }
}

async function handleKeyFallback() {
  showKeyForm();
}

async function handleKeySubmit() {
  const provider = keyProviderSelect ? keyProviderSelect.value : 'groq';
  const apiKey = keyValueInput ? keyValueInput.value.trim() : '';

  if (!apiKey) {
    if (keyEntryError) keyEntryError.textContent = "Please enter an API key.";
    return;
  }

  if (keyEntryError) keyEntryError.textContent = "";
  if (keySubmitBtn) {
    keySubmitBtn.disabled = true;
    keySubmitBtn.textContent = "Running...";
  }

  try {
    const extractedData = await brain.runWithUserKey(pendingText, pendingDays, provider, apiKey);
    hideFallback();
    await renderPlan(extractedData);
  } catch (err) {
    if (keyEntryError) keyEntryError.textContent = err.message;
    return;
  } finally {
    if (keySubmitBtn) {
      keySubmitBtn.disabled = false;
      keySubmitBtn.textContent = "Run with My Key";
    }
  }

  resetCrunchBtn();
}

function handleKeyBack() {
  hideKeyForm();
}

function handleCancel() {
  hideFallback();
  updateConsole("Analysis halted by user.");
  setProgress(0);
  resetCrunchBtn();
}

document.addEventListener("DOMContentLoaded", () => {
  if (crunchBtn) crunchBtn.addEventListener("click", startCrunchPipeline);
  if (fallbackLocalBtn) fallbackLocalBtn.addEventListener("click", handleLocalFallback);
  if (fallbackKeyBtn) fallbackKeyBtn.addEventListener("click", handleKeyFallback);
  if (fallbackCancelBtn) fallbackCancelBtn.addEventListener("click", handleCancel);
  if (keySubmitBtn) keySubmitBtn.addEventListener("click", handleKeySubmit);
  if (keyBackBtn) keyBackBtn.addEventListener("click", handleKeyBack);
});
